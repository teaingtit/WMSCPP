'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionResponse } from '@/types/action-response';
import { StatusDefinition, StatusEntityType, EntityStatus } from '@/types/status';
import { validateFormData, ok, fail, handleDuplicateError } from '@/lib/action-utils';

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

// Define LotStatus type
export interface LotStatus {
  lot: string;
  status_id: string;
  status: StatusDefinition;
  applied_at: string;
  applied_by: string;
}

// Define lotStatusSelect
const lotStatusSelect = 'lot, status_id, status, applied_at, applied_by';

// Ensure LotStatusSchema is defined
const LotStatusSchema = z.object({
  warehouse_id: z.string().uuid('Invalid warehouse ID'),
  lot: z.string().min(1, 'Lot is required'),
  status_id: z.string().uuid('Invalid status ID').nullable(),
  reason: z.string().max(500, 'Reason too long').nullable(),
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
      .then(null, (e: Error) => console.error('Error logging status change:', e));

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
        .then(null, (e: Error) => console.error('Error logging removal:', e));
    }

    revalidatePath('/dashboard');
    return ok('Status removed successfully');
  } catch (err: any) {
    console.error('Error removing status:', err);
    return fail(err.message);
  }
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
    status: data.status as StatusDefinition, // Ensure proper typing
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

/** Fetch inventory status data for given stock IDs */
export async function getInventoryStatusData(stockIds: string[]): Promise<{
  statuses: Map<string, EntityStatus>;
  noteCounts: Map<string, number>;
}> {
  const supabase = await createClient();

  // Fetch entity statuses
  const { data: statusData, error: statusError } = await supabase
    .from('entity_statuses')
    .select('*, status:status_definitions(*)')
    .eq('entity_type', 'STOCK')
    .in('entity_id', stockIds);

  if (statusError) {
    console.error('Error fetching inventory status data:', statusError);
    return { statuses: new Map(), noteCounts: new Map() };
  }

  // Fetch note counts
  const { data: noteData, error: noteError } = await supabase
    .from('entity_notes')
    .select('entity_id')
    .eq('entity_type', 'STOCK')
    .in('entity_id', stockIds);

  if (noteError) {
    console.error('Error fetching note counts:', noteError);
  }

  // Build statuses Map
  const statuses = new Map<string, EntityStatus>();
  if (statusData) {
    for (const item of statusData) {
      statuses.set(item.entity_id, item as EntityStatus);
    }
  }

  // Build note counts Map
  const noteCounts = new Map<string, number>();
  if (noteData) {
    for (const note of noteData) {
      const current = noteCounts.get(note.entity_id) || 0;
      noteCounts.set(note.entity_id, current + 1);
    }
  }

  return { statuses, noteCounts };
}

/** Fetch lot statuses for a warehouse */
export async function getLotStatuses(warehouseId: string): Promise<Map<string, LotStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lot_statuses')
    .select('*, status:status_definitions(*)')
    .eq('warehouse_id', warehouseId);

  if (error) {
    console.error('Error fetching lot statuses:', error);
    return new Map();
  }

  const lotStatusMap = new Map<string, LotStatus>();
  if (data) {
    for (const item of data) {
      lotStatusMap.set(item.lot, item as LotStatus);
    }
  }
  return lotStatusMap;
}

/** Fetch entity notes */
export async function getEntityNotes(entityType: StatusEntityType, entityId: string): Promise<any> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entity_notes')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    console.error('Error fetching entity notes:', error);
    return null;
  }
  return data;
}

/** Fetch status change history */
export async function getStatusChangeHistory(
  entityType: StatusEntityType,
  entityId: string,
): Promise<any> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('status_change_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    console.error('Error fetching status change history:', error);
    return null;
  }
  return data;
}

/** Remove partial status */
export async function removePartialStatus(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('partial_status_removals')
    .insert(Object.fromEntries(formData));

  if (error) {
    console.error('Error removing partial status:', error);
    return fail('Failed to remove partial status');
  }
  return ok('Partial status removed successfully');
}

/** Add a note to an entity */
export async function addEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.from('entity_notes').insert(Object.fromEntries(formData));

  if (error) {
    console.error('Error adding entity note:', error);
    return fail('Failed to add note');
  }
  return ok('Note added successfully');
}

/** Update an entity note */
export async function updateEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const content = formData.get('content') as string | null;
  const is_pinned = formData.get('is_pinned') as string | null;

  const updates: any = {};
  if (content !== null) updates.content = content;
  if (is_pinned !== null) updates.is_pinned = is_pinned === 'true';

  const { error } = await supabase.from('entity_notes').update(updates).eq('id', id);

  if (error) {
    console.error('Error updating entity note:', error);
    return fail('Failed to update note');
  }
  return ok('Note updated successfully');
}

/** Delete an entity note */
export async function deleteEntityNote(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.from('entity_notes').delete().eq('id', formData.get('id'));

  if (error) {
    console.error('Error deleting entity note:', error);
    return fail('Failed to delete note');
  }
  return ok('Note deleted successfully');
}

/** Toggle pin status of a note */
export async function toggleNotePin(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('entity_notes')
    .update({ is_pinned: formData.get('is_pinned') })
    .eq('id', formData.get('id'));

  if (error) {
    console.error('Error toggling note pin:', error);
    return fail('Failed to toggle pin');
  }
  return ok('Note pin toggled successfully');
}
