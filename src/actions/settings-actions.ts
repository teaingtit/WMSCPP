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
import { RPC, TABLES } from '@/lib/constants';
import type { FormSchemaField } from '@/types/settings';

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
    .from(TABLES.WAREHOUSES)
    .select('*')
    .eq('is_active', true)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true });
  return data || [];
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from(TABLES.PRODUCT_CATEGORIES)
    .select('*')
    .order('id', { ascending: true });
  return data || [];
}

export async function getProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from(TABLES.PRODUCTS)
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
    .from(TABLES.PRODUCT_CATEGORIES)
    .select('form_schema, units')
    .eq('id', category_id)
    .single();

  // Build dynamic attributes from category schema
  const attributes: Record<string, any> = {};
  const formSchema = (category?.form_schema as FormSchemaField[] | undefined) ?? [];
  if (formSchema.length) {
    formSchema.forEach((field) => {
      const value = formData.get(field.key);
      if (value) attributes[field.key] = field.type === 'number' ? Number(value) : value;
    });
  }

  const finalUom = uom || category?.units?.[0] || 'UNIT';

  try {
    const { error } = await supabase.from(TABLES.PRODUCTS).insert({
      sku,
      name,
      category_id: category_id || null,
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
  const { data: product } = await supabase
    .from(TABLES.PRODUCTS)
    .select('sku')
    .eq('id', id)
    .single();
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
    const { data: warehouse, error: insertError } = await supabase
      .from(TABLES.WAREHOUSES)
      .insert({ code, name, axis_x, axis_y, axis_z })
      .select('id')
      .single();

    if (insertError) {
      const dupResponse = handleDuplicateError(insertError, 'รหัสคลัง', code);
      if (dupResponse) return dupResponse;
      return fail(insertError.message ?? 'สร้างคลังสินค้าไม่สำเร็จ');
    }
    if (!warehouse?.id) {
      return fail('สร้างคลังสินค้าไม่สำเร็จ');
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(RPC.CREATE_WAREHOUSE_XYZ_GRID, {
      p_warehouse_id: warehouse.id,
      p_axis_x: axis_x,
      p_axis_y: axis_y,
      p_axis_z: axis_z,
    });

    if (rpcError) throw rpcError;
    const result = rpcData as { success: boolean; message: string; error?: string };

    if (result?.success) {
      revalidatePath('/dashboard/settings');
      revalidatePath('/dashboard');
      return ok(result.message ?? 'สร้างคลังและตำแหน่งเก็บเรียบร้อย');
    }
    return fail(result?.error ?? result?.message ?? 'สร้างตำแหน่งเก็บไม่สำเร็จ');
  } catch (err: any) {
    console.error('RPC Error:', err);
    return fail('System Error: ' + err.message);
  }
}

export async function createCategory(formData: FormData): Promise<ActionResponse> {
  const rawData = extractFormFields(formData, ['id', 'name', 'schema', 'units']);

  const validation = validateFormData(CreateCategorySchema, rawData);
  if (!validation.success) return validation.response;

  const { id: code, name, schema, units } = validation.data;
  const supabase = await createClient();

  try {
    // product_categories.id is UUID (auto-generated). User-facing "ID" is stored as code.
    const { error } = await supabase.from(TABLES.PRODUCT_CATEGORIES).insert([
      {
        code,
        name,
        form_schema: JSON.parse(schema),
        units: JSON.parse(units),
      },
    ]);

    if (error) {
      const dupError = handleDuplicateError(error, 'ID', code);
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
      .from(TABLES.PRODUCTS)
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) return fail('❌ มีสินค้าใช้ประเภทนี้อยู่');

    const { error } = await supabase.from(TABLES.PRODUCT_CATEGORIES).delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return ok('ลบประเภทสินค้าสำเร็จ');
  } catch (err: any) {
    return fail(err.message);
  }
}

export async function updateCategory(formData: FormData): Promise<ActionResponse> {
  const rawData = extractFormFields(formData, ['id', 'name', 'schema', 'units']);

  const validation = validateFormData(CreateCategorySchema, rawData);
  if (!validation.success) return validation.response;

  const { id, name, schema, units } = validation.data;
  const supabase = await createClient();

  try {
    // Get current category data to detect schema changes
    const { data: currentCategory, error: fetchError } = await supabase
      .from(TABLES.PRODUCT_CATEGORIES)
      .select('form_schema, schema_version')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newSchema = JSON.parse(schema);
    const currentSchema = currentCategory?.form_schema || [];

    // Check if schema has changed
    const schemaChanged = JSON.stringify(currentSchema) !== JSON.stringify(newSchema);

    // If schema changed, create version entry
    if (schemaChanged) {
      const { createSchemaVersion } = await import('./schema-version-actions');
      const versionResult = await createSchemaVersion(
        id,
        newSchema,
        formData.get('change_notes') as string | undefined,
      );

      if (!versionResult.success) {
        return fail('Failed to create schema version: ' + versionResult.message);
      }
    }

    // Update category
    const { error } = await supabase
      .from(TABLES.PRODUCT_CATEGORIES)
      .update({
        name,
        form_schema: newSchema,
        units: JSON.parse(units),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return ok(
      schemaChanged ? 'อัปเดตหมวดหมู่สำเร็จ (สร้าง schema version ใหม่)' : 'อัปเดตหมวดหมู่สำเร็จ',
    );
  } catch (err: any) {
    return fail('Error: ' + err.message);
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
      .from(TABLES.PRODUCT_CATEGORIES)
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
export const addUnitToCategory = async (categoryId: string, unit: string) =>
  await modifyCategoryUnits(categoryId, unit, 'add');

export const removeUnitFromCategory = async (categoryId: string, unit: string) =>
  await modifyCategoryUnits(categoryId, unit, 'remove');
