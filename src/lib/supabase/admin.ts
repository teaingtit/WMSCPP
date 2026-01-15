import { createClient } from '@supabase/supabase-js';

// Client นี้มีสิทธิ์ระดับพระเจ้า (Bypass RLS) ใช้สำหรับการบริหารจัดการ User เท่านั้น
// CRITICAL: SUPABASE_SERVICE_ROLE_KEY ต้องถูกตั้งค่าใน Environment Variables เท่านั้น
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

// Validate that required environment variables are set
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
