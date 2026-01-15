import { createClient } from '@supabase/supabase-js';

// สร้าง Client เพียงตัวเดียว (Singleton) เพื่อป้องกัน warning "Multiple GoTrueClient instances"
// ใช้ fallback values สำหรับ build time (จะถูก override ตอน runtime)
export const supabaseBrowser = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://placeholder.supabase.co',
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder',
);
