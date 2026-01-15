import { createClient } from '@supabase/supabase-js';

// Client นี้มีสิทธิ์ระดับพระเจ้า (Bypass RLS) ใช้สำหรับการบริหารจัดการ User เท่านั้น
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'build-time-placeholder-key';

// Validate that required environment variables are set at runtime
// Skip check during build (SKIP_ENV_VALIDATION)
if (
  !process.env['SKIP_ENV_VALIDATION'] &&
  (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['SUPABASE_SERVICE_ROLE_KEY'])
) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production runtime',
    );
  }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
