'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionResponse } from '@/types/action-response';
import {
  validateFormData,
  extractFormFields,
  ok,
  fail,
  handleDuplicateError,
  softDelete,
  modifyCategoryUnits,
} from '@/lib/action-utils';

// --- Zod Schemas ---
const CreateWarehouseSchema = z.object({
  code: z
    .string()
    .min(1, 'Warehouse Code is required')
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(1, 'Warehouse Name is required')
    .transform((val) => val.trim()),
  axis_x: z.coerce.number().min(1).default(1),
  axis_y: z.coerce.number().min(1).default(1),
  axis_z: z.coerce.number().min(1).default(1),
});

const CreateProductSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU is required')
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(1, 'Product Name is required')
    .transform((val) => val.trim()),
  category_id: z.string().min(1, 'Product Category is required'),
  uom: z.string().optional().default('UNIT'),
  image_url: z.string().optional(),
});

const CreateCategorySchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(1, 'Name is required'),
  schema: z.string().optional().default('[]'),
  units: z.string().optional().default('[]'),
});

const UpdateCategoryUnitsSchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  units: z.string().optional().default('[]'),
});

// --- 1. Getters (ดึงเฉพาะ Active) ---

export async function getAllWarehousesForAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('warehouses')
    .select('*')
    .eq('is_active', true)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true });
  return data || [];
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('product_categories')
    .select('*')
    .order('id', { ascending: true });
  return data || [];
}

export async function getProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:product_categories(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return data || [];
}

// --- 2. Mutations ---

export async function createProduct(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const rawData = extractFormFields(formData, ['sku', 'name', 'category_id', 'uom', 'image_url']);
  rawData.uom = rawData.uom || 'UNIT';

  const validation = validateFormData(CreateProductSchema, rawData);
  if (!validation.success) return validation.response;

  const { sku, name, category_id, uom, image_url } = validation.data;
  const { data: category } = await supabase
    .from('product_categories')
    .select('form_schema, units')
    .eq('id', category_id)
    .single();

  // Build dynamic attributes from category schema
  const attributes: Record<string, any> = {};
  if (category?.form_schema) {
    (category.form_schema as any[]).forEach((field) => {
      const value = formData.get(field.key);
      if (value) attributes[field.key] = field.type === 'number' ? Number(value) : value;
    });
  }

  const finalUom = uom || category?.units?.[0] || 'UNIT';

  try {
    const { error } = await supabase.from('products').insert({
      sku,
      name,
      category_id: category_id || 'GENERAL',
      uom: finalUom,
      image_url: image_url || null,
      attributes,
      is_active: true,
    });

    if (error) {
      const dupError = handleDuplicateError(error, 'SKU', sku);
      if (dupError) return dupError;
      throw error;
    }
    revalidatePath('/dashboard/settings');
    return ok('สร้างสินค้าสำเร็จ');
  } catch (err: any) {
    return fail(err.message);
  }
}

// ✅ Soft Delete Product
export async function deleteProduct(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  // Get current SKU for rename
  const { data: product } = await supabase.from('products').select('sku').eq('id', id).single();
  if (!product) return fail('ไม่พบสินค้า');

  return softDelete({
    table: 'products',
    id,
    checkTable: 'stocks',
    checkColumn: 'product_id',
    errorMessage: '❌ ลบไม่ได้: มีสินค้าคงเหลือในสต็อก',
    renameField: { field: 'sku', currentValue: product.sku },
    successMessage: 'ลบสินค้าสำเร็จ (ย้ายไปถังขยะ)',
  });
}

// ✅ Soft Delete Warehouse
export async function deleteWarehouse(formData: FormData): Promise<ActionResponse> {
  return softDelete({
    table: 'warehouses',
    id: formData.get('id') as string,
    checkTable: 'stocks',
    checkColumn: 'warehouse_id',
    errorMessage: '❌ มีสินค้าคงเหลือ ลบไม่ได้',
    revalidatePaths: ['/dashboard/settings', '/dashboard'],
    successMessage: 'ปิดใช้งานคลังสินค้าเรียบร้อย',
  });
}

export async function createWarehouse(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const rawData = extractFormFields(formData, ['code', 'name', 'axis_x', 'axis_y', 'axis_z']);

  const validation = validateFormData(CreateWarehouseSchema, rawData);
  if (!validation.success) return validation.response;

  const { code, name, axis_x, axis_y, axis_z } = validation.data;

  try {
    const { data, error } = await supabase.rpc('create_warehouse_xyz_grid', {
      p_code: code,
      p_name: name,
      p_axis_x: axis_x,
      p_axis_y: axis_y,
      p_axis_z: axis_z,
    });

    if (error) throw error;
    const result = data as { success: boolean; message: string };

    if (result.success) {
      revalidatePath('/dashboard/settings');
      revalidatePath('/dashboard');
      return ok(result.message);
    }
    return fail(result.message);
  } catch (err: any) {
    console.error('RPC Error:', err);
    return fail('System Error: ' + err.message);
  }
}

export async function createCategory(formData: FormData): Promise<ActionResponse> {
  const rawData = extractFormFields(formData, ['id', 'name', 'schema', 'units']);

  const validation = validateFormData(CreateCategorySchema, rawData);
  if (!validation.success) return validation.response;

  const { id, name, schema, units } = validation.data;
  const supabase = await createClient();

  try {
    const { error } = await supabase.from('product_categories').insert([
      {
        id,
        name,
        form_schema: JSON.parse(schema),
        units: JSON.parse(units),
      },
    ]);

    if (error) {
      const dupError = handleDuplicateError(error, 'ID', id);
      if (dupError) return dupError;
      throw error;
    }
    revalidatePath('/dashboard/settings');
    return ok('สร้างประเภทสินค้าสำเร็จ');
  } catch (err: any) {
    return fail('Error: ' + err.message);
  }
}

export async function deleteCategory(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) return fail('❌ มีสินค้าใช้ประเภทนี้อยู่');

    const { error } = await supabase.from('product_categories').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return ok('ลบประเภทสินค้าสำเร็จ');
  } catch (err: any) {
    return fail(err.message);
  }
}

// --- Category Units Management ---

export async function updateCategoryUnits(formData: FormData): Promise<ActionResponse> {
  const rawData = extractFormFields(formData, ['id', 'units']);

  const validation = validateFormData(UpdateCategoryUnitsSchema, rawData);
  if (!validation.success) return validation.response;

  const { id, units } = validation.data;
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('product_categories')
      .update({ units: JSON.parse(units) })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/dashboard/settings');
    return ok('อัปเดตหน่วยนับสำเร็จ');
  } catch (err: any) {
    return fail('Error: ' + err.message);
  }
}

// Unified unit operations using shared helper
export const addUnitToCategory = (categoryId: string, unit: string) =>
  modifyCategoryUnits(categoryId, unit, 'add');

export const removeUnitFromCategory = (categoryId: string, unit: string) =>
  modifyCategoryUnits(categoryId, unit, 'remove');
