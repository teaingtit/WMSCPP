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
import {
  validateFormData,
  extractFormFields,
  ok,
  fail,
  handleDuplicateError,
} from '@/lib/action-utils';

// --- Zod Schemas ---
const entityTypeEnum = z.enum(['STOCK', 'LOCATION', 'WAREHOUSE', 'PRODUCT'] as const);
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const CreateStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(100)
    .transform((val) => val.trim()),
  code: z
    .string()
    .min(1, 'Status code is required')
    .max(50)
    .transform((val) => val.trim().toUpperCase().replace(/\s+/g, '_')),
  description: z.string().nullish(),
  color: z.string().regex(hexColorRegex, 'Invalid hex color'),
  bg_color: z.string().regex(hexColorRegex, 'Invalid hex color'),
  text_color: z.string().regex(hexColorRegex, 'Invalid hex color'),
  effect: z.enum([
    'TRANSACTIONS_ALLOWED',
    'TRANSACTIONS_PROHIBITED',
    'CLOSED',
    'INBOUND_ONLY',
    'OUTBOUND_ONLY',
    'AUDIT_ONLY',
    'CUSTOM',
  ] as const),
  status_type: z.enum(['PRODUCT', 'LOCATION'] as const).default('PRODUCT'),
  is_default: z.coerce.boolean().default(false),
  sort_order: z.coerce.number().min(0).default(0),
});

const UpdateStatusSchema = CreateStatusSchema.partial().extend({
  id: z.string().uuid('Invalid status ID'),
});

const ApplyStatusSchema = z.object({
  entity_type: entityTypeEnum,
  entity_id: z.string().uuid('Invalid entity ID'),
  status_id: z.string().uuid('Invalid status ID'),
  notes: z.string().nullish(),
  reason: z.string().nullish(),
  affected_quantity: z.coerce.number().positive().nullish(),
  total_quantity: z.coerce.number().positive().nullish(),
});

const RemovePartialStatusSchema = z.object({
  entity_type: entityTypeEnum,
  entity_id: z.string().uuid('Invalid entity ID'),
  quantity_to_remove: z.coerce.number().positive('Quantity must be positive'),
  total_quantity: z.coerce.number().positive('Total quantity required').nullish(),
  reason: z.string().nullish(),
});

const AddNoteSchema = z.object({
  entity_type: entityTypeEnum,
  entity_id: z.string().uuid('Invalid entity ID'),
  content: z.string().min(1, 'Note content is required').max(2000, 'Note too long'),
  is_pinned: z.coerce.boolean().default(false),
});

const LotStatusSchema = z.object({
  warehouse_id: z.string().uuid('Invalid warehouse ID'),
  lot: z.string().min(1, 'Lot is required'),
  status_id: z.string().uuid('Invalid status ID').nullable(),
  reason: z.string().nullish(),
});

// ============================================
// HELPER: Get authenticated user
// ============================================
async function getAuthUser(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ============================================
// STATUS DEFINITION ACTIONS
// ============================================

/** Get all active status definitions */
export async function getStatusDefinitions(): Promise<StatusDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_definitions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) console.error('Error fetching status definitions:', error);
  return (data as StatusDefinition[]) || [];
}

/** Get all status definitions including inactive (for admin) */
export async function getAllStatusDefinitions(): Promise<StatusDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_definitions')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) console.error('Error fetching all status definitions:', error);
  return (data as StatusDefinition[]) || [];
}

/** Get default status definition */
export async function getDefaultStatus(): Promise<StatusDefinition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_definitions')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (error) console.error('Error fetching default status:', error);
  return data as StatusDefinition;
}

/** Get LOCATION type status definitions only */
export async function getLocationStatusDefinitions(): Promise<StatusDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_definitions')
    .select('*')
    .eq('is_active', true)
    .eq('status_type', 'LOCATION')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) console.error('Error fetching location status definitions:', error);
  return (data as StatusDefinition[]) || [];
}

