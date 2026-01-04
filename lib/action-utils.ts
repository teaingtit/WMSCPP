import { createClient } from '@/lib/supabase/server';
import { AppUser } from '@/types/auth';
import { checkManagerRole } from '@/lib/auth-service';
import { ActionResponse } from '@/types/action-response';
import { SupabaseClient } from '@supabase/supabase-js';

type ActionHandler<TInput, TOutput> = (
  data: TInput,
  ctx: { user: AppUser; supabase: SupabaseClient }
) => Promise<ActionResponse<TOutput>>;

/**
 * Wraps a Server Action with Authentication and optional Role validation.
 * @param handler The action logic.
 * @param options Configuration for role checks.
 */
export const withAuth = <TInput, TOutput>(
  handler: ActionHandler<TInput, TOutput>,
  options: { requiredRole?: 'admin' | 'manager' | 'staff' } = {}
) => {
  return async (data: TInput): Promise<ActionResponse<TOutput>> => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
         const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
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
        is_banned: false
    };

    try {
      return await handler(data, { user: appUser, supabase });
    } catch (error: any) {
      console.error("Action Error:", error);
      return { success: false, message: error.message || 'Internal Server Error' };
    }
  };
};
