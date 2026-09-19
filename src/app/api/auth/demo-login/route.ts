import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { UserRole } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const role = (body.role as UserRole) || UserRole.ADMIN;
    const userId = role === UserRole.ADMIN ? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' : crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    // Issue SecureMax session token
    const sessionToken = await new SignJWT({ userId, role, sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    cookies().set('securemesh_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 // 8 hours
    });

    return NextResponse.json({ success: true, role, user: { id: userId, role } });
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Failed to create demo session' }, { status: 500 });
  }
}
