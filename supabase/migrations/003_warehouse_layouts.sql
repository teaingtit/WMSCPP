-- Create warehouse_layouts table for storing visual layouts
CREATE TABLE IF NOT EXISTS warehouse_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    layout_data JSONB NOT NULL DEFAULT '{"version": "1.0", "components": []}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(warehouse_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_warehouse_layouts_warehouse_id ON warehouse_layouts(warehouse_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_warehouse_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouse_layouts_updated_at
    BEFORE UPDATE ON warehouse_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_layouts_updated_at();

-- Enable RLS
ALTER TABLE warehouse_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view layouts for their warehouses"
    ON warehouse_layouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_warehouses
            WHERE user_warehouses.warehouse_id = warehouse_layouts.warehouse_id
            AND user_warehouses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert layouts for their warehouses"
    ON warehouse_layouts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_warehouses
            WHERE user_warehouses.warehouse_id = warehouse_layouts.warehouse_id
            AND user_warehouses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update layouts for their warehouses"
    ON warehouse_layouts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_warehouses
            WHERE user_warehouses.warehouse_id = warehouse_layouts.warehouse_id
            AND user_warehouses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete layouts for their warehouses"
    ON warehouse_layouts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_warehouses
            WHERE user_warehouses.warehouse_id = warehouse_layouts.warehouse_id
            AND user_warehouses.user_id = auth.uid()
        )
    );
