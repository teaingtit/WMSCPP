// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { TABLES } from '@/lib/constants';

/**
 * Detects headers overflow / fetch failure errors.
 * These occur when Supabase response headers exceed Node's limit (~32KB).
 */
function isHeadersOverflowError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /headers overflow|UND_ERR_HEADERS_OVERFLOW|fetch failed/i.test(message);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Handle stale refresh token (getUser returns error in response, not thrown)
    if (error?.code === 'refresh_token_not_found' || error?.message?.includes('refresh_token')) {
      const resp = NextResponse.redirect(new URL('/login?error=session', request.url));
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-')) resp.cookies.delete(name);
      });
      return resp;
    }

    // Logic การป้องกัน Route
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
      // ถ้าไม่มี User แต่พยายามเข้า Dashboard -> ส่งไป Login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/')) {
      // ดึง Role ของ User เพื่อ Redirect ไปหน้าแรกที่เหมาะสม
      const { data: roleData } = await supabase
        .from(TABLES.USER_ROLES)
        .select('role, allowed_warehouses')
        .eq('user_id', user.id)
        .single();

      const role = roleData?.role;
      const allowedWarehouses = roleData?.allowed_warehouses || [];

      if (role === 'staff' && allowedWarehouses.length > 0) {
        // Staff -> ไปหน้า Inventory ของคลังแรกที่มีสิทธิ์
        return NextResponse.redirect(
          new URL(`/dashboard/${allowedWarehouses[0]}/inventory`, request.url),
        );
      }

      // Manager / Admin -> ไปหน้า Dashboard รวม
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
  } catch (error) {
    // Log headers overflow errors for monitoring
    if (isHeadersOverflowError(error)) {
      console.error('[Middleware] Headers overflow detected:', request.nextUrl.pathname);
      // Clear auth cookies to help user recover - they will need to re-login
      const errorResponse = NextResponse.redirect(new URL('/login?error=session', request.url));
      // Delete Supabase auth cookies to force fresh session
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-')) {
          errorResponse.cookies.delete(name);
        }
      });
      return errorResponse;
    }
    // Re-throw non-headers-overflow errors
    throw error;
  }
}

export const config = {
  // Narrowed matcher: exclude API routes, static assets, and public files
  matcher: [
    '/((?!_next/static|_next/image|api/health|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
