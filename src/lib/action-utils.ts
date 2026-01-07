import { createClient } from '@/lib/supabase/server';
import { AppUser } from '@/types/auth';
import { checkManagerRole } from '@/lib/auth-service';
import { ActionResponse } from '@/types/action-response';
import { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

type ActionHandler<TInput, TOutput> = (
  data: TInput,
  ctx: { user: AppUser; supabase: SupabaseClient },
) => Promise<ActionResponse<TOutput>>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Parse and validate form data with Zod schema
 * Returns validation error response or validated data
 */
export function validateFormData<T extends z.ZodSchema>(
  schema: T,
  rawData: Record<string, unknown>,
): { success: false; response: ActionResponse } | { success: true; data: z.infer<T> } {
  const result = schema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      response: {
        success: false,
        message: result.error.issues[0]?.message ?? 'Invalid Data',
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  }
  return { success: true, data: result.data };
}

/**
 * Extract common form fields to object
 */
export function extractFormFields<K extends string>(
  formData: FormData,
  fields: K[],
): Record<K, FormDataEntryValue | null> {
  return fields.reduce((acc, field) => {
    acc[field] = formData.get(field);
    return acc;
  }, {} as Record<K, FormDataEntryValue | null>);
}

// ============================================
// RESPONSE HELPERS
// ============================================

/** Quick success response */
export const ok = (message: string, data?: any): ActionResponse => ({
  success: true,
  message,
  ...data,
});

/** Quick error response */
export const fail = (message: string): ActionResponse => ({
  success: false,
  message,
});

/** Handle duplicate key error (code 23505) */
export const handleDuplicateError = (
  error: any,
  fieldName: string,
  value: string,
): ActionResponse | null => {
  if (error?.code === '23505') {
    return fail(`${fieldName} "${value}" already exists`);
  }
  return null;
};

// ============================================
// SOFT DELETE HELPER
// ============================================

interface SoftDeleteOptions {
  table: string;
  id: string;
  checkTable?: string;
  checkColumn?: string;
  errorMessage?: string;
  renameField?: { field: string; currentValue: string };
  revalidatePaths?: string[];
  successMessage?: string;
}

/**
 * Generic soft delete with stock/usage check
 */
export async function softDelete(options: SoftDeleteOptions): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    table,
    id,
    checkTable,
    checkColumn,
    errorMessage = 'Cannot delete: item is in use',
    renameField,
    revalidatePaths = ['/dashboard/settings'],
    successMessage = 'Deleted successfully',
  } = options;

  try {
    // Check if item is in use
    if (checkTable && checkColumn) {
      const { count } = await supabase
        .from(checkTable)
        .select('*', { count: 'exact', head: true })
        .eq(checkColumn, id);
      if (count && count > 0) {
        return fail(errorMessage);
      }
    }

    // Build update payload
    const updatePayload: Record<string, any> = { is_active: false };
    if (renameField) {
      updatePayload[renameField.field] = `${renameField.currentValue}_DEL_${Date.now()}`;
    }

    const { error } = await supabase.from(table).update(updatePayload).eq('id', id);
    if (error) throw error;

    revalidatePaths.forEach((path) => revalidatePath(path));
    return ok(successMessage);
  } catch (err: any) {
    return fail(err.message);
  }
}

// ============================================
// CATEGORY UNITS HELPER
// ============================================

type UnitOperation = 'add' | 'remove';

/**
 * Unified function to add or remove units from a category
 */
export async function modifyCategoryUnits(
  categoryId: string,
  unit: string,
  operation: UnitOperation,
): Promise<ActionResponse> {
  if (!categoryId || !unit.trim()) {
    return fail('Invalid parameters');
  }

  const supabase = await createClient();
  const normalizedUnit = unit.trim().toUpperCase();

  try {
    const { data: category, error: fetchError } = await supabase
      .from('product_categories')
      .select('units')
      .eq('id', categoryId)
      .single();

    if (fetchError) throw fetchError;

    const currentUnits: string[] = category?.units || [];

    if (operation === 'add') {
      if (currentUnits.includes(normalizedUnit)) {
        return fail(`Unit "${normalizedUnit}" already exists`);
      }
      currentUnits.push(normalizedUnit);
    } else {
      if (!currentUnits.includes(normalizedUnit)) {
        return fail(`Unit "${normalizedUnit}" not found`);
      }
      const index = currentUnits.indexOf(normalizedUnit);
      currentUnits.splice(index, 1);
    }

    const { error } = await supabase
      .from('product_categories')
      .update({ units: currentUnits })
      .eq('id', categoryId);

    if (error) throw error;

    revalidatePath('/dashboard/settings');
    const action = operation === 'add' ? 'added' : 'removed';
    return ok(`Unit "${normalizedUnit}" ${action} successfully`);
  } catch (err: any) {
    return fail('Error: ' + err.message);
  }
}

/**
 * Wraps a Server Action with Authentication and optional Role validation.
 * @param handler The action logic.
 * @param options Configuration for role checks.
 */
export const withAuth = <TInput, TOutput>(
  handler: ActionHandler<TInput, TOutput>,
  options: { requiredRole?: 'admin' | 'manager' | 'staff' } = {},
) => {
  return async (data: TInput): Promise<ActionResponse<TOutput>> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return { success: false, message: 'Unauthenticated' };
    }

    // Basic User Info (Quick Fetch)
    // For full role validation, we query the DB.
    // Ideally, we should reuse `getCurrentUser` but for performance in Actions,
    // we might want to be selective or trust the session if not strict.
    // BUT here we will do a strict check for roles if required.

    if (options.requiredRole) {
      const isManager = await checkManagerRole(supabase, user.id);

      if (options.requiredRole === 'admin') {
        // Re-check specific admin role if needed, or rely on checkManagerRole including admin
        // Let's do a quick specific check for Admin if strictly required
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (roleData?.role !== 'admin') {
          return { success: false, message: 'Forbidden: Admin access required' };
        }
      } else if (options.requiredRole === 'manager') {
        if (!isManager) {
          return { success: false, message: 'Forbidden: Manager access required' };
        }
      }
    }

    // Construct AppUser object (partial for now, or fetch full if needed)
    // To match `AppUser` exactly we'd need `getCurrentUser`, let's mock the essential parts for the handler
    const appUser: AppUser = {
      id: user.id,
      email: user.email,
      role: 'staff', // Default fallback, handler might fetch more if needed
      allowed_warehouses: [],
      created_at: user.created_at,
      is_active: true,
      is_banned: false,
    };

    try {
      return await handler(data, { user: appUser, supabase });
    } catch (error: any) {
      console.error('Action Error:', error);
      return { success: false, message: error.message || 'Internal Server Error' };
    }
  };
};

export async function processBulkAction<T>(
  items: T[],
  action: (item: T) => Promise<ActionResponse<any>>,
) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Simple chunked execution or parallel map
  const promises = items.map(async (item) => {
    try {
      const result = await action(item);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(result.message || 'Unknown Error');
      }
    } catch (err: any) {
      results.failed++;
      results.errors.push(err.message);
    }
  });

  await Promise.all(promises);

  return {
    success: results.failed === 0,
    message: `Processed ${results.success} successfully, ${results.failed} failed.`,
    details: results,
  };
}
