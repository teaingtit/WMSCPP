'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface LayoutComponent {
  id: string;
  type: 'zone' | 'aisle' | 'bin' | 'dock' | 'office';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  parentId?: string;
}

export interface WarehouseLayout {
  version: string;
  components: LayoutComponent[];
}

/**
 * Save warehouse layout
 */
export async function saveWarehouseLayout(warehouseId: string, components: LayoutComponent[]) {
  try {
    const supabase = await createClient();

    const layoutData: WarehouseLayout = {
      version: '1.0',
      components,
    };

    // Upsert layout
    const { error } = await supabase.from('warehouse_layouts').upsert(
      {
        warehouse_id: warehouseId,
        layout_data: layoutData,
      },
      {
        onConflict: 'warehouse_id',
      },
    );

    if (error) throw error;

    revalidatePath(`/dashboard/${warehouseId}/layout-designer`);

    return { success: true, message: 'บันทึกผังคลังเรียบร้อยแล้ว' };
  } catch (error: any) {
    console.error('Error saving layout:', error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการบันทึก' };
  }
}

/**
 * Load warehouse layout
 */
export async function loadWarehouseLayout(warehouseId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('warehouse_layouts')
      .select('layout_data')
      .eq('warehouse_id', warehouseId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    return {
      success: true,
      data: (data?.layout_data as WarehouseLayout) || { version: '1.0', components: [] },
    };
  } catch (error: any) {
    console.error('Error loading layout:', error);
    return {
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการโหลด',
      data: { version: '1.0', components: [] },
    };
  }
}

/**
 * Generate actual locations from layout
 */
export async function generateLocationsFromLayout(warehouseId: string) {
  try {
    const supabase = await createClient();

    // Load layout
    const { data: layoutData } = await supabase
      .from('warehouse_layouts')
      .select('layout_data')
      .eq('warehouse_id', warehouseId)
      .single();

    if (!layoutData) {
      return { success: false, message: 'ไม่พบผังคลัง' };
    }

    const layout = layoutData.layout_data as WarehouseLayout;
    const components = layout.components;

    // Filter by type
    const zones = components.filter((c) => c.type === 'zone');
    const aisles = components.filter((c) => c.type === 'aisle');
    const bins = components.filter((c) => c.type === 'bin');

    let created = { zones: 0, aisles: 0, bins: 0 };

    // Create zones
    for (const zone of zones) {
      const { error } = await supabase.from('locations').insert({
        warehouse_id: warehouseId,
        code: `ZONE-${zone.name}`,
        zone: zone.name,
        depth: 0,
        path: zone.name,
        is_active: true,
      });

      if (!error) created.zones++;
    }

    // Create aisles (need to find parent zone)
    for (const aisle of aisles) {
      // Find overlapping zone
      const parentZone = zones.find(
        (z) =>
          aisle.x >= z.x &&
          aisle.y >= z.y &&
          aisle.x + aisle.width <= z.x + z.width &&
          aisle.y + aisle.height <= z.y + z.height,
      );

      if (!parentZone) continue;

      const { data: parentLoc } = await supabase
        .from('locations')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .eq('zone', parentZone.name)
        .eq('depth', 0)
        .single();

      if (!parentLoc) continue;

      const { error } = await supabase.from('locations').insert({
        warehouse_id: warehouseId,
        code: `${parentZone.name}-${aisle.name}`,
        zone: parentZone.name,
        aisle: aisle.name,
        depth: 1,
        parent_id: parentLoc.id,
        path: `${parentZone.name}.${aisle.name}`,
        is_active: true,
      });

      if (!error) created.aisles++;
    }

    // Create bins (need to find parent aisle)
    for (const bin of bins) {
      // Find overlapping aisle
      const parentAisle = aisles.find(
        (a) =>
          bin.x >= a.x &&
          bin.y >= a.y &&
          bin.x + bin.width <= a.x + a.width &&
          bin.y + bin.height <= a.y + a.height,
      );

      if (!parentAisle) continue;

      // Find parent zone of this aisle
      const parentZone = zones.find(
        (z) =>
          parentAisle.x >= z.x &&
          parentAisle.y >= z.y &&
          parentAisle.x + parentAisle.width <= z.x + z.width &&
          parentAisle.y + parentAisle.height <= z.y + z.height,
      );

      if (!parentZone) continue;

      const { data: parentLoc } = await supabase
        .from('locations')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .eq('zone', parentZone.name)
        .eq('aisle', parentAisle.name)
        .eq('depth', 1)
        .single();

      if (!parentLoc) continue;

      const { error } = await supabase.from('locations').insert({
        warehouse_id: warehouseId,
        code: `${parentZone.name}-${parentAisle.name}-${bin.name}`,
        zone: parentZone.name,
        aisle: parentAisle.name,
        bin_code: bin.name,
        depth: 2,
        parent_id: parentLoc.id,
        path: `${parentZone.name}.${parentAisle.name}.${bin.name}`,
        is_active: true,
      });

      if (!error) created.bins++;
    }

    revalidatePath(`/dashboard/${warehouseId}/locations`);

    return {
      success: true,
      message: `สร้างพิกัดเรียบร้อย: ${created.zones} โซน, ${created.aisles} ทางเดิน, ${created.bins} ช่องเก็บ`,
      data: created,
    };
  } catch (error: any) {
    console.error('Error generating locations:', error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาด' };
  }
}
