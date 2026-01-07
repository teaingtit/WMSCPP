'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionResponse } from '@/types/action-response';
import {
  StatusDefinition,
  EntityStatus,
  EntityNote,
  StatusChangeLog,
  StatusEntityType,
} from '@/types/status';

// --- Zod Schemas ---
const CreateStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform((val) => val.trim()),
  code: z
    .string()
    .min(1, 'Status code is required')
    .max(50, 'Code must be 50 characters or less')
    .transform((val) => val.trim().toUpperCase().replace(/\s+/g, '_')),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  effect: z.enum([
    'TRANSACTIONS_ALLOWED',
    'TRANSACTIONS_PROHIBITED',
    'CLOSED',
    'INBOUND_ONLY',
    'OUTBOUND_ONLY',
    'AUDIT_ONLY',
    'CUSTOM',
  ] as const),
  is_default: z.coerce.boolean().default(false),
  sort_order: z.coerce.number().min(0).default(0),
});

const UpdateStatusSchema = CreateStatusSchema.partial().extend({
  id: z.string().uuid('Invalid status ID'),
});

const ApplyStatusSchema = z.object({
  entity_type: z.enum(['STOCK', 'LOCATION', 'WAREHOUSE', 'PRODUCT'] as const),
  entity_id: z.string().uuid('Invalid entity ID'),
  status_id: z.string().uuid('Invalid status ID'),
  notes: z.string().optional(),
  reason: z.string().optional(),
});

const AddNoteSchema = z.object({
  entity_type: z.enum(['STOCK', 'LOCATION', 'WAREHOUSE', 'PRODUCT'] as const),
  entity_id: z.string().uuid('Invalid entity ID'),
  content: z.string().min(1, 'Note content is required').max(2000, 'Note too long'),
  is_pinned: z.coerce.boolean().default(false),
});

// ============================================
// STATUS DEFINITION ACTIONS
// ============================================

/**
 * Get all active status definitions
 */
export async function getStatusDefinitions(): Promise<StatusDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_definitions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching status definitions:', error);
    return [];
  }
  return (data as StatusDefinition[]) || [];
}

/**
 * Get all status definitions including inactive (for admin)
 */
export async function getAllStatusDefinitions(): Promise<StatusDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_definitions')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching all status definitions:', error);
    return [];
  }
  return (data as StatusDefinition[]) || [];
}

/**
 * Get default status definition
 */
export async function getDefaultStatus(): Promise<StatusDefinition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_definitions')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching default status:', error);
    return null;
  }
  return data as StatusDefinition;
}

/**
 * Create a new status definition
 */
export async function createStatusDefinition(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const rawData = {
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description'),
    color: formData.get('color'),
    bg_color: formData.get('bg_color'),
    text_color: formData.get('text_color'),
    effect: formData.get('effect'),
    is_default: formData.get('is_default') === 'true',
    sort_order: formData.get('sort_order'),
  };

  const validated = CreateStatusSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? 'Invalid data',
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, code, description, color, bg_color, text_color, effect, is_default, sort_order } =
    validated.data;

  try {
    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('status_definitions')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { error } = await supabase.from('status_definitions').insert({
      name,
      code,
      description: description || null,
      color,
      bg_color,
      text_color,
      effect,
      is_default,
      sort_order,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, message: `Status code "${code}" already exists` };
      }
      throw error;
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Status created successfully' };
  } catch (err: any) {
    console.error('Error creating status:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Update an existing status definition
 */
export async function updateStatusDefinition(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const rawData = {
    id: formData.get('id'),
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description'),
    color: formData.get('color'),
    bg_color: formData.get('bg_color'),
    text_color: formData.get('text_color'),
    effect: formData.get('effect'),
    is_default: formData.get('is_default') === 'true',
    sort_order: formData.get('sort_order'),
  };

  const validated = UpdateStatusSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? 'Invalid data',
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { id, ...updateData } = validated.data;

  try {
    // If setting as default, unset other defaults first
    if (updateData.is_default) {
      await supabase
        .from('status_definitions')
        .update({ is_default: false })
        .eq('is_default', true)
        .neq('id', id);
    }

    const { error } = await supabase
      .from('status_definitions')
      .update({
        ...updateData,
        description: updateData.description || null,
      })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { success: false, message: `Status code "${updateData.code}" already exists` };
      }
      throw error;
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Status updated successfully' };
  } catch (err: any) {
    console.error('Error updating status:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Soft delete a status definition
 */
export async function deleteStatusDefinition(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    // Check if status is in use
    const { count } = await supabase
      .from('entity_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', id);

    if (count && count > 0) {
      return {
        success: false,
        message: `Cannot delete: This status is applied to ${count} item(s). Remove status from items first.`,
      };
    }

    // Soft delete
    const { error } = await supabase
      .from('status_definitions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Status archived successfully' };
  } catch (err: any) {
    console.error('Error deleting status:', err);
    return { success: false, message: err.message };
  }
}

// ============================================
// ENTITY STATUS ACTIONS
// ============================================

/**
 * Get status for an entity
 */
export async function getEntityStatus(
  entityType: StatusEntityType,
  entityId: string,
): Promise<EntityStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_statuses')
    .select(
      `
      *,
      status:status_definitions(*),
      applied_by_user:profiles!applied_by(id, email, first_name, last_name)
    `,
    )
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // Not found is ok
      console.error('Error fetching entity status:', error);
    }
    return null;
  }
  return data as EntityStatus;
}

