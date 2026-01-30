/**
 * One-off script to create the default Admin user.
 * Run from project root: npx tsx scripts/create-admin-user.ts
 *
 * Creates: admin@wms.com / adminwms with role admin
 *
 * If you get "Database error creating new user", create the user in Supabase Dashboard
 * (Authentication -> Users -> Add user) then run this script again, or run the SQL in
 * database/set-admin-role.sql via Supabase SQL Editor.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const EMAIL = 'admin@wms.com';
const PASSWORD = 'adminwms';

function exit(code: number) {
  // Avoid Windows libuv handle assertion when exiting immediately after async work
  setTimeout(() => process.exit(code), 100);
}

async function setAdminRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('user_roles')
    .update({ role: 'admin' })
    .eq('user_id', userId);
  if (error) {
    console.error('Failed to set admin role:', error.message);
    return false;
  }
  console.log('Admin role set for', EMAIL);
  return true;
}

async function main() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    exit(1);
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Admin', last_name: 'WMS' },
    });

    if (createError) {
      const msg = createError.message || '';
      const isAlreadyExists =
        msg.includes('already been registered') || msg.includes('already exists');
      const isDbError = msg.includes('Database error creating new user');

      if (isAlreadyExists || isDbError) {
        console.log(
          isDbError
            ? 'User may already exist (database error). Looking up to set admin role...'
            : 'User already exists. Updating role to admin...',
        );
        let existingUser: { id: string } | null = null;
        let page = 1;
        const perPage = 1000;
        while (true) {
          const { data: list } = await supabase.auth.admin.listUsers({ page, perPage });
          const found = list?.users?.find((u) => u.email === EMAIL);
          if (found) {
            existingUser = { id: found.id };
            break;
          }
          if (!list?.users?.length || list.users.length < perPage) break;
          page++;
        }
        if (existingUser && (await setAdminRole(supabase, existingUser.id))) {
          exit(0);
          return;
        }
        if (!existingUser) {
          console.error('Could not find user with email', EMAIL);
          console.error(
            'Create the user in Supabase Dashboard (Authentication -> Users -> Add user), then run database/set-admin-role.sql in SQL Editor.',
          );
          exit(1);
          return;
        }
        exit(1);
        return;
      }
      throw createError;
    }

    if (!user?.user?.id) {
      console.error('User creation returned no user id');
      exit(1);
      return;
    }

    if (await setAdminRole(supabase, user.user.id)) {
      console.log('Admin user created:', EMAIL, '(role: admin)');
      exit(0);
    } else {
      exit(1);
    }
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : err);
    exit(1);
  }
}

main();
