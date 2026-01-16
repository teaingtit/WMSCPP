'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createSchemaVersion } from './schema-version-actions';

export type BulkEditMode = 'replace' | 'merge' | 'remove';

interface BulkEditField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
  scope: 'PRODUCT' | 'LOT';
}

/**
 * Apply bulk schema changes to multiple categories
 */
export async function bulkEditSchemas(
  categoryIds: string[],
  mode: BulkEditMode,
  fields: BulkEditField[],
  changeNotes?: string,
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    if (categoryIds.length === 0) {
      return { success: false, message: 'No categories selected' };
    }

    // Fetch current schemas for all categories
    const { data: categories, error: fetchError } = await supabase
      .from('product_categories')
      .select('id, name, form_schema')
      .in('id', categoryIds);

    if (fetchError) throw fetchError;
    if (!categories || categories.length === 0) {
      return { success: false, message: 'No categories found' };
    }

    const updates: Array<{ id: string; newSchema: any[] }> = [];
    const errors: string[] = [];

    // Process each category
    for (const category of categories) {
      const currentSchema = (category.form_schema || []) as BulkEditField[];
      let newSchema: BulkEditField[] = [];

      switch (mode) {
        case 'replace':
          // Replace entire schema with new fields
          newSchema = fields;
          break;

        case 'merge':
          // Merge: Add new fields, update existing ones
          newSchema = [...currentSchema];
          for (const field of fields) {
            const existingIndex = newSchema.findIndex((f) => f.key === field.key);
            if (existingIndex >= 0) {
              // Update existing field
              newSchema[existingIndex] = field;
            } else {
              // Add new field
              newSchema.push(field);
            }
          }
          break;

        case 'remove':
          // Remove specified fields
          const keysToRemove = fields.map((f) => f.key);
          newSchema = currentSchema.filter((f) => !keysToRemove.includes(f.key));
          break;
      }

      // Check if schema actually changed
      if (JSON.stringify(currentSchema) !== JSON.stringify(newSchema)) {
        updates.push({ id: category.id, newSchema });
      }
    }

    if (updates.length === 0) {
      return {
        success: true,
        message: 'No changes detected',
        updated: 0,
        skipped: categories.length,
      };
    }

    // Apply updates in transaction-like manner
    let successCount = 0;
    for (const update of updates) {
      try {
        // Create version entry
        const versionResult = await createSchemaVersion(
          update.id,
          update.newSchema,
          changeNotes || `Bulk edit (${mode})`,
        );

        if (!versionResult.success) {
          errors.push(`${update.id}: Failed to create version - ${versionResult.message}`);
          continue;
        }

        // Update category schema
        const { error: updateError } = await supabase
          .from('product_categories')
          .update({ form_schema: update.newSchema })
          .eq('id', update.id);

        if (updateError) {
          errors.push(`${update.id}: ${updateError.message}`);
          continue;
        }

        successCount++;
      } catch (err: any) {
        errors.push(`${update.id}: ${err.message}`);
      }
    }

    revalidatePath('/dashboard/settings');

    return {
      success: successCount > 0,
      message:
        successCount === updates.length
          ? `Successfully updated ${successCount} categories`
          : `Updated ${successCount}/${updates.length} categories`,
      updated: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error('Bulk Edit Schemas Error:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Preview bulk edit changes without applying them
 */
export async function previewBulkEdit(
  categoryIds: string[],
  mode: BulkEditMode,
  fields: BulkEditField[],
) {
  try {
    const supabase = await createClient();

    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('id, name, form_schema')
      .in('id', categoryIds);

    if (error) throw error;
    if (!categories) return { success: false, message: 'No categories found', preview: [] };

    const preview = categories.map((category) => {
      const currentSchema = (category.form_schema || []) as BulkEditField[];
      let newSchema: BulkEditField[] = [];

      switch (mode) {
        case 'replace':
          newSchema = fields;
          break;
        case 'merge':
          newSchema = [...currentSchema];
          for (const field of fields) {
            const existingIndex = newSchema.findIndex((f) => f.key === field.key);
            if (existingIndex >= 0) {
              newSchema[existingIndex] = field;
            } else {
              newSchema.push(field);
            }
          }
          break;
        case 'remove':
          const keysToRemove = fields.map((f) => f.key);
          newSchema = currentSchema.filter((f) => !keysToRemove.includes(f.key));
          break;
      }

      const changed = JSON.stringify(currentSchema) !== JSON.stringify(newSchema);

      return {
        categoryId: category.id,
        categoryName: category.name,
        currentFieldCount: currentSchema.length,
        newFieldCount: newSchema.length,
        changed,
        currentSchema,
        newSchema,
      };
    });

    return {
      success: true,
      preview,
      totalCategories: categories.length,
      categoriesAffected: preview.filter((p) => p.changed).length,
    };
  } catch (err: any) {
    console.error('Preview Bulk Edit Error:', err);
    return { success: false, message: err.message, preview: [] };
  }
}
