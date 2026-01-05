import { createClient } from '@supabase/supabase-js';

// Client นี้มีสิทธิ์ระดับพระเจ้า (Bypass RLS) ใช้สำหรับการบริหารจัดการ User เท่านั้น
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ ต้องเพิ่ม Key นี้ใน .env
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
