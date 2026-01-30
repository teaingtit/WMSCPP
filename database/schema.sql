-- =========================================================================
-- WMSCPP - Warehouse Management System Database Schema
-- =========================================================================
--
-- Tables (public schema):
--   1. profiles, user_roles
--   2. warehouses, locations
--   3. product_categories, category_schema_versions, products
--   4. stocks
--   5. transactions
--   6. audit_sessions, audit_items
--   7. status_definitions, entity_statuses, lot_statuses, status_change_logs, partial_status_removals
--   8. entity_notes
--
-- Triggers: update_*_updated_at on tables with updated_at; on_auth_user_created (auth.users) in functions.sql
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. USER MANAGEMENT TABLES
-- =========================================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')) DEFAULT 'staff',
    allowed_warehouses TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =========================================================================
-- 2. WAREHOUSE MANAGEMENT TABLES
-- =========================================================================

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    axis_x INTEGER,
    axis_y INTEGER,
    axis_z INTEGER,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table (storage locations within warehouses)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    lot TEXT,
    cart TEXT,
    level TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    type TEXT DEFAULT 'STORAGE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, code)
);

-- =========================================================================
-- 3. PRODUCT MANAGEMENT TABLES
-- =========================================================================

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    form_schema JSONB DEFAULT '{}',
    units TEXT[] DEFAULT '{"PCS"}',
    schema_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category schema versions (for tracking schema changes)
CREATE TABLE IF NOT EXISTS category_schema_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    schema JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, version)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    uom TEXT NOT NULL DEFAULT 'PCS',
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    attributes JSONB DEFAULT '{}',
    schema_version_created INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 4. INVENTORY MANAGEMENT TABLES
-- =========================================================================

-- Stocks table (inventory at specific locations)
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

-- =========================================================================
-- 5. TRANSACTION & MOVEMENT TABLES
-- =========================================================================

-- Transactions table (all inventory movements)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('INBOUND', 'OUTBOUND', 'TRANSFER', 'TRANSFER_OUT', 'ADJUST', 'AUDIT')),
    from_location UUID REFERENCES locations(id) ON DELETE SET NULL,
    to_location UUID REFERENCES locations(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'PENDING')) DEFAULT 'SUCCESS',
    details TEXT,
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 6. AUDIT MANAGEMENT TABLES
-- =========================================================================

-- Audit sessions table
CREATE TABLE IF NOT EXISTS audit_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'COMPLETED')) DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    finalized_at TIMESTAMPTZ
);

-- Audit items table
CREATE TABLE IF NOT EXISTS audit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COUNTED')) DEFAULT 'PENDING',
    system_qty NUMERIC NOT NULL DEFAULT 0,
    counted_qty NUMERIC,
    diff_qty NUMERIC,
    counter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 7. STATUS MANAGEMENT TABLES
-- =========================================================================

-- Status definitions table (master status types)
CREATE TABLE IF NOT EXISTS status_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#64748b',
    bg_color TEXT NOT NULL DEFAULT '#f1f5f9',
    text_color TEXT NOT NULL DEFAULT '#334155',
    effect TEXT NOT NULL DEFAULT 'TRANSACTIONS_ALLOWED',
    status_type TEXT NOT NULL CHECK (status_type IN ('PRODUCT', 'LOCATION')) DEFAULT 'PRODUCT',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entity statuses table (status applied to entities)
CREATE TABLE IF NOT EXISTS entity_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('STOCK', 'LOCATION', 'WAREHOUSE', 'PRODUCT')),
    entity_id UUID NOT NULL,
    status_id UUID NOT NULL REFERENCES status_definitions(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    affected_quantity NUMERIC,
    UNIQUE(entity_type, entity_id, status_id)
);

-- Lot statuses table (status at lot/location level)
CREATE TABLE IF NOT EXISTS lot_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot TEXT NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    status_id UUID NOT NULL REFERENCES status_definitions(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(lot, warehouse_id, status_id)
);

-- Status change logs table (audit trail)
CREATE TABLE IF NOT EXISTS status_change_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('STOCK', 'LOCATION', 'WAREHOUSE', 'PRODUCT')),
    entity_id UUID NOT NULL,
    from_status_id UUID REFERENCES status_definitions(id) ON DELETE SET NULL,
    to_status_id UUID REFERENCES status_definitions(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    affected_quantity NUMERIC,
    total_quantity NUMERIC
);

-- Partial status removals table
CREATE TABLE IF NOT EXISTS partial_status_removals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_status_id UUID NOT NULL REFERENCES entity_statuses(id) ON DELETE CASCADE,
    removed_quantity NUMERIC NOT NULL,
    removed_at TIMESTAMPTZ DEFAULT NOW(),
    removed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT
);

-- =========================================================================
-- 8. NOTES & COMMENTS TABLE
-- =========================================================================

-- Entity notes table
CREATE TABLE IF NOT EXISTS entity_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('STOCK', 'LOCATION', 'WAREHOUSE', 'PRODUCT')),
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 9. INDEXES FOR PERFORMANCE
-- =========================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Warehouse and location indexes
CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id ON locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_locations_lot ON locations(lot);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Stock indexes
CREATE INDEX IF NOT EXISTS idx_stocks_product_id ON stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_stocks_location_id ON stocks(location_id);
CREATE INDEX IF NOT EXISTS idx_stocks_updated_at ON stocks(updated_at);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_warehouse_id ON transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_sessions_warehouse_id ON audit_sessions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_status ON audit_sessions(status);
CREATE INDEX IF NOT EXISTS idx_audit_items_session_id ON audit_items(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_items_status ON audit_items(status);

-- Status indexes
CREATE INDEX IF NOT EXISTS idx_entity_statuses_entity ON entity_statuses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_statuses_status_id ON entity_statuses(status_id);
CREATE INDEX IF NOT EXISTS idx_status_change_logs_entity ON status_change_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lot_statuses_lot ON lot_statuses(lot);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_entity_notes_entity ON entity_notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_notes_is_pinned ON entity_notes(is_pinned);

-- =========================================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- =========================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_status_definitions_updated_at BEFORE UPDATE ON status_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entity_notes_updated_at BEFORE UPDATE ON entity_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