/** Create a new status definition */
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
    status_type: formData.get('status_type') || 'PRODUCT',
    is_default: formData.get('is_default') === 'true',
    sort_order: formData.get('sort_order'),
  };

  const validation = validateFormData(CreateStatusSchema, rawData);
  if (!validation.success) return validation.response;

  const {
    name,
    code,
    description,
    color,
    bg_color,
    text_color,
    effect,
    status_type,
    is_default,
    sort_order,
  } = validation.data;

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
      status_type,
      is_default,
      sort_order,
      is_active: true,
    });

    if (error) {
      const dupError = handleDuplicateError(error, 'Status code', code);
      if (dupError) return dupError;
      throw error;
    }

    revalidatePath('/dashboard/settings');
    return ok('Status created successfully');
  } catch (err: any) {
    console.error('Error creating status:', err);
    return fail(err.message);
  }
}

/** Update an existing status definition */
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
    status_type: formData.get('status_type') || 'PRODUCT',
    is_default: formData.get('is_default') === 'true',
    sort_order: formData.get('sort_order'),
  };

  const validation = validateFormData(UpdateStatusSchema, rawData);
  if (!validation.success) return validation.response;

  const { id, ...updateData } = validation.data;

  try {
    if (updateData.is_default) {
      await supabase
        .from('status_definitions')
        .update({ is_default: false })
        .eq('is_default', true)
        .neq('id', id);
    }

    const { error } = await supabase
      .from('status_definitions')
      .update({ ...updateData, description: updateData.description || null })
      .eq('id', id);

    if (error) {
      const dupError = handleDuplicateError(error, 'Status code', updateData.code || '');
      if (dupError) return dupError;
      throw error;
    }

    revalidatePath('/dashboard/settings');
    return ok('Status updated successfully');
  } catch (err: any) {
    console.error('Error updating status:', err);
    return fail(err.message);
  }
}

/** Soft delete a status definition */
export async function deleteStatusDefinition(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    const { count } = await supabase
      .from('entity_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', id);

    if (count && count > 0) {
      return fail(
        `Cannot delete: This status is applied to ${count} item(s). Remove status from items first.`,
      );
    }

    const { error } = await supabase
      .from('status_definitions')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return ok('Status archived successfully');
  } catch (err: any) {
    console.error('Error deleting status:', err);
    return fail(err.message);
  }
}

// ============================================
// ENTITY STATUS ACTIONS
// ============================================

const entityStatusSelect = `*, status:status_definitions(*), applied_by_user:profiles!applied_by(id, email, first_name, last_name)`;
const entityStatusSelectSimple = `*, status:status_definitions(*)`;

/** Get status for an entity */
export async function getEntityStatus(
  entityType: StatusEntityType,
  entityId: string,
): Promise<EntityStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_statuses')
    .select(entityStatusSelect)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  if (error && error.code !== 'PGRST116') console.error('Error fetching entity status:', error);
  return data as EntityStatus;
}

/** Get statuses for multiple entities */
export async function getEntityStatuses(
  entityType: StatusEntityType,
  entityIds: string[],
): Promise<Map<string, EntityStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_statuses')
    .select(entityStatusSelectSimple)
    .eq('entity_type', entityType)
    .in('entity_id', entityIds);

  if (error) console.error('Error fetching entity statuses:', error);

  const statusMap = new Map<string, EntityStatus>();
  (data || []).forEach((item) => statusMap.set(item.entity_id, item as EntityStatus));
  return statusMap;
}

