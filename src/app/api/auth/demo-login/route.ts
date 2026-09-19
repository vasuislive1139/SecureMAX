import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedRole = (body.role as UserRole) || UserRole.ADMIN;

    let targetEmail = 'admin@securemax.mil';
    if (requestedRole === UserRole.USER) targetEmail = 'vasu@securemax.mil';
    if (requestedRole === UserRole.AUDITOR) targetEmail = 'auditor@securemax.mil';

    const user = deviceStore.getUserByEmail(targetEmail);
    if (!user) {
      return NextResponse.json({ error: 'Demo user record not found' }, { status: 404 });
    }

    const devices = deviceStore.getDevicesForUser(user.id);
    const activeDevice = devices[0] || null;

    deviceStore.recordLogin({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      deviceName: activeDevice?.device_name || 'Verified Demo Terminal',
      status: 'SUCCESS',
    });

    const sessionId = crypto.randomUUID();
    const sessionToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      did: user.did,
      deviceId: activeDevice?.id || 'dev_demo_session',
      deviceName: activeDevice?.device_name || 'Verified Demo Terminal',
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    cookies().set('securemesh_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        did: user.did,
        device: activeDevice ? { id: activeDevice.id, name: activeDevice.device_name } : null,
      },
    });
  } catch (error: any) {
    console.error('[Demo Login Error]:', error);
    return NextResponse.json({ error: 'Failed to create demo session' }, { status: 500 });
  }
}
