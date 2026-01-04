import { createClient } from '@supabase/supabase-js';

// สร้าง Client เพียงตัวเดียว (Singleton) เพื่อป้องกัน warning "Multiple GoTrueClient instances"
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);