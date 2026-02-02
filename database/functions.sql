-- =========================================================================
-- WMSCPP - Database Functions (RPC/Stored Procedures)
-- =========================================================================
--
-- RPCs called from app (see src/lib/constants.ts RPC):
--   process_inbound_transaction, process_inbound_batch, deduct_stock,
--   transfer_stock, transfer_cross_stock, create_warehouse_xyz_grid,
--   get_next_schema_version, process_audit_adjustment
--
-- DB-only: handle_new_user (trigger on auth.users), update_updated_at_column (triggers)
-- =========================================================================

-- =========================================================================
-- 1. INBOUND TRANSACTION PROCESSING
-- =========================================================================

CREATE OR REPLACE FUNCTION process_inbound_transaction(
    p_product_id UUID,
    p_location_id UUID,
    p_quantity NUMERIC,
    p_attributes JSONB DEFAULT '{}',
    p_warehouse_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_stock_id UUID;
    v_current_qty NUMERIC;
    v_new_qty NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- Check if stock already exists at this location
    SELECT id, quantity INTO v_stock_id, v_current_qty
    FROM stocks
    WHERE product_id = p_product_id AND location_id = p_location_id;

    IF v_stock_id IS NOT NULL THEN
        -- Update existing stock
        v_new_qty := v_current_qty + p_quantity;
        UPDATE stocks
        SET quantity = v_new_qty,
            attributes = COALESCE(stocks.attributes, '{}') || p_attributes,
            updated_at = NOW()
        WHERE id = v_stock_id;
    ELSE
        -- Create new stock record
        v_new_qty := p_quantity;
        INSERT INTO stocks (product_id, location_id, quantity, attributes)
        VALUES (p_product_id, p_location_id, p_quantity, p_attributes)
        RETURNING id INTO v_stock_id;
    END IF;

    -- Log the transaction
    INSERT INTO transactions (
        warehouse_id, type, to_location, product_id, quantity,
        user_id, user_email, status, details, attributes
    )
    VALUES (
        p_warehouse_id, 'INBOUND', p_location_id, p_product_id, p_quantity,
        p_user_id, p_user_email, 'SUCCESS',
        'Inbound: +' || p_quantity || ' units',
        p_attributes
    )
    RETURNING id INTO v_transaction_id;

    RETURN jsonb_build_object(
        'success', true,
        'stock_id', v_stock_id,
        'new_quantity', v_new_qty,
        'transaction_id', v_transaction_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 2. BATCH INBOUND PROCESSING
-- =========================================================================

CREATE OR REPLACE FUNCTION process_inbound_batch(
    p_transactions JSONB,
    p_warehouse_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_results JSONB := '[]'::JSONB;
    v_result JSONB;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_transactions)
    LOOP
        v_result := process_inbound_transaction(
            (v_item->>'product_id')::UUID,
            (v_item->>'location_id')::UUID,
            (v_item->>'quantity')::NUMERIC,
            COALESCE(v_item->'attributes', '{}'),
            p_warehouse_id,
            p_user_id,
            p_user_email
        );

        v_results := v_results || jsonb_build_array(v_result);

        IF (v_result->>'success')::BOOLEAN THEN
            v_success_count := v_success_count + 1;
        ELSE
            v_error_count := v_error_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', v_error_count = 0,
        'total', jsonb_array_length(p_transactions),
        'success_count', v_success_count,
        'error_count', v_error_count,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 3. STOCK DEDUCTION (OUTBOUND)
-- =========================================================================

CREATE OR REPLACE FUNCTION deduct_stock(
    p_stock_id UUID,
    p_deduct_qty NUMERIC,
    p_note TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_qty NUMERIC;
    v_new_qty NUMERIC;
    v_product_id UUID;
    v_location_id UUID;
    v_warehouse_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Get current stock info
    SELECT s.quantity, s.product_id, s.location_id, l.warehouse_id
    INTO v_current_qty, v_product_id, v_location_id, v_warehouse_id
    FROM stocks s
    JOIN locations l ON l.id = s.location_id
    WHERE s.id = p_stock_id;

    IF v_current_qty IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stock not found'
        );
    END IF;

    IF v_current_qty < p_deduct_qty THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient stock. Available: ' || v_current_qty
        );
    END IF;

    -- Update stock
    v_new_qty := v_current_qty - p_deduct_qty;

    IF v_new_qty = 0 THEN
        DELETE FROM stocks WHERE id = p_stock_id;
    ELSE
        UPDATE stocks SET quantity = v_new_qty, updated_at = NOW() WHERE id = p_stock_id;
    END IF;

    -- Log the transaction
    INSERT INTO transactions (
        warehouse_id, type, from_location, product_id, quantity,
        user_id, user_email, status, details
    )
    VALUES (
        v_warehouse_id, 'OUTBOUND', v_location_id, v_product_id, p_deduct_qty,
        p_user_id, p_user_email, 'SUCCESS',
        COALESCE(p_note, 'Outbound: -' || p_deduct_qty || ' units')
    )
    RETURNING id INTO v_transaction_id;

    RETURN jsonb_build_object(
        'success', true,
        'previous_quantity', v_current_qty,
        'deducted', p_deduct_qty,
        'new_quantity', v_new_qty,
        'transaction_id', v_transaction_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. STOCK TRANSFER (WITHIN SAME WAREHOUSE)
-- =========================================================================

CREATE OR REPLACE FUNCTION transfer_stock(
    p_from_location_id UUID,
    p_to_location_id UUID,
    p_product_id UUID,
    p_quantity NUMERIC,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_from_stock_id UUID;
    v_to_stock_id UUID;
    v_from_qty NUMERIC;
    v_to_qty NUMERIC;
    v_warehouse_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Get source stock
    SELECT id, quantity INTO v_from_stock_id, v_from_qty
    FROM stocks
    WHERE product_id = p_product_id AND location_id = p_from_location_id;

    IF v_from_stock_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source stock not found');
    END IF;

    IF v_from_qty < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock at source');
    END IF;

    -- Get warehouse_id
    SELECT warehouse_id INTO v_warehouse_id FROM locations WHERE id = p_from_location_id;

    -- Deduct from source
    IF v_from_qty = p_quantity THEN
        DELETE FROM stocks WHERE id = v_from_stock_id;
    ELSE
        UPDATE stocks SET quantity = v_from_qty - p_quantity, updated_at = NOW() WHERE id = v_from_stock_id;
    END IF;

    -- Add to destination
    SELECT id, quantity INTO v_to_stock_id, v_to_qty
    FROM stocks
    WHERE product_id = p_product_id AND location_id = p_to_location_id;

    IF v_to_stock_id IS NOT NULL THEN
        UPDATE stocks SET quantity = v_to_qty + p_quantity, updated_at = NOW() WHERE id = v_to_stock_id;
    ELSE
        INSERT INTO stocks (product_id, location_id, quantity)
        VALUES (p_product_id, p_to_location_id, p_quantity);
    END IF;

    -- Log transfer transaction
    INSERT INTO transactions (
        warehouse_id, type, from_location, to_location, product_id, quantity,
        user_id, user_email, status, details
    )
    VALUES (
        v_warehouse_id, 'TRANSFER', p_from_location_id, p_to_location_id, p_product_id, p_quantity,
        p_user_id, p_user_email, 'SUCCESS',
        'Transfer: ' || p_quantity || ' units'
    )
    RETURNING id INTO v_transaction_id;

    RETURN jsonb_build_object(
        'success', true,
        'quantity_transferred', p_quantity,
        'transaction_id', v_transaction_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 5. CROSS-WAREHOUSE TRANSFER
-- =========================================================================

CREATE OR REPLACE FUNCTION transfer_cross_stock(
    p_from_location_id UUID,
    p_to_location_id UUID,
    p_product_id UUID,
    p_quantity NUMERIC,
    p_warehouse_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_from_stock_id UUID;
    v_to_stock_id UUID;
    v_from_qty NUMERIC;
    v_to_qty NUMERIC;
    v_from_warehouse_id UUID;
    v_to_warehouse_id UUID;
BEGIN
    -- Get source stock and warehouse
    SELECT s.id, s.quantity, l.warehouse_id
    INTO v_from_stock_id, v_from_qty, v_from_warehouse_id
    FROM stocks s
    JOIN locations l ON l.id = s.location_id
    WHERE s.product_id = p_product_id AND s.location_id = p_from_location_id;

    -- Get destination warehouse
    SELECT warehouse_id INTO v_to_warehouse_id FROM locations WHERE id = p_to_location_id;

    IF v_from_stock_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source stock not found');
    END IF;

    IF v_from_qty < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock at source');
    END IF;

    -- Deduct from source
    IF v_from_qty = p_quantity THEN
        DELETE FROM stocks WHERE id = v_from_stock_id;
    ELSE
        UPDATE stocks SET quantity = v_from_qty - p_quantity, updated_at = NOW() WHERE id = v_from_stock_id;
    END IF;

    -- Add to destination
    SELECT id, quantity INTO v_to_stock_id, v_to_qty
    FROM stocks
    WHERE product_id = p_product_id AND location_id = p_to_location_id;

    IF v_to_stock_id IS NOT NULL THEN
        UPDATE stocks SET quantity = v_to_qty + p_quantity, updated_at = NOW() WHERE id = v_to_stock_id;
    ELSE
        INSERT INTO stocks (product_id, location_id, quantity)
        VALUES (p_product_id, p_to_location_id, p_quantity);
    END IF;

    -- Log outbound from source warehouse
    INSERT INTO transactions (
        warehouse_id, type, from_location, product_id, quantity,
        user_id, user_email, status, details
    )
    VALUES (
        v_from_warehouse_id, 'TRANSFER_OUT', p_from_location_id, p_product_id, p_quantity,
        p_user_id, p_user_email, 'SUCCESS',
        'Cross-warehouse transfer OUT to warehouse'
    );

    -- Log inbound to destination warehouse
    INSERT INTO transactions (
        warehouse_id, type, to_location, product_id, quantity,
        user_id, user_email, status, details
    )
    VALUES (
        v_to_warehouse_id, 'TRANSFER', p_to_location_id, p_product_id, p_quantity,
        p_user_id, p_user_email, 'SUCCESS',
        'Cross-warehouse transfer IN from warehouse'
    );

    RETURN jsonb_build_object(
        'success', true,
        'quantity_transferred', p_quantity,
        'from_warehouse', v_from_warehouse_id,
        'to_warehouse', v_to_warehouse_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 6. AUDIT ADJUSTMENT PROCESSING
-- =========================================================================

CREATE OR REPLACE FUNCTION process_audit_adjustment(
    p_session_id UUID,
    p_diff_items JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_location_id UUID;
    v_diff_qty NUMERIC;
    v_stock_id UUID;
    v_current_qty NUMERIC;
    v_warehouse_id UUID;
    v_adjustments INTEGER := 0;
BEGIN
    -- Get warehouse from session
    SELECT warehouse_id INTO v_warehouse_id FROM audit_sessions WHERE id = p_session_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_diff_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_location_id := (v_item->>'location_id')::UUID;
        v_diff_qty := (v_item->>'diff_qty')::NUMERIC;

        IF v_diff_qty != 0 THEN
            -- Get current stock
            SELECT id, quantity INTO v_stock_id, v_current_qty
            FROM stocks
            WHERE product_id = v_product_id AND location_id = v_location_id;

            IF v_stock_id IS NOT NULL THEN
                -- Update existing stock
                UPDATE stocks
                SET quantity = GREATEST(0, v_current_qty + v_diff_qty),
                    updated_at = NOW()
                WHERE id = v_stock_id;
            ELSIF v_diff_qty > 0 THEN
                -- Create new stock if positive adjustment
                INSERT INTO stocks (product_id, location_id, quantity)
                VALUES (v_product_id, v_location_id, v_diff_qty);
            END IF;

            -- Log audit adjustment
            INSERT INTO transactions (
                warehouse_id, type, to_location, product_id, quantity,
                status, details
            )
            VALUES (
                v_warehouse_id, 'AUDIT', v_location_id, v_product_id, v_diff_qty,
                'SUCCESS', 'Audit adjustment: ' || v_diff_qty
            );

            v_adjustments := v_adjustments + 1;
        END IF;
    END LOOP;

    -- Mark session as completed
    UPDATE audit_sessions
    SET status = 'COMPLETED', finalized_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'adjustments_made', v_adjustments
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 7. WAREHOUSE GRID CREATION
-- =========================================================================

CREATE OR REPLACE FUNCTION create_warehouse_xyz_grid(
    p_warehouse_id UUID,
    p_axis_x INTEGER,
    p_axis_y INTEGER,
    p_axis_z INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_x INTEGER;
    v_y INTEGER;
    v_z INTEGER;
    v_lot TEXT;
    v_cart TEXT;
    v_level TEXT;
    v_code TEXT;
    v_count INTEGER := 0;
BEGIN
    -- Update warehouse dimensions
    UPDATE warehouses
    SET axis_x = p_axis_x, axis_y = p_axis_y, axis_z = p_axis_z, updated_at = NOW()
    WHERE id = p_warehouse_id;

    -- Generate locations
    FOR v_x IN 1..p_axis_x LOOP
        v_lot := 'LOT-' || LPAD(v_x::TEXT, 2, '0');

        FOR v_y IN 1..p_axis_y LOOP
            v_cart := 'CART-' || LPAD(v_y::TEXT, 2, '0');

            FOR v_z IN 1..p_axis_z LOOP
                v_level := 'LVL-' || LPAD(v_z::TEXT, 2, '0');
                v_code := v_lot || '-' || v_cart || '-' || v_level;

                INSERT INTO locations (warehouse_id, code, lot, cart, level)
                VALUES (p_warehouse_id, v_code, v_lot, v_cart, v_level)
                ON CONFLICT (warehouse_id, code) DO NOTHING;

                v_count := v_count + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'locations_created', v_count,
        'dimensions', jsonb_build_object('x', p_axis_x, 'y', p_axis_y, 'z', p_axis_z)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 8. SCHEMA VERSION HELPER
-- =========================================================================

CREATE OR REPLACE FUNCTION get_next_schema_version(p_category_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_current_version
    FROM category_schema_versions
    WHERE category_id = p_category_id;

    RETURN v_current_version;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 9. AUTO-CREATE PROFILE ON USER SIGNUP
-- =========================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile (email synced from auth.users for audit/traceability)
    INSERT INTO profiles (id, first_name, last_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.email, '')
    );

    -- Create user role (default staff)
    INSERT INTO user_roles (user_id, role, is_active)
    VALUES (NEW.id, 'staff', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================================================
-- 9b. RLS HELPER FUNCTIONS (SECURITY DEFINER to avoid recursion in user_roles policies)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'); $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')); $$;

-- =========================================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partial_status_removals ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_notes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User roles policies (admin only for modifications)
CREATE POLICY "Anyone can view user roles" ON user_roles FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage user roles" ON user_roles FOR ALL USING (public.is_admin());

-- Warehouses policies
CREATE POLICY "Anyone can view active warehouses" ON warehouses FOR SELECT USING (TRUE);
CREATE POLICY "Admin/Manager can manage warehouses" ON warehouses FOR ALL USING (public.is_admin_or_manager());

-- Locations policies
CREATE POLICY "Anyone can view locations" ON locations FOR SELECT USING (TRUE);
CREATE POLICY "Admin/Manager can manage locations" ON locations FOR ALL USING (public.is_admin_or_manager());

-- Products policies
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (TRUE);
CREATE POLICY "Admin/Manager can manage products" ON products FOR ALL USING (public.is_admin_or_manager());

-- Product categories policies
CREATE POLICY "Anyone can view categories" ON product_categories FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage categories" ON product_categories FOR ALL USING (public.is_admin());

-- Category schema versions policies
CREATE POLICY "Anyone can view schema versions" ON category_schema_versions FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage schema versions" ON category_schema_versions FOR ALL USING (public.is_admin());

-- Stocks policies
CREATE POLICY "Anyone can view stocks" ON stocks FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage stocks" ON stocks FOR ALL USING (auth.uid() IS NOT NULL);

-- Transactions policies
CREATE POLICY "Anyone can view transactions" ON transactions FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Audit sessions policies
CREATE POLICY "Anyone can view audit sessions" ON audit_sessions FOR SELECT USING (TRUE);
CREATE POLICY "Admin/Manager can manage audit sessions" ON audit_sessions FOR ALL USING (public.is_admin_or_manager());

-- Audit items policies
CREATE POLICY "Anyone can view audit items" ON audit_items FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage audit items" ON audit_items FOR ALL USING (auth.uid() IS NOT NULL);

-- Status definitions policies
CREATE POLICY "Anyone can view status definitions" ON status_definitions FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage status definitions" ON status_definitions FOR ALL USING (public.is_admin());

-- Entity statuses policies
CREATE POLICY "Anyone can view entity statuses" ON entity_statuses FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage entity statuses" ON entity_statuses FOR ALL USING (auth.uid() IS NOT NULL);

-- Lot statuses policies
CREATE POLICY "Anyone can view lot statuses" ON lot_statuses FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage lot statuses" ON lot_statuses FOR ALL USING (auth.uid() IS NOT NULL);

-- Status change logs policies
CREATE POLICY "Anyone can view status change logs" ON status_change_logs FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create status change logs" ON status_change_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Partial status removals policies
CREATE POLICY "Anyone can view partial status removals" ON partial_status_removals FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage partial status removals" ON partial_status_removals FOR ALL USING (auth.uid() IS NOT NULL);

-- Entity notes policies
CREATE POLICY "Anyone can view entity notes" ON entity_notes FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can manage entity notes" ON entity_notes FOR ALL USING (auth.uid() IS NOT NULL);
