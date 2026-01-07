-- Migration: Create Status System
-- Description: Creates tables for the status design system including status definitions,
--              entity status tracking, notes, and change history logging

-- ============================================
-- 1. STATUS DEFINITIONS TABLE
-- ============================================
-- Master table for all status types that can be created by users
CREATE TABLE IF NOT EXISTS status_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#64748b',      -- Primary color (hex)
    bg_color VARCHAR(7) NOT NULL DEFAULT '#f1f5f9',   -- Background color for badges
    text_color VARCHAR(7) NOT NULL DEFAULT '#334155', -- Text color for badges
    effect VARCHAR(30) NOT NULL DEFAULT 'TRANSACTIONS_ALLOWED',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,        -- Auto-applied to new items
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_effect CHECK (effect IN (
        'TRANSACTIONS_ALLOWED',
        'TRANSACTIONS_PROHIBITED', 
        'CLOSED',
        'INBOUND_ONLY',
        'OUTBOUND_ONLY',
        'AUDIT_ONLY',
        'CUSTOM'
    ))
);

-- ============================================
-- 2. ENTITY STATUSES TABLE
-- ============================================
-- Tracks current status of any entity (stock, location, warehouse, product)
CREATE TABLE IF NOT EXISTS entity_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    status_id UUID NOT NULL REFERENCES status_definitions(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by UUID NOT NULL REFERENCES profiles(id),
    notes TEXT,
    
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'STOCK',
        'LOCATION',
        'WAREHOUSE',
        'PRODUCT'
    )),
    -- Ensure one status per entity at a time
    CONSTRAINT unique_entity_status UNIQUE (entity_type, entity_id)
);

-- ============================================
-- 3. ENTITY NOTES TABLE
-- ============================================
-- Notes that can be attached to any entity
CREATE TABLE IF NOT EXISTS entity_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id),
    updated_at TIMESTAMPTZ,
    
    CONSTRAINT valid_note_entity_type CHECK (entity_type IN (
        'STOCK',
        'LOCATION',
        'WAREHOUSE',
        'PRODUCT'
    ))
);

-- ============================================
-- 4. STATUS CHANGE HISTORY TABLE
-- ============================================
-- Audit log for all status changes
CREATE TABLE IF NOT EXISTS status_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    from_status_id UUID REFERENCES status_definitions(id) ON DELETE SET NULL,
    to_status_id UUID NOT NULL REFERENCES status_definitions(id) ON DELETE CASCADE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID NOT NULL REFERENCES profiles(id),
    reason TEXT,
    
    CONSTRAINT valid_log_entity_type CHECK (entity_type IN (
        'STOCK',
        'LOCATION',
        'WAREHOUSE',
        'PRODUCT'
    ))
);

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_entity_statuses_entity ON entity_statuses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_statuses_status ON entity_statuses(status_id);
CREATE INDEX IF NOT EXISTS idx_entity_notes_entity ON entity_notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_notes_pinned ON entity_notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_status_change_logs_entity ON status_change_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_change_logs_date ON status_change_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_definitions_active ON status_definitions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_status_definitions_default ON status_definitions(is_default) WHERE is_default = TRUE;

-- ============================================
-- 6. TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_status_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_status_definitions_updated_at ON status_definitions;
CREATE TRIGGER trigger_status_definitions_updated_at
    BEFORE UPDATE ON status_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_status_definitions_updated_at();

-- ============================================
-- 7. INSERT DEFAULT STATUSES
-- ============================================
INSERT INTO status_definitions (name, code, description, color, bg_color, text_color, effect, is_default, sort_order) VALUES
    ('Active', 'ACTIVE', 'Normal active status - all operations allowed', '#22c55e', '#dcfce7', '#166534', 'TRANSACTIONS_ALLOWED', TRUE, 1),
    ('On Hold', 'ON_HOLD', 'Temporarily on hold - transactions prohibited', '#eab308', '#fef9c3', '#854d0e', 'TRANSACTIONS_PROHIBITED', FALSE, 2),
    ('Quarantine', 'QUARANTINE', 'Under inspection - no operations allowed', '#ef4444', '#fee2e2', '#991b1b', 'CLOSED', FALSE, 3),
    ('Reserved', 'RESERVED', 'Reserved for specific purpose - outbound only', '#3b82f6', '#dbeafe', '#1e40af', 'OUTBOUND_ONLY', FALSE, 4),
    ('Pending Receipt', 'PENDING_RECEIPT', 'Awaiting receipt confirmation - inbound only', '#a855f7', '#f3e8ff', '#6b21a8', 'INBOUND_ONLY', FALSE, 5),
    ('Audit Lock', 'AUDIT_LOCK', 'Locked for audit counting', '#06b6d4', '#cffafe', '#155e75', 'AUDIT_ONLY', FALSE, 6),
    ('Archived', 'ARCHIVED', 'Archived/Closed - view only', '#64748b', '#f1f5f9', '#334155', 'CLOSED', FALSE, 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE status_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_change_logs ENABLE ROW LEVEL SECURITY;

-- Policies for status_definitions (read for all authenticated, write for admins)
CREATE POLICY "Allow read status_definitions for authenticated users" ON status_definitions
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "Allow all for admins on status_definitions" ON status_definitions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'ADMIN'
        )
    );

-- Policies for entity_statuses
CREATE POLICY "Allow read entity_statuses for authenticated users" ON entity_statuses
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "Allow insert entity_statuses for authenticated users" ON entity_statuses
    FOR INSERT TO authenticated
    WITH CHECK (applied_by = auth.uid());

CREATE POLICY "Allow update entity_statuses for authenticated users" ON entity_statuses
    FOR UPDATE TO authenticated
    USING (TRUE);

-- Policies for entity_notes
CREATE POLICY "Allow read entity_notes for authenticated users" ON entity_notes
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "Allow insert entity_notes for authenticated users" ON entity_notes
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow update own entity_notes" ON entity_notes
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid());

CREATE POLICY "Allow delete own entity_notes" ON entity_notes
    FOR DELETE TO authenticated
    USING (created_by = auth.uid());

-- Policies for status_change_logs
CREATE POLICY "Allow read status_change_logs for authenticated users" ON status_change_logs
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "Allow insert status_change_logs for authenticated users" ON status_change_logs
    FOR INSERT TO authenticated
    WITH CHECK (changed_by = auth.uid());
