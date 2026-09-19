import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/types';

import { jwtVerify } from 'jose';

// Real session validation using jose for Edge runtime compatibility
async function validateSession(req: NextRequest) {
  const sessionToken = req.cookies.get('securemesh_session')?.value;
  if (!sessionToken) return null;
  
  try {
    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');
    const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If visiting /login or / while already authenticated, redirect to appropriate dashboard
  if (pathname === '/login' || pathname === '/') {
    const session = await validateSession(request);
    if (session) {
      if (session.role === 'ADMIN') return NextResponse.redirect(new URL('/dashboard/admin', request.url));
      if (session.role === 'AUDITOR') return NextResponse.redirect(new URL('/dashboard/auditor', request.url));
      return NextResponse.redirect(new URL('/dashboard/user', request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard and api routes (except auth)
  if (pathname.startsWith('/dashboard') || (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/'))) {
    const session = await validateSession(request);
    
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session required' } }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based routing checks
    if (pathname.startsWith('/dashboard/admin') && session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*', '/login', '/'],
};
