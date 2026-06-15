import { NextRequest, NextResponse } from 'next/server';

type Role =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'inventory_manager'
  | 'lab_technician'
  | 'radiology_technician'
  | 'cashier'
  | 'admin';

const roleRoutes: Record<Role, string> = {
  patient: '/dashboard/patient',
  doctor: '/dashboard/doctor',
  nurse: '/dashboard/nurse',
  receptionist: '/dashboard/receptionist',
  pharmacist: '/dashboard/pharmacist',
  inventory_manager: '/dashboard/inventory',
  lab_technician: '/dashboard/lab',
  radiology_technician: '/dashboard/radiology',
  cashier: '/dashboard/cashier',
  admin: '/dashboard/admin',
};

const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/callback', '/auth/complete-profile', '/auth/verify-email'];

function getToken(req: NextRequest): string | null {
  return req.cookies.get('access_token')?.value ?? null;
}

function decodePayload(token: string): { role: Role | null; ipc: boolean; pwc: boolean } {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    const role = payload.role as string;
    return {
      role: role in roleRoutes ? (role as Role) : null,
      ipc: payload.ipc !== false,
      pwc: payload.pwc !== false,
    };
  } catch {
    return { role: null, ipc: true, pwc: true };
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = getToken(req);
  if (!token) {
    // If a refresh token is present the client-side interceptor can still
    // silently refresh the access token, so let the request through.
    const hasRefreshToken = !!req.cookies.get('refresh_token')?.value;
    if (hasRefreshToken) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  const { role, ipc, pwc } = decodePayload(token);
  if (!role) {
    // Invalid / malformed access token — but if refresh token exists,
    // the interceptor can recover.
    const hasRefreshToken = !!req.cookies.get('refresh_token')?.value;
    if (hasRefreshToken) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (!ipc) {
    return NextResponse.redirect(new URL('/auth/complete-profile', req.url));
  }

  if (!pwc) {
    if (pathname !== '/auth/change-password') {
      return NextResponse.redirect(new URL('/auth/change-password', req.url));
    }
    return NextResponse.next();
  }

  // Shared staff profile page — accessible to any non-patient role
  if (pathname.startsWith('/dashboard/profile')) {
    if (role === 'patient') return NextResponse.redirect(new URL('/dashboard/patient', req.url));
    return NextResponse.next();
  }

  // Shared staff settings page — accessible to any non-patient role
  if (pathname.startsWith('/dashboard/settings')) {
    if (role === 'patient') return NextResponse.redirect(new URL('/dashboard/patient', req.url));
    return NextResponse.next();
  }

  const expected = roleRoutes[role];
  if (!pathname.startsWith(expected)) {
    return NextResponse.redirect(new URL(expected, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
