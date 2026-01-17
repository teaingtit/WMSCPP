'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWarehouseId } from '@/lib/utils/db-helpers';

// =====================================================
// Validation Schemas
// =====================================================

const CreateZoneSchema = z.object({
  warehouse_id: z.string().uuid(),
  zone: z.string().min(1, 'Zone code required'),
  code: z.string().min(1, 'Code required'),
  description: z.string().optional(),
});

const CreateAisleSchema = z.object({
  parent_id: z.string().uuid(), // Zone ID
  aisle: z.string().min(1, 'Aisle code required'),
  code: z.string().min(1, 'Code required'),
  description: z.string().optional(),
});

const CreateBinSchema = z.object({
  parent_id: z.string().uuid(), // Aisle ID
  bin_code: z.string().min(1, 'Bin code required'),
  code: z.string().min(1, 'Code required'),
  attributes: z.record(z.any()).optional(),
  description: z.string().optional(),
});

// =====================================================
// Create Functions (Depth-Specific)
// =====================================================

/**
 * Create Zone (Depth 0)
 */
export async function createZone(formData: FormData) {
  const supabase = await createClient();
  const parsed = CreateZoneSchema.safeParse({
    warehouse_id: formData.get('warehouse_id'),
    zone: formData.get('zone'),
    code: formData.get('code'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { success: false, message: 'Invalid data', errors: parsed.error.flatten() };
  }

  const { warehouse_id, zone, code, description } = parsed.data;
  const whId = await getWarehouseId(supabase, warehouse_id);

  const { error } = await supabase.from('locations').insert({
    warehouse_id: whId,
    code,
    zone,
    depth: 0,
    description,
    is_active: true,
  });

  if (error) return { success: false, message: error.message };
  revalidatePath(`/dashboard/${warehouse_id}`);
  return { success: true, message: 'Zone created successfully' };
}

/**
 * Create Aisle (Depth 1)
 */
export async function createAisle(formData: FormData) {
  const supabase = await createClient();
  const parsed = CreateAisleSchema.safeParse({
    parent_id: formData.get('parent_id'),
    aisle: formData.get('aisle'),
    code: formData.get('code'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { success: false, message: 'Invalid data', errors: parsed.error.flatten() };
  }

  const { parent_id, aisle, code, description } = parsed.data;

  // Verify parent is a Zone
  const { data: parent } = await supabase
    .from('locations')
    .select('warehouse_id, depth')
    .eq('id', parent_id)
    .single();

  if (!parent || parent.depth !== 0) {
    return { success: false, message: 'Parent must be a Zone' };
  }

  const { error } = await supabase.from('locations').insert({
    warehouse_id: parent.warehouse_id,
    parent_id,
    code,
    aisle,
    depth: 1,
    description,
    is_active: true,
  });

  if (error) return { success: false, message: error.message };
  revalidatePath(`/dashboard/${parent.warehouse_id}`);
  return { success: true, message: 'Aisle created successfully' };
}

/**
 * Create Bin (Depth 2)
 */
export async function createBin(formData: FormData) {
  const supabase = await createClient();
  const parsed = CreateBinSchema.safeParse({
    parent_id: formData.get('parent_id'),
    bin_code: formData.get('bin_code'),
    code: formData.get('code'),
    attributes: formData.get('attributes') ? JSON.parse(formData.get('attributes') as string) : {},
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { success: false, message: 'Invalid data', errors: parsed.error.flatten() };
  }

  const { parent_id, bin_code, code, attributes, description } = parsed.data;

  // Verify parent is an Aisle
  const { data: parent } = await supabase
    .from('locations')
    .select('warehouse_id, depth')
    .eq('id', parent_id)
    .single();

  if (!parent || parent.depth !== 1) {
    return { success: false, message: 'Parent must be an Aisle' };
  }

  const { error } = await supabase.from('locations').insert({
    warehouse_id: parent.warehouse_id,
    parent_id,
    code,
    bin_code,
    depth: 2,
    attributes,
    description,
    is_active: true,
  });

  if (error) return { success: false, message: error.message };
  revalidatePath(`/dashboard/${parent.warehouse_id}`);
  return { success: true, message: 'Bin created successfully' };
}

// =====================================================
// Query Functions
// =====================================================

/**
 * Get full location tree for a warehouse
 */
export async function getLocationTree(warehouseId: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);

  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('warehouse_id', whId)
    .eq('is_active', true)
    .order('path');

  return data || [];
}

/**
 * Get all Zones in a warehouse
 */
export async function getZones(warehouseId: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);

  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('warehouse_id', whId)
    .eq('depth', 0)
    .eq('is_active', true)
    .order('zone');

  return data || [];
}

/**
 * Get Aisles by Zone ID
 */
export async function getAislesByZone(zoneId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('parent_id', zoneId)
    .eq('depth', 1)
    .eq('is_active', true)
    .order('aisle');

  return data || [];
}

/**
 * Get Bins by Aisle ID
 */
export async function getBinsByAisle(aisleId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('parent_id', aisleId)
    .eq('depth', 2)
    .eq('is_active', true)
    .order('bin_code');

  return data || [];
}

// =====================================================
// Backward Compatibility Functions
// =====================================================

/**
 * Get unique zone codes (replaces getWarehouseLots)
 */
export async function getWarehouseZones(warehouseId: string): Promise<string[]> {
  const zones = await getZones(warehouseId);
  return zones.map((z) => z.zone).filter(Boolean) as string[];
}

/**
 * Get aisles in a zone by zone code (replaces getCartsByLot)
 */
export async function getAislesByZoneCode(warehouseId: string, zone: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);

  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('warehouse_id', whId)
    .eq('zone', zone)
    .eq('depth', 1)
    .eq('is_active', true)
    .order('aisle');

  return data || [];
}

/**
 * Get bins by zone and aisle code (replaces getLevelsByCart)
 */
export async function getBinsByAisleCode(warehouseId: string, zone: string, aisle: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);

  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('warehouse_id', whId)
    .eq('zone', zone)
    .eq('aisle', aisle)
    .eq('depth', 2)
    .eq('is_active', true)
    .order('bin_code');

  return data || [];
}

/**
 * Get location by ID with full details
 */
export async function getLocationById(locationId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('locations')
    .select('*, parent:locations!parent_id(*)')
    .eq('id', locationId)
    .single();

  return data;
}

/**
 * Update location
 */
export async function updateLocation(
  locationId: string,
  updates: Partial<{
    code: string;
    description: string;
    is_active: boolean;
    attributes: Record<string, any>;
  }>,
) {
  const supabase = await createClient();

  const { error } = await supabase.from('locations').update(updates).eq('id', locationId);

  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Location updated successfully' };
}

/**
 * Soft delete location (set is_active = false)
 */
export async function deleteLocation(locationId: string) {
  const supabase = await createClient();

  // Check if location has children
  const { count } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', locationId);

  if (count && count > 0) {
    return { success: false, message: 'Cannot delete location with children' };
  }

  // Check if location has stock
  const { count: stockCount } = await supabase
    .from('stocks')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', locationId);

  if (stockCount && stockCount > 0) {
    return { success: false, message: 'Cannot delete location with stock' };
  }

  const { error } = await supabase
    .from('locations')
    .update({ is_active: false })
    .eq('id', locationId);

  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Location deleted successfully' };
}
