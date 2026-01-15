import { createClient } from '@supabase/supabase-js';

// Client นี้มีสิทธิ์ระดับพระเจ้า (Bypass RLS) ใช้สำหรับการบริหารจัดการ User เท่านั้น
// ใช้ fallback values สำหรับ build time (จะถูก override ตอน runtime)
export const supabaseAdmin = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://placeholder.supabase.co',
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