/** Apply status to an entity */
export async function applyEntityStatus(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const rawData = {
    entity_type: formData.get('entity_type'),
    entity_id: formData.get('entity_id'),
    status_id: formData.get('status_id'),
    notes: formData.get('notes'),
    reason: formData.get('reason'),
    affected_quantity: formData.get('affected_quantity'),
    total_quantity: formData.get('total_quantity'),
  };

  const validation = validateFormData(ApplyStatusSchema, rawData);
  if (!validation.success) return validation.response;

  const { entity_type, entity_id, status_id, notes, reason, affected_quantity, total_quantity } =
    validation.data;

  try {
    const user = await getAuthUser(supabase);
    if (!user) return fail('Authentication required');

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
        affected_quantity: affected_quantity || null,
        applied_at: new Date().toISOString(),
      },
      { onConflict: 'entity_type,entity_id' },
    );

    if (upsertError) throw upsertError;

    // Log the status change (non-blocking)
    await supabase
      .from('status_change_logs')
      .insert({
        entity_type,
        entity_id,
        from_status_id: currentStatus?.status_id || null,
        to_status_id: status_id,
        changed_by: user.id,
        reason: reason || null,
        affected_quantity: affected_quantity || null,
        total_quantity: total_quantity || null,
      })
      .catch((e) => console.error('Error logging status change:', e));

    revalidatePath('/dashboard');
    return ok('Status applied successfully');
  } catch (err: any) {
    console.error('Error applying status:', err);
    return fail(err.message);
  }
}

/** Remove status from an entity (full removal) */
export async function removeEntityStatus(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const entity_type = formData.get('entity_type') as StatusEntityType;
  const entity_id = formData.get('entity_id') as string;
  const reason = formData.get('reason') as string | null;

  try {
    const user = await getAuthUser(supabase);
    const { data: currentStatus } = await supabase
      .from('entity_statuses')
      .select('status_id, affected_quantity')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .single();

    const { error } = await supabase
      .from('entity_statuses')
      .delete()
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id);

    if (error) throw error;

    // Log the status removal
    if (currentStatus && user) {
      await supabase
        .from('status_change_logs')
        .insert({
          entity_type,
          entity_id,
          from_status_id: currentStatus.status_id,
          to_status_id: null,
          changed_by: user.id,
          reason: reason || 'Status removed',
          affected_quantity: currentStatus.affected_quantity,
        })
        .catch((e) => console.error('Error logging removal:', e));
    }

    revalidatePath('/dashboard');
    return ok('Status removed successfully');
  } catch (err: any) {
    console.error('Error removing status:', err);
    return fail(err.message);
  }
}

/** Remove status from partial quantity (for PRODUCT status type only) */
export async function removePartialStatus(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const rawData = {
    entity_type: formData.get('entity_type'),
    entity_id: formData.get('entity_id'),
    quantity_to_remove: formData.get('quantity_to_remove'),
    total_quantity: formData.get('total_quantity'),
    reason: formData.get('reason'),
  };

  const validation = validateFormData(RemovePartialStatusSchema, rawData);
  if (!validation.success) return validation.response;

  const { entity_type, entity_id, quantity_to_remove, total_quantity, reason } = validation.data;

  try {
    const user = await getAuthUser(supabase);
    if (!user) return fail('Authentication required');

    const { data: currentStatus, error: fetchError } = await supabase
      .from('entity_statuses')
      .select(`*, status:status_definitions(*)`)
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .single();

    if (fetchError || !currentStatus) return fail('No status found for this entity');

    if (currentStatus.status?.status_type === 'LOCATION') {
      return fail(
        'Location statuses cannot be partially removed. Remove the entire status or move products to a different location.',
      );
    }

    const currentAffectedQty = currentStatus.affected_quantity || total_quantity || 0;
    if (currentAffectedQty === 0)
      return fail('Cannot determine affected quantity. Please remove the entire status instead.');
    if (quantity_to_remove > currentAffectedQty)
      return fail(
        `Cannot remove ${quantity_to_remove} units. Only ${currentAffectedQty} units have this status.`,
      );

    const newAffectedQty = currentAffectedQty - quantity_to_remove;

    if (newAffectedQty <= 0) {
      // Remove status entirely
      const { error: deleteError } = await supabase
        .from('entity_statuses')
        .delete()
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id);

      if (deleteError) throw deleteError;

      await supabase.from('status_change_logs').insert({
        entity_type,
        entity_id,
        from_status_id: currentStatus.status_id,
        to_status_id: null,
        changed_by: user.id,
        reason: reason || `Status removed from all ${quantity_to_remove} units`,
        affected_quantity: quantity_to_remove,
      });

      revalidatePath('/dashboard');
      return ok(`Status removed from ${quantity_to_remove} units (status cleared)`);
    }

    // Update with reduced quantity
    const { error: updateError } = await supabase
      .from('entity_statuses')
      .update({ affected_quantity: newAffectedQty, applied_at: new Date().toISOString() })
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id);

    if (updateError) throw updateError;

    await supabase.from('status_change_logs').insert({
      entity_type,
      entity_id,
      from_status_id: currentStatus.status_id,
      to_status_id: currentStatus.status_id,
      changed_by: user.id,
      reason: reason || `Status partially removed from ${quantity_to_remove} units`,
      affected_quantity: newAffectedQty,
      total_quantity: currentAffectedQty,
    });

    revalidatePath('/dashboard');
    return ok(
      `Status removed from ${quantity_to_remove} units. ${newAffectedQty} units still have this status.`,
    );
  } catch (err: any) {
    console.error('Error removing partial status:', err);
    return fail(err.message);
  }
}

