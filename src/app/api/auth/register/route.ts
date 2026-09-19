import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole, UserStatus } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, name, publicKey, deviceName, role: requestedRole } = body;

    if (!email || !name || !publicKey) {
      return NextResponse.json(
        { error: 'Missing required registration fields (email, name, publicKey)' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = deviceStore.getUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'User already registered with this email' }, { status: 409 });
    }

    const userId = 'usr_' + crypto.randomUUID().slice(0, 8);
    const did = `did:securemax:user:${userId.slice(-6)}`;
    const userRole = requestedRole === 'AUDITOR' ? UserRole.AUDITOR : UserRole.USER;

    const newUser = {
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      role: userRole,
      kyc_status: 'VERIFIED' as const,
      status: UserStatus.ACTIVE,
      did,
      created_at: new Date().toISOString(),
    };

    deviceStore.users.set(newUser.id, newUser);
    deviceStore.users.set(newUser.email, newUser);

    // Register initial device
    const device = deviceStore.registerDevice({
      userId: newUser.id,
      deviceName: deviceName || 'Primary Workstation',
      publicKey,
      isAdminDevice: false,
    });

    // Issue SecureMAX 8-Hour Session
    const sessionId = crypto.randomUUID();
    const sessionToken = await new SignJWT({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      did: newUser.did,
      deviceId: device.id,
      deviceName: device.device_name,
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
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        did: newUser.did,
        role: newUser.role,
        device: {
          id: device.id,
          name: device.device_name,
        },
      },
    });
  } catch (error: any) {
    console.error('[Register API Error]:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
