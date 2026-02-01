'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { RPC } from '@/lib/constants';

/** Schema field in a version (has scope for PRODUCT/LOT). */
export interface SchemaVersionField {
  key?: string;
  type?: string;
  scope?: string;
  [key: string]: unknown;
}

/**
 * Schema Version History Entry
 */
export interface SchemaVersion {
  id: string;
  category_id: string;
  version: number;
  schema: SchemaVersionField[];
  created_at: string;
  created_by: string | null;
  change_notes: string | null;
}

/**
 * Get all schema versions for a category
 */
export async function getSchemaHistory(categoryId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('category_schema_versions')
      .select('*')
      .eq('category_id', categoryId)
      .order('version', { ascending: false });

    if (error) throw error;

    return { success: true, data: data as SchemaVersion[] };
  } catch (err: any) {
    console.error('Get Schema History Error:', err);
    return { success: false, message: err.message, data: [] };
  }
}

/**
 * Create a new schema version
 */
export async function createSchemaVersion(categoryId: string, schema: any[], changeNotes?: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    // Get next version number
    const { data: nextVersionData } = await supabase.rpc(RPC.GET_NEXT_SCHEMA_VERSION, {
      p_category_id: categoryId,
    });

    const nextVersion = nextVersionData || 1;

    // Insert new version
    const { data, error } = await supabase
      .from('category_schema_versions')
      .insert({
        category_id: categoryId,
        version: nextVersion,
        schema,
        created_by: user.id,
        change_notes: changeNotes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update category's current version number
    await supabase
      .from('product_categories')
      .update({ schema_version: nextVersion })
      .eq('id', categoryId);

    revalidatePath('/dashboard/settings');

    return { success: true, data, version: nextVersion };
  } catch (err: any) {
    console.error('Create Schema Version Error:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Revert to a previous schema version
 * Note: This creates a NEW version with the old schema (doesn't delete history)
 */
export async function revertToVersion(categoryId: string, targetVersion: number) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    // Get the target version's schema
    const { data: targetVersionData, error: fetchError } = await supabase
      .from('category_schema_versions')
      .select('schema')
      .eq('category_id', categoryId)
      .eq('version', targetVersion)
      .single();

    if (fetchError || !targetVersionData) {
      return { success: false, message: `Version ${targetVersion} not found` };
    }

    // Create new version with the old schema
    const result = await createSchemaVersion(
      categoryId,
      targetVersionData.schema,
      `Reverted to version ${targetVersion}`,
    );

    if (!result.success) return result;

    // Update the category's form_schema
    const { error: updateError } = await supabase
      .from('product_categories')
      .update({ form_schema: targetVersionData.schema })
      .eq('id', categoryId);

    if (updateError) throw updateError;

    revalidatePath('/dashboard/settings');

    return {
      success: true,
      message: `Successfully reverted to version ${targetVersion}`,
      newVersion: result.version,
    };
  } catch (err: any) {
    console.error('Revert Schema Version Error:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Compare two schema versions
 */
export async function compareSchemaVersions(
  categoryId: string,
  version1: number,
  version2: number,
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('category_schema_versions')
      .select('version, schema')
      .eq('category_id', categoryId)
      .in('version', [version1, version2])
      .order('version', { ascending: true });

    if (error) throw error;

    if (data.length !== 2) {
      return { success: false, message: 'One or both versions not found' };
    }

    // Type the versions with proper schema typing
    const versions = data as Array<{ version: number; schema: SchemaVersionField[] }>;
    const [older, newer] = versions;

    if (!older || !newer) {
      return { success: false, message: 'Invalid version data' };
    }

    // Calculate differences
    const added = newer.schema.filter(
      (newField: SchemaVersionField) =>
        !older.schema.find((oldField: SchemaVersionField) => oldField.key === newField.key),
    );

    const removed = older.schema.filter(
      (oldField: SchemaVersionField) =>
        !newer.schema.find((newField: SchemaVersionField) => newField.key === oldField.key),
    );

    const modified = newer.schema.filter((newField: SchemaVersionField) => {
      const oldField = older.schema.find((f: SchemaVersionField) => f.key === newField.key);
      if (!oldField) return false;
      return JSON.stringify(oldField) !== JSON.stringify(newField);
    });

    return {
      success: true,
      diff: {
        added,
        removed,
        modified,
        unchanged: newer.schema.length - added.length - modified.length,
      },
    };
  } catch (err: any) {
    console.error('Compare Schema Versions Error:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Get products using a specific schema version
 */
export async function getProductsBySchemaVersion(categoryId: string, version: number) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, schema_version_created')
      .eq('category_id', categoryId)
      .eq('schema_version_created', version);

    if (error) throw error;

    return { success: true, data, count: data.length };
  } catch (err: any) {
    console.error('Get Products By Schema Version Error:', err);
    return { success: false, message: err.message, data: [], count: 0 };
  }
}
