import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering เนื่องจากใช้ cookies ผ่าน Supabase
export const dynamic = 'force-dynamic';

/**
 * Detects headers overflow / fetch failure errors.
 * These occur when Supabase response headers exceed Node's limit (~32KB).
 */
function isHeadersOverflowError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /headers overflow|UND_ERR_HEADERS_OVERFLOW|fetch failed/i.test(message);
}

/**
 * Health Check Endpoint
 * ใช้สำหรับตรวจสอบสถานะของแอปพลิเคชัน
 * - Docker healthcheck
 * - Load balancer health probe
 * - Monitoring systems
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
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
    // Specific handling for headers overflow errors
    if (isHeadersOverflowError(error)) {
      console.error('[Health Check] Headers overflow detected - session cookies may be too large');
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          error: 'Headers overflow - clear cookies or re-login',
          code: 'HEADERS_OVERFLOW',
        },
        { status: 503 },
      );
    }

    console.error('[Health Check] Unexpected error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