/**
 * Get statuses for multiple entities
 */
export async function getEntityStatuses(
  entityType: StatusEntityType,
  entityIds: string[],
): Promise<Map<string, EntityStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_statuses')
    .select(
      `
      *,
      status:status_definitions(*)
    `,
    )
    .eq('entity_type', entityType)
    .in('entity_id', entityIds);

  if (error) {
    console.error('Error fetching entity statuses:', error);
    return new Map();
  }

  const statusMap = new Map<string, EntityStatus>();
  (data || []).forEach((item) => {
    statusMap.set(item.entity_id, item as EntityStatus);
  });
  return statusMap;
}

/**
 * Apply status to an entity
 */
export async function applyEntityStatus(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const rawData = {
    entity_type: formData.get('entity_type'),
    entity_id: formData.get('entity_id'),
    status_id: formData.get('status_id'),
    notes: formData.get('notes'),
    reason: formData.get('reason'),
  };

  const validated = ApplyStatusSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? 'Invalid data',
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { entity_type, entity_id, status_id, notes, reason } = validated.data;

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Authentication required' };
    }

    // Get current status for logging
    const { data: currentStatus } = await supabase
      .from('entity_statuses')
      .select('status_id')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .single();

    // Upsert the status
    const { error: upsertError } = await supabase.from('entity_statuses').upsert(
      {
        entity_type,
        entity_id,
        status_id,
        applied_by: user.id,
        notes: notes || null,
        applied_at: new Date().toISOString(),
      },
      {
        onConflict: 'entity_type,entity_id',
      },
    );

    if (upsertError) throw upsertError;

    // Log the status change
    const { error: logError } = await supabase.from('status_change_logs').insert({
      entity_type,
      entity_id,
      from_status_id: currentStatus?.status_id || null,
      to_status_id: status_id,
      changed_by: user.id,
      reason: reason || null,
    });

    if (logError) {
      console.error('Error logging status change:', logError);
      // Don't fail the operation for logging errors
    }

    revalidatePath('/dashboard');
    return { success: true, message: 'Status applied successfully' };
  } catch (err: any) {
    console.error('Error applying status:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Remove status from an entity
 */
export async function removeEntityStatus(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const entity_type = formData.get('entity_type') as StatusEntityType;
  const entity_id = formData.get('entity_id') as string;

  try {
    const { error } = await supabase
      .from('entity_statuses')
      .delete()
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Status removed successfully' };
  } catch (err: any) {
    console.error('Error removing status:', err);
    return { success: false, message: err.message };
  }
}

// ============================================
// ENTITY NOTES ACTIONS
// ============================================

/**
 * Get notes for an entity
 */
export async function getEntityNotes(
  entityType: StatusEntityType,
  entityId: string,
): Promise<EntityNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_notes')
    .select(
      `
      *,
      created_by_user:profiles!created_by(id, email, first_name, last_name)
    `,
    )
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching entity notes:', error);
    return [];
  }
  return (data as EntityNote[]) || [];
}

/**
 * Add a note to an entity
 */
export async function addEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const rawData = {
    entity_type: formData.get('entity_type'),
    entity_id: formData.get('entity_id'),
    content: formData.get('content'),
    is_pinned: formData.get('is_pinned') === 'true',
  };

  const validated = AddNoteSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? 'Invalid data',
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { entity_type, entity_id, content, is_pinned } = validated.data;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Authentication required' };
    }

    const { error } = await supabase.from('entity_notes').insert({
      entity_type,
      entity_id,
      content,
      is_pinned,
      created_by: user.id,
    });

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Note added successfully' };
  } catch (err: any) {
    console.error('Error adding note:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Update a note
 */
export async function updateEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const content = formData.get('content') as string;
  const is_pinned = formData.get('is_pinned') === 'true';

  try {
    const { error } = await supabase
      .from('entity_notes')
      .update({
        content,
        is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Note updated successfully' };
  } catch (err: any) {
    console.error('Error updating note:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Delete a note
 */
export async function deleteEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    const { error } = await supabase.from('entity_notes').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Note deleted successfully' };
  } catch (err: any) {
    console.error('Error deleting note:', err);
    return { success: false, message: err.message };
  }
}

// ============================================
// STATUS CHANGE HISTORY
// ============================================

/**
 * Get status change history for an entity
 */
export async function getStatusHistory(
  entityType: StatusEntityType,
  entityId: string,
): Promise<StatusChangeLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_change_logs')
    .select(
      `
      *,
      from_status:status_definitions!from_status_id(*),
      to_status:status_definitions!to_status_id(*),
      changed_by_user:profiles!changed_by(id, email, first_name, last_name)
    `,
    )
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching status history:', error);
    return [];
  }
  return (data as StatusChangeLog[]) || [];
}
