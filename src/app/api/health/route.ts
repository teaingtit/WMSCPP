import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering เนื่องจากใช้ cookies ผ่าน Supabase
export const dynamic = 'force-dynamic';

/**
 * Health Check Endpoint
 * ใช้สำหรับตรวจสอบสถานะของแอปพลิเคชัน
 * - Docker healthcheck
 * - Load balancer health probe
 * - Monitoring systems
 */
export async function GET() {
  try {
    // เช็คว่า Next.js Server ยังทำงานอยู่
    const timestamp = new Date().toISOString();

    // เช็คว่าเชื่อมต่อ Supabase ได้หรือไม่
    const supabase = await createClient();
    const { error } = await supabase.from('warehouses').select('id').limit(1);

    if (error) {
      console.error('[Health Check] Supabase connection error:', error);
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp,
          error: 'Database connection failed',
        },
        { status: 503 }, // Service Unavailable
      );
    }

    // ทุกอย่างปกติ
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp,
        service: 'WMSCPP',
        version: '1.0.0',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[Health Check] Unexpected error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
