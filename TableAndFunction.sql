
//tables
{create table public.audit_items (
  id uuid not null default gen_random_uuid (),
  session_id uuid not null,
  product_id uuid not null,
  location_id uuid not null,
  system_qty numeric not null default 0,
  counted_qty numeric null,
  status text not null default 'PENDING'::text,
  counter_id uuid null,
  updated_at timestamp with time zone null default now(),
  constraint audit_items_pkey primary key (id),
  constraint audit_items_counter_id_fkey foreign KEY (counter_id) references auth.users (id),
  constraint audit_items_location_id_fkey foreign KEY (location_id) references locations (id),
  constraint audit_items_product_id_fkey foreign KEY (product_id) references products (id),
  constraint audit_items_session_id_fkey foreign KEY (session_id) references audit_sessions (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_audit_items_session_id on public.audit_items using btree (session_id) TABLESPACE pg_default;}


{create table public.audit_sessions (
  id uuid not null default gen_random_uuid (),
  warehouse_id uuid not null,
  name text not null,
  status text not null default 'OPEN'::text,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  finalized_at timestamp with time zone null,
  constraint audit_sessions_pkey primary key (id),
  constraint audit_sessions_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint audit_sessions_warehouse_id_fkey foreign KEY (warehouse_id) references warehouses (id)
) TABLESPACE pg_default;

create index IF not exists idx_audit_sessions_warehouse_id on public.audit_sessions using btree (warehouse_id) TABLESPACE pg_default;}


{create table public.locations (
  id uuid not null default gen_random_uuid (),
  warehouse_id uuid null,
  code text not null,
  type text null default 'SHELF'::text,
  is_active boolean null default true,
  lot text null,
  cart text null,
  level text null,
  max_capacity integer null default 1,
  constraint locations_pkey primary key (id),
  constraint locations_warehouse_id_code_key unique (warehouse_id, code),
  constraint locations_warehouse_id_fkey foreign KEY (warehouse_id) references warehouses (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_locations_lot on public.locations using btree (warehouse_id, lot) TABLESPACE pg_default;

create index IF not exists idx_locations_cart on public.locations using btree (warehouse_id, lot, cart) TABLESPACE pg_default;

create index IF not exists idx_locations_wh_lot on public.locations using btree (warehouse_id, lot) TABLESPACE pg_default;

create index IF not exists idx_locations_wh_lot_cart on public.locations using btree (warehouse_id, lot, cart) TABLESPACE pg_default;}


{create table public.product_categories (
  id text not null,
  name text not null,
  form_schema jsonb null default '[]'::jsonb,
  created_at timestamp with time zone null default now(),
  is_active boolean null default true,
  constraint product_categories_pkey primary key (id)
) TABLESPACE pg_default;}


{create table public.products (
  id uuid not null default gen_random_uuid (),
  sku text not null,
  name text not null,
  category_id text null,
  uom text null default 'PCS'::text,
  min_stock numeric null default 0,
  base_attributes jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  attributes jsonb null default '{}'::jsonb,
  image_url text null,
  is_active boolean null default true,
  constraint products_pkey primary key (id),
  constraint products_sku_key unique (sku),
  constraint products_category_id_fkey foreign KEY (category_id) references product_categories (id)
) TABLESPACE pg_default;

create index IF not exists idx_products_active_sku on public.products using btree (sku) TABLESPACE pg_default
where
  (is_active = true);}

  {create table public.profiles (
  id uuid not null,
  updated_at timestamp with time zone null,
  email text null,
  first_name text null,
  last_name text null,
  full_name text null,
  avatar_url text null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint username_length check ((char_length(full_name) >= 3))
) TABLESPACE pg_default;}

{create table public.stocks (
  id uuid not null default gen_random_uuid (),
  warehouse_id uuid null,
  location_id uuid null,
  product_id uuid null,
  quantity numeric null default 0,
  attributes jsonb null default '{}'::jsonb,
  updated_at timestamp with time zone null default now(),
  status text null default 'AVAILABLE'::text,
  lot text null,
  cart_id text null,
  constraint stocks_pkey primary key (id),
  constraint stocks_product_location_unique unique (location_id, product_id, attributes),
  constraint stocks_location_id_fkey foreign KEY (location_id) references locations (id),
  constraint stocks_product_id_fkey foreign KEY (product_id) references products (id),
  constraint stocks_warehouse_id_fkey foreign KEY (warehouse_id) references warehouses (id),
  constraint stocks_quantity_check check ((quantity >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_stocks_lot on public.stocks using btree (lot) TABLESPACE pg_default;

create index IF not exists idx_stocks_cart_id on public.stocks using btree (cart_id) TABLESPACE pg_default;}

{create table public.transactions (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  type text not null,
  warehouse_id uuid null,
  product_id uuid null,
  from_location_id uuid null,
  to_location_id uuid null,
  quantity numeric not null,
  attributes_snapshot jsonb null,
  ref_doc_no text null,
  note text null,
  user_id uuid null,
  user_email text null,
  details text null,
  attributes jsonb null default '{}'::jsonb,
  constraint transactions_pkey primary key (id),
  constraint transactions_from_location_id_fkey foreign KEY (from_location_id) references locations (id),
  constraint transactions_product_id_fkey foreign KEY (product_id) references products (id),
  constraint transactions_to_location_id_fkey foreign KEY (to_location_id) references locations (id),
  constraint transactions_warehouse_id_fkey foreign KEY (warehouse_id) references warehouses (id)
) TABLESPACE pg_default;}

{create table public.user_roles (
  user_id uuid not null,
  role text not null,
  allowed_warehouses text[] null default '{}'::text[],
  created_at timestamp with time zone null default now(),
  is_active boolean null default true,
  constraint user_roles_pkey primary key (user_id),
  constraint user_roles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint user_roles_role_check check (
    (
      role = any (
        array['admin'::text, 'manager'::text, 'staff'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_active_email on public.user_roles using btree (user_id) TABLESPACE pg_default
where
  (is_active = true);}

  {create table public.warehouses (
  id uuid not null default gen_random_uuid (),
  code text not null,
  name text not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  config jsonb null default '{}'::jsonb,
  constraint warehouses_pkey primary key (id),
  constraint warehouses_code_key unique (code)
) TABLESPACE pg_default;

create index IF not exists idx_warehouses_active on public.warehouses using btree (code) TABLESPACE pg_default
where
  (is_active = true);}

 //functions

  {
DECLARE
    user_allowed text[]; -- รายการคลังที่ User มีสิทธิ์ (อาจเป็น ID หรือ Code ก็ได้)
    target_code text;    -- รหัสคลังของ Warehouse ที่กำลังตรวจสอบ
BEGIN
    -- ดึงรายการสิทธิ์ของ User
    SELECT allowed_warehouses INTO user_allowed
    FROM public.user_roles
    WHERE user_id = auth.uid();

    -- ถ้าไม่มีสิทธิ์อะไรเลย -> ปฏิเสธทันที
    IF user_allowed IS NULL OR array_length(user_allowed, 1) IS NULL THEN 
        RETURN false; 
    END IF;

    -- ✅ Case 0: เป็น Admin ให้ผ่านตลอด
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
        RETURN true;
    END IF;

    -- ✅ Case 1: เช็คด้วย ID (ระบบใหม่)
    -- ถ้าใน Array มี UUID ของคลังนี้อยู่ -> อนุญาต
    IF target_warehouse_id::text = ANY(user_allowed) THEN
        RETURN true;
    END IF;

    -- ✅ Case 2: เช็คด้วย Code (ระบบเดิม/User เก่า)
    -- ต้อง Lookup หา Code ของคลังนี้ก่อน
    -- (SECURITY DEFINER ช่วยให้ Admin Query ได้โดยไม่ติด RLS Loop)
    SELECT code INTO target_code
    FROM public.warehouses
    WHERE id = target_warehouse_id;

    -- ถ้าใน Array มี Code ของคลังนี้อยู่ -> อนุญาต
    IF target_code = ANY(user_allowed) THEN
        RETURN true;
    END IF;

    -- ถ้าไม่ตรงทั้ง 2 กรณี -> ปฏิเสธ
    RETURN false;
END;
  }

  {
DECLARE
  new_wh_id UUID;
BEGIN
  -- 1. Create Warehouse
  INSERT INTO warehouses (code, name, is_active, config)
  VALUES (p_code, p_name, true, json_build_object('axis_x', p_axis_x, 'axis_y', p_axis_y, 'axis_z', p_axis_z))
  RETURNING id INTO new_wh_id;

  -- 2. Bulk Insert Locations using generate_series (เร็วกว่า Loop มาก)
  INSERT INTO locations (warehouse_id, code, lot, cart, level, max_capacity, type)
  SELECT 
    new_wh_id,
    format('L%s-P%s-Z%s', lpad(x::text, 2, '0'), lpad(y::text, 2, '0'), lpad(z::text, 2, '0')), -- code
    format('L%s', lpad(x::text, 2, '0')), -- lot
    format('P%s', lpad(y::text, 2, '0')), -- cart (mapped from Y)
    z,                                     -- level
    1,                                     -- max_capacity
    'CART_SLOT'                            -- type
  FROM generate_series(1, p_axis_x) as x
  CROSS JOIN generate_series(1, p_axis_y) as y
  CROSS JOIN generate_series(1, p_axis_z) as z;

  RETURN json_build_object('success', true, 'message', 'สร้างคลัง 3D สำเร็จ', 'warehouse_id', new_wh_id);

EXCEPTION WHEN OTHERS THEN
  -- การใช้ Exception จะ Rollback transaction ทั้งหมดให้อัตโนมัติ (ทั้ง warehouse และ locations)
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
  }

  {
DECLARE
  v_current_qty INT;
  v_new_qty INT;
  v_product_id UUID;
  v_warehouse_id UUID;
  v_location_id UUID;
BEGIN
  -- 1. Lock แถวและดึงข้อมูลปัจจุบัน
  SELECT quantity, product_id, warehouse_id, location_id
  INTO v_current_qty, v_product_id, v_warehouse_id, v_location_id
  FROM stocks
  WHERE id = p_stock_id
  FOR UPDATE; -- ป้องกัน Race Condition

  -- 2. Validation
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบสินค้าชิ้นนี้ในระบบ');
  END IF;

  IF v_current_qty < p_deduct_qty THEN
    RETURN jsonb_build_object('success', false, 'message', 'สินค้าคงเหลือไม่เพียงพอ');
  END IF;

  -- 3. คำนวณยอดใหม่
  v_new_qty := v_current_qty - p_deduct_qty;

  -- 4. [Logic สำคัญ] ถ้าเหลือ 0 ให้ลบทิ้ง, ถ้าเหลือ > 0 ให้อัปเดต
  IF v_new_qty = 0 THEN
    DELETE FROM stocks WHERE id = p_stock_id;
  ELSE
    UPDATE stocks 
    SET quantity = v_new_qty, updated_at = now()
    WHERE id = p_stock_id;
  END IF;

  -- 5. บันทึก Transaction Log (OUTBOUND)
  INSERT INTO transactions (
    type, 
    warehouse_id, 
    product_id, 
    from_location_id, 
    quantity, 
    user_id, 
    user_email, 
    details
  ) VALUES (
    'OUTBOUND', 
    v_warehouse_id, 
    v_product_id, 
    v_location_id, 
    p_deduct_qty, 
    p_user_id, 
    p_user_email, 
    COALESCE(p_note, '') -- ใช้ note ที่ส่งมา หรือค่าว่าง
  );

  RETURN jsonb_build_object('success', true, 'message', 'ตัดจ่ายสินค้าสำเร็จ');
END;
  }

  {
begin
  insert into public.profiles (id, email, full_name, first_name, last_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
  }

  {
BEGIN
  -- ถ้าเป็น Admin ให้ผ่านตลอด
  IF is_admin() THEN RETURN TRUE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'staff'
    AND (
       SELECT code FROM warehouses WHERE id = warehouse_id_check
    ) = ANY(allowed_warehouses)
  );
END;
  }

  {
DECLARE
    new_session_id UUID;
BEGIN
    -- Create Session
    INSERT INTO audit_sessions (warehouse_id, name, created_by, status)
    VALUES (p_warehouse_id, p_name, p_user_id, 'OPEN')
    RETURNING id INTO new_session_id;

    -- Create Audit Items from Stocks (Snapshot)
    INSERT INTO audit_items (session_id, product_id, location_id, system_qty, status)
    SELECT 
        new_session_id,
        s.product_id,
        s.location_id,
        s.quantity,
        'PENDING'
    FROM stocks s
    JOIN locations l ON s.location_id = l.id
    WHERE l.warehouse_id = p_warehouse_id
      AND s.quantity > 0; -- Optional: Only audit items with stock? Or all? Usually only > 0 for snapshot.

    RETURN new_session_id;
END;
  }

  {
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
  }

  {
DECLARE
    item RECORD;
    diff NUMERIC;
    v_warehouse_id UUID;
BEGIN
    -- Get warehouse_id from session
    SELECT warehouse_id INTO v_warehouse_id FROM audit_sessions WHERE id = p_session_id;

    -- Update Session Status
    UPDATE audit_sessions 
    SET status = 'COMPLETED', finalized_at = NOW()
    WHERE id = p_session_id;

    -- Loop through items that were counted
    FOR item IN 
        SELECT * FROM audit_items 
        WHERE session_id = p_session_id AND status = 'COUNTED' AND counted_qty IS NOT NULL
    LOOP
        diff := item.counted_qty - item.system_qty;
        
        IF diff <> 0 THEN
            -- Update Stock Quantity (Delete if 0)
            IF item.counted_qty = 0 THEN
                DELETE FROM stocks 
                WHERE product_id = item.product_id AND location_id = item.location_id;
            ELSE
                UPDATE stocks 
                SET quantity = item.counted_qty, updated_at = NOW()
                WHERE product_id = item.product_id AND location_id = item.location_id;
            END IF;
            
            -- Insert Transaction Log (Adjustment)
            INSERT INTO transactions (
                type, warehouse_id, product_id, quantity, 
                from_location_id, to_location_id, 
                user_id, user_email, created_at, details
            )
            VALUES (
                'ADJUSTMENT',
                v_warehouse_id,
                item.product_id,
                ABS(diff),
                CASE WHEN diff < 0 THEN item.location_id ELSE NULL END, -- Loss: Source is Location
                CASE WHEN diff > 0 THEN item.location_id ELSE NULL END, -- Gain: Dest is Location
                p_user_id,
                p_user_email,
                NOW(),
                'Audit Adjustment Session: ' || p_session_id
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Audit finalized and adjustments processed');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
  }

  {
DECLARE
    t jsonb;
    success_count int := 0;
BEGIN
    FOR t IN SELECT * FROM jsonb_array_elements(p_transactions)
    LOOP
        -- 1. บันทึก Transaction Log
        INSERT INTO transactions (
            warehouse_id,
            product_id,
            to_location_id,
            quantity,
            attributes,
            user_id,
            user_email,
            type,
            created_at
        ) VALUES (
            (t->>'p_warehouse_id')::uuid,
            (t->>'p_product_id')::uuid,
            (t->>'p_to_location_id')::uuid,
            (t->>'p_quantity')::numeric,
            COALESCE((t->>'p_attributes')::jsonb, '{}'::jsonb),
            (t->>'p_user_id')::uuid,
            t->>'p_user_email',
            'INBOUND',
            now()
        );

        -- 2. Upsert Stock
        INSERT INTO stocks (
            warehouse_id,
            location_id,
            product_id,
            quantity,
            attributes,
            updated_at,
            lot -- ✅ เพิ่ม: ระบุคอลัมน์ lot
        ) VALUES (
            (t->>'p_warehouse_id')::uuid,
            (t->>'p_location_id')::uuid,
            (t->>'p_product_id')::uuid,
            (t->>'p_quantity')::numeric,
            COALESCE((t->>'p_attributes')::jsonb, '{}'::jsonb),
            now(),
            (t->>'p_attributes')::jsonb->>'lot' -- ✅ ดึงค่า lot จาก attributes มาใส่คอลัมน์จริง เพื่อให้ Index ทำงาน
        )
        ON CONFLICT (location_id, product_id, attributes) 
        DO UPDATE SET
            quantity = stocks.quantity + EXCLUDED.quantity,
            updated_at = now();

        success_count := success_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'count', success_count);

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Transaction Failed: %', SQLERRM;
END;
  }

  {
DECLARE
    v_stock_id UUID;
BEGIN
    -- 1. Upsert Stock (อัปเดตสต็อก)
    INSERT INTO stocks (
        warehouse_id, 
        location_id, 
        product_id, 
        quantity, 
        attributes,
        updated_at,
        lot -- ✅ เพิ่ม: ดึงค่า lot ออกมาเก็บแยกเพื่อประสิทธิภาพ Index
    )
    VALUES (
        p_warehouse_id, 
        p_location_id, 
        p_product_id, 
        p_quantity, 
        COALESCE(p_attributes, '{}'::jsonb),
        now(),
        p_attributes->>'lot' -- ✅ ดึงค่า lot จาก JSON
    )
    ON CONFLICT (location_id, product_id, attributes) 
    DO UPDATE SET 
        quantity = stocks.quantity + EXCLUDED.quantity, -- บวกยอดเพิ่ม
        updated_at = now()
    RETURNING id INTO v_stock_id;

    -- 2. Transaction Log (บันทึกประวัติ)
    INSERT INTO transactions (
        type, 
        warehouse_id, 
        product_id, 
        to_location_id, -- ✅ Inbound คือการนำเข้า "ไปที่" (To)
        quantity, 
        attributes,     -- ✅ แก้ไข: ใช้ชื่อคอลัมน์ attributes (เดิม details)
        user_id, 
        user_email,
        created_at      -- ✅ เพิ่ม: วันที่ทำรายการ
    )
    VALUES (
        'INBOUND', 
        p_warehouse_id, 
        p_product_id, 
        p_location_id, 
        p_quantity, 
        COALESCE(p_attributes, '{}'::jsonb), -- ✅ ป้องกัน NULL
        p_user_id, 
        p_user_email,
        now()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Inbound processed successfully', 'stock_id', v_stock_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
  }

  {
DECLARE
  v_product_id UUID;
  v_attributes JSONB;
  v_current_qty INT;
  v_new_source_qty INT;
  v_target_location_id UUID;
  v_target_stock_id UUID;
BEGIN
  -- 1. Lock และดึงข้อมูลต้นทาง
  SELECT product_id, COALESCE(attributes, '{}'::jsonb), quantity 
  INTO v_product_id, v_attributes, v_current_qty
  FROM stocks
  WHERE id = p_stock_id
  FOR UPDATE;

  -- Validation
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'ไม่พบสินค้าต้นทาง'); END IF;
  IF v_current_qty < p_qty THEN RETURN jsonb_build_object('success', false, 'message', 'สินค้าต้นทางไม่เพียงพอ'); END IF;

  -- 2. หา Location ID ปลายทาง
  SELECT id INTO v_target_location_id FROM locations
  WHERE warehouse_id = p_target_warehouse_id AND code = p_target_code AND is_active = true LIMIT 1;

  IF v_target_location_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'ไม่พบพิกัด ' || p_target_code || ' ในคลังปลายทาง'); END IF;

  -- 3. ตัดของจากต้นทาง
  v_new_source_qty := v_current_qty - p_qty;
  IF v_new_source_qty = 0 THEN
    DELETE FROM stocks WHERE id = p_stock_id;
  ELSE
    UPDATE stocks SET quantity = v_new_source_qty, updated_at = now() WHERE id = p_stock_id;
  END IF;

  -- 4. ✅ เพิ่มของเข้าปลายทางด้วย ON CONFLICT (แก้ปัญหา Duplicate Key)
  INSERT INTO stocks (warehouse_id, location_id, product_id, quantity, attributes)
  VALUES (p_target_warehouse_id, v_target_location_id, v_product_id, p_qty, v_attributes)
  ON CONFLICT ON CONSTRAINT stocks_product_location_unique 
  DO UPDATE SET 
    quantity = stocks.quantity + EXCLUDED.quantity,
    updated_at = now()
  RETURNING id INTO v_target_stock_id;

  -- 5. บันทึก Transaction ขาเข้า-------------------------------
  INSERT INTO transactions (
    type, warehouse_id, product_id, to_location_id, 
    quantity, user_id, user_email, details
  )
  VALUES (
    'TRANSFER_IN', p_target_warehouse_id, v_product_id, v_target_location_id,
    p_qty, p_user_id, p_user_email, 'Received from Cross Transfer'
  );

  RETURN jsonb_build_object('success', true, 'message', 'ย้ายข้ามคลังสำเร็จ');
END;
  }

  {
DECLARE
  v_product_id UUID;
  v_attributes JSONB;
  v_warehouse_id UUID;
  v_current_qty INT;
  v_new_source_qty INT;
  v_target_stock_id UUID;
BEGIN
  -- Lock แถวต้นทาง
  SELECT product_id, attributes, warehouse_id, quantity 
  INTO v_product_id, v_attributes, v_warehouse_id, v_current_qty
  FROM stocks
  WHERE id = p_source_stock_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบสินค้าต้นทาง');
  END IF;

  IF v_current_qty < p_qty THEN
    RETURN jsonb_build_object('success', false, 'message', 'สินค้าต้นทางไม่เพียงพอ');
  END IF;

  -- จัดการต้นทาง: ลบถ้าเหลือ 0
  v_new_source_qty := v_current_qty - p_qty;
  IF v_new_source_qty = 0 THEN
    DELETE FROM stocks WHERE id = p_source_stock_id;
  ELSE
    UPDATE stocks
    SET quantity = v_new_source_qty,
        updated_at = now()
    WHERE id = p_source_stock_id;
  END IF;

  -- จัดการปลายทาง
  SELECT id INTO v_target_stock_id FROM stocks
  WHERE location_id = p_target_location_id
    AND product_id = v_product_id
    AND attributes = v_attributes
  FOR UPDATE; -- lock target row if exists to avoid race conditions

  IF v_target_stock_id IS NOT NULL THEN
    UPDATE stocks
    SET quantity = quantity + p_qty,
        updated_at = now()
    WHERE id = v_target_stock_id;
  ELSE
    INSERT INTO stocks (warehouse_id, location_id, product_id, quantity, attributes, updated_at)
    VALUES (v_warehouse_id, p_target_location_id, v_product_id, p_qty, v_attributes, now(), now());
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'ย้ายสินค้าสำเร็จ');
EXCEPTION
  WHEN others THEN
    -- คืนค่า error แบบปลอดภัย
    RETURN jsonb_build_object('success', false, 'message', sqlerrm);
END;
  }