// ============================================
// ENTITY NOTES ACTIONS
// ============================================

const notesSelect = `*, created_by_user:profiles!created_by(id, email, first_name, last_name)`;

/** Get notes for an entity */
export async function getEntityNotes(
  entityType: StatusEntityType,
  entityId: string,
): Promise<EntityNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_notes')
    .select(notesSelect)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching entity notes:', error);
  return (data as EntityNote[]) || [];
}

/** Add a note to an entity */
export async function addEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const rawData = {
    entity_type: formData.get('entity_type'),
    entity_id: formData.get('entity_id'),
    content: formData.get('content'),
    is_pinned: formData.get('is_pinned') === 'true',
  };

  const validation = validateFormData(AddNoteSchema, rawData);
  if (!validation.success) return validation.response;

  const { entity_type, entity_id, content, is_pinned } = validation.data;

  try {
    const user = await getAuthUser(supabase);
    if (!user) return fail('Authentication required');

    const { error } = await supabase.from('entity_notes').insert({
      entity_type,
      entity_id,
      content,
      is_pinned,
      created_by: user.id,
    });

    if (error) throw error;
    revalidatePath('/dashboard');
    return ok('Note added successfully');
  } catch (err: any) {
    console.error('Error adding note:', err);
    return fail(err.message);
  }
}

/** Update a note */
export async function updateEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const content = formData.get('content') as string;
  const is_pinned = formData.get('is_pinned') === 'true';

  try {
    const { error } = await supabase
      .from('entity_notes')
      .update({ content, is_pinned, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/dashboard');
    return ok('Note updated successfully');
  } catch (err: any) {
    console.error('Error updating note:', err);
    return fail(err.message);
  }
}

/** Delete a note */
export async function deleteEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    const { error } = await supabase.from('entity_notes').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return ok('Note deleted successfully');
  } catch (err: any) {
    console.error('Error deleting note:', err);
    return fail(err.message);
  }
}

/** Toggle note pin status */
export async function toggleNotePin(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const is_pinned = formData.get('is_pinned') === 'true';

  try {
    const { error } = await supabase
      .from('entity_notes')
      .update({ is_pinned, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/dashboard');
    return ok(is_pinned ? 'Note pinned' : 'Note unpinned');
  } catch (err: any) {
    console.error('Error toggling note pin:', err);
    return fail(err.message);
  }
}

// ============================================
// STATUS CHANGE HISTORY & HELPERS
// ============================================

const historySelect = `*, from_status:status_definitions!from_status_id(*), to_status:status_definitions!to_status_id(*), changed_by_user:profiles!changed_by(id, email, first_name, last_name)`;

/** Get status change history for an entity */
export async function getStatusHistory(
  entityType: StatusEntityType,
  entityId: string,
): Promise<StatusChangeLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_change_logs')
    .select(historySelect)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('changed_at', { ascending: false });

  if (error) console.error('Error fetching status history:', error);
  return (data as StatusChangeLog[]) || [];
}

// Alias for backward compatibility
export const getStatusChangeHistory = getStatusHistory;

/** Get notes count for multiple entities (for bulk display) */
export async function getNotesCount(
  entityType: StatusEntityType,
  entityIds: string[],
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_notes')
    .select('entity_id')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds);

  if (error) console.error('Error fetching notes count:', error);

  const countMap = new Map<string, number>();
  (data || []).forEach((item) =>
    countMap.set(item.entity_id, (countMap.get(item.entity_id) || 0) + 1),
  );
  return countMap;
}

