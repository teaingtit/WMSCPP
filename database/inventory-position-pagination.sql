-- =========================================================================
-- INVENTORY POSITION-AWARE PAGINATION
-- =========================================================================
-- RPC: get_inventory_by_positions
-- Returns stocks grouped by (lot, cart) position - no position is split across pages.
-- Run this migration in Supabase SQL Editor or via migration tool.
-- =========================================================================

CREATE OR REPLACE FUNCTION get_inventory_by_positions(
    p_warehouse_id UUID,
    p_page INT DEFAULT 1,
    p_positions_per_page INT DEFAULT 15,
    p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset INT;
    v_positions JSONB;
    v_stocks JSONB;
    v_total_positions BIGINT;
    v_page INT;
    v_per_page INT;
BEGIN
    v_page := GREATEST(1, COALESCE(p_page, 1));
    v_per_page := GREATEST(1, LEAST(50, COALESCE(p_positions_per_page, 15)));
    v_offset := (v_page - 1) * v_per_page;

    -- 1. Count total distinct positions (lot, cart) with stock > 0
    WITH base_stocks AS (
        SELECT s.id, s.quantity, s.updated_at, s.attributes,
               p.id AS product_id, p.sku, p.name, p.uom, p.category_id, p.image_url, p.attributes AS product_attributes,
               l.id AS location_id, l.code, l.warehouse_id, l.lot, l.cart, l.level
        FROM stocks s
        JOIN products p ON p.id = s.product_id
        JOIN locations l ON l.id = s.location_id
        WHERE l.warehouse_id = p_warehouse_id
          AND l.is_active = true
          AND s.quantity > 0
          AND (
              p_search IS NULL
              OR p_search = ''
              OR p.name ILIKE '%' || p_search || '%'
              OR p.sku ILIKE '%' || p_search || '%'
          )
    ),
    distinct_positions AS (
        SELECT DISTINCT lot, cart
        FROM base_stocks
    ),
    positions_with_rownum AS (
        SELECT lot, cart, ROW_NUMBER() OVER (ORDER BY lot NULLS LAST, cart NULLS LAST) AS rn
        FROM distinct_positions
    )
    SELECT COUNT(*)::BIGINT INTO v_total_positions FROM positions_with_rownum;

    -- 2. Get (lot, cart) for current page
    WITH positions_ordered AS (
        SELECT DISTINCT l.lot, l.cart
        FROM stocks s
        JOIN products p ON p.id = s.product_id
        JOIN locations l ON l.id = s.location_id
        WHERE l.warehouse_id = p_warehouse_id
          AND l.is_active = true
          AND s.quantity > 0
          AND (
              p_search IS NULL
              OR p_search = ''
              OR p.name ILIKE '%' || p_search || '%'
              OR p.sku ILIKE '%' || p_search || '%'
          )
    ),
    positions_with_rn AS (
        SELECT lot, cart
        FROM (
            SELECT lot, cart,
                   ROW_NUMBER() OVER (ORDER BY lot NULLS LAST, cart NULLS LAST) AS rn
            FROM positions_ordered
        ) sub
        WHERE rn > v_offset AND rn <= v_offset + v_per_page
    )
    SELECT jsonb_agg(jsonb_build_object('lot', lot, 'cart', cart))
    INTO v_positions
    FROM positions_with_rn;

    IF v_positions IS NULL THEN
        v_positions := '[]'::jsonb;
    END IF;

    -- 3. Fetch all stocks for those positions
    SELECT jsonb_agg(stock_row ORDER BY lot, cart, level, sku) INTO v_stocks
    FROM (
        SELECT jsonb_build_object(
            'id', s.id,
            'quantity', s.quantity,
            'updated_at', s.updated_at,
            'attributes', COALESCE(s.attributes, '{}'),
            'products', jsonb_build_object(
                'id', p.id,
                'sku', p.sku,
                'name', p.name,
                'uom', COALESCE(p.uom, 'PCS'),
                'category_id', p.category_id,
                'image_url', p.image_url,
                'attributes', COALESCE(p.attributes, '{}'),
                'is_active', COALESCE(p.is_active, true)
            ),
            'locations', jsonb_build_object(
                'id', l.id,
                'code', l.code,
                'warehouse_id', l.warehouse_id,
                'lot', l.lot,
                'cart', l.cart,
                'level', l.level,
                'is_active', COALESCE(l.is_active, true)
            )
        ) AS stock_row,
        COALESCE(l.lot, '') AS lot,
        COALESCE(l.cart, '') AS cart,
        COALESCE(l.level, '') AS level,
        COALESCE(p.sku, '') AS sku
        FROM stocks s
        JOIN products p ON p.id = s.product_id
        JOIN locations l ON l.id = s.location_id
        WHERE l.warehouse_id = p_warehouse_id
          AND l.is_active = true
          AND s.quantity > 0
          AND (
              p_search IS NULL
              OR p_search = ''
              OR p.name ILIKE '%' || p_search || '%'
              OR p.sku ILIKE '%' || p_search || '%'
          )
          AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(v_positions) AS pos
              WHERE (pos->>'lot') IS NOT DISTINCT FROM l.lot
                AND (pos->>'cart') IS NOT DISTINCT FROM l.cart
          )
    ) sub;

    IF v_stocks IS NULL THEN
        v_stocks := '[]'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'stocks', v_stocks,
        'totalPositions', v_total_positions,
        'totalStocks', jsonb_array_length(v_stocks)
    );
END;
$$;
