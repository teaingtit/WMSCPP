// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logic การป้องกัน Route
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    // ถ้าไม่มี User แต่พยายามเข้า Dashboard -> ส่งไป Login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/')) {
    // ดึง Role ของ User เพื่อ Redirect ไปหน้าแรกที่เหมาะสม
    const { data: roleData } = await supabase
      .from('user_roles')
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
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
