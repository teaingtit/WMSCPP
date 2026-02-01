import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TEST_EMAIL = 'test_e2e@example.com';
const TEST_PASSWORD = 'password123';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function seedTestUser() {
  console.log('Starting seed...');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log('Listing users...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) console.error('List error:', listError);
    console.log('Users found:', users?.users?.length);

    let existingUser = users?.users?.find((u) => u.email === TEST_EMAIL);

    if (existingUser) {
      console.log('Deleting existing user:', existingUser.id);
      await supabase.from('user_roles').delete().eq('user_id', existingUser.id);
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    console.log('Creating user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Test', last_name: 'E2E' },
    });

    if (error) {
      console.error('Create error:', error);
      return;
    }

    if (data.user) {
      console.log('User created:', data.user.id);
      console.log('Upserting role...');
      const { error: roleError } = await supabase.from('user_roles').upsert(
        {
          user_id: data.user.id,
          role: 'admin',
          is_active: true,
          allowed_warehouses: [],
        },
        { onConflict: 'user_id' },
      );
      if (roleError) console.error('Role error:', roleError);
    }
    console.log('Done.');
  } catch (err) {
    console.error('Exception:', err);
  }
}

seedTestUser();