/** Bulk fetch statuses and notes for inventory display */
export async function getInventoryStatusData(stockIds: string[]): Promise<{
  statuses: Map<string, EntityStatus>;
  noteCounts: Map<string, number>;
}> {
  if (stockIds.length === 0) return { statuses: new Map(), noteCounts: new Map() };

  const [statuses, noteCounts] = await Promise.all([
    getEntityStatuses('STOCK', stockIds),
    getNotesCount('STOCK', stockIds),
  ]);

  return { statuses, noteCounts };
}

// ============================================
// LOT STATUS ACTIONS
// ============================================

export interface LotStatus {
  lot: string;
  status_id: string | null;
  status: StatusDefinition | null;
  applied_at: string | null;
  applied_by: string | null;
}

const lotStatusSelect = `lot, status_id, applied_at, applied_by, status:status_definitions(*)`;

/** Get lot statuses for a warehouse */
export async function getLotStatuses(warehouseId: string): Promise<Map<string, LotStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lot_statuses')
    .select(lotStatusSelect)
    .eq('warehouse_id', warehouseId);

  if (error && error.code !== '42P01') console.error('Error fetching lot statuses:', error);

  const statusMap = new Map<string, LotStatus>();
  (data || []).forEach((item: any) => {
    statusMap.set(item.lot, {
      lot: item.lot,
      status_id: item.status_id,
      status: item.status,
      applied_at: item.applied_at,
      applied_by: item.applied_by,
    });
  });
  return statusMap;
}

/** Get status for a single lot */
export async function getLotStatus(warehouseId: string, lot: string): Promise<LotStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lot_statuses')
    .select(lotStatusSelect)
    .eq('warehouse_id', warehouseId)
    .eq('lot', lot)
    .single();

  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    console.error('Error fetching lot status:', error);
  }
  if (!data) return null;

  return {
    lot: data.lot,
    status_id: data.status_id,
    status: data.status,
    applied_at: data.applied_at,
    applied_by: data.applied_by,
  };
}

/** Set or remove lot status (Admin only) */
export async function setLotStatus(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const user = await getAuthUser(supabase);
  if (!user) return fail('Authentication required');

  // Check admin role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (roleData?.role !== 'admin') return fail('Admin access required to change lot status');

  const rawData = {
    warehouse_id: formData.get('warehouse_id'),
    lot: formData.get('lot'),
    status_id: formData.get('status_id') || null,
    reason: formData.get('reason'),
  };

  const validation = validateFormData(LotStatusSchema, rawData);
  if (!validation.success) return validation.response;

  const { warehouse_id, lot, status_id, reason } = validation.data;

  try {
    if (status_id) {
      const { error } = await supabase.from('lot_statuses').upsert(
        {
          warehouse_id,
          lot,
          status_id,
          applied_at: new Date().toISOString(),
          applied_by: user.id,
          reason,
        },
        { onConflict: 'warehouse_id,lot' },
      );

      if (error) throw error;
      revalidatePath('/dashboard');
      return ok(`Lot ${lot} status updated successfully`);
    }

    // Remove status
    const { error } = await supabase
      .from('lot_statuses')
      .delete()
      .eq('warehouse_id', warehouse_id)
      .eq('lot', lot);
    if (error) throw error;

    revalidatePath('/dashboard');
    return ok(`Lot ${lot} status removed`);
  } catch (err: any) {
    console.error('Error setting lot status:', err);
    return fail(err.message || 'Failed to update lot status');
  }
}
