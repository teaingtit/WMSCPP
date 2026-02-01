import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const TEST_EMAIL = 'test_e2e@example.com';
export const TEST_PASSWORD = 'password123';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Global setup - runs ONCE before all tests.
 * Seeds the test user and ensures test data is ready.
 */
async function globalSetup(): Promise<void> {
  console.log('\n🚀 [Global Setup] Starting E2E test preparation...');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Missing Supabase env vars. Skipping user seeding.');
    console.warn('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.warn('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⚠️ [Global Setup] Timeout reached, aborting...');
    controller.abort();
  }, 30000); // 30 second total timeout

  try {
    // 1. Check if test user already exists
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find((u: { email?: string }) => u.email === TEST_EMAIL);

    if (existingUser) {
      // Clean up existing role entry first
      await supabase.from('user_roles').delete().eq('user_id', existingUser.id);
      // Delete the user
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log('🧹 [Global Setup] Cleaned up existing test user');
    }

    // 2. Create fresh test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Test', last_name: 'E2E' },
    });

    if (error) {
      console.error('❌ [Global Setup] Failed to create test user:', error.message);
      return;
    }

    if (data.user) {
      // 3. Assign admin role with conflict handling
      const { error: roleError } = await supabase.from('user_roles').upsert(
        {
          user_id: data.user.id,
          role: 'admin',
          is_active: true,
          allowed_warehouses: [],
        },
        { onConflict: 'user_id' },
      );

      if (roleError) {
        console.warn('⚠️ [Global Setup] Role assignment error:', roleError.message);
      }

      // 4. Ensure a test warehouse exists
      const { data: existingWh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('code', 'TEST')
        .single();

      if (!existingWh) {
        const { error: whError } = await supabase.from('warehouses').insert({
          code: 'TEST',
          name: 'Test Warehouse',
          is_active: true,
        });
        if (whError) {
          console.warn('⚠️ [Global Setup] Warehouse creation error:', whError.message);
        } else {
          console.log('🏭 [Global Setup] Created test warehouse');
        }
      }

      console.log('✅ [Global Setup] Test user created successfully');
    }
  } catch (err) {
    console.error('❌ [Global Setup] Failed with exception:', err);
    // Don't throw - allow tests to run even if setup fails
    // Tests will skip if userReady is false
  } finally {
    clearTimeout(timeoutId);
  }
}

export default globalSetup;
