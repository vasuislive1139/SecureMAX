import { NextResponse } from 'next/server';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole, UserStatus } from '@/types';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, name, publicKey, deviceName } = body;

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

    const newUser = {
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      role: UserRole.USER,
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
