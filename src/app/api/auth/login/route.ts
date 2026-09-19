import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { verifyP256Signature } from '@/lib/crypto/p256';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole, UserStatus } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, deviceId, challengeId, signature, publicKey, deviceName } = body;

    if (!email || !challengeId || !signature) {
      return NextResponse.json(
        { error: 'Missing required credentials (email, challengeId, and cryptographic signature required)' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 1. Retrieve and validate the challenge
    const cachedChallenge = deviceStore.challengeCache.get(challengeId);
    if (!cachedChallenge) {
      return NextResponse.json(
        { error: 'Cryptographic challenge expired or invalid. Please request a new challenge.' },
        { status: 400 }
      );
    }

    // Delete single-use challenge to prevent replay attacks
    deviceStore.challengeCache.delete(challengeId);

    if (new Date(cachedChallenge.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });
    }

    // 2. Resolve User
    const user = deviceStore.getUserByEmail(cleanEmail);
    if (!user) {
      return NextResponse.json({ error: 'User not registered in SecureMAX system' }, { status: 404 });
    }

    if (user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({ error: `User account is ${user.status}. Access prohibited.` }, { status: 403 });
    }

    // 3. Resolve Device & Enforce Device Credential Binding
    let device = deviceId ? deviceStore.getDeviceById(deviceId) : null;

    if (!device) {
      // Find devices registered to this user
      const userDevices = deviceStore.getDevicesForUser(user.id);
      
      // If client provided a public key, see if it matches any registered device
      if (publicKey) {
        device = userDevices.find(d => d.public_key === publicKey) || null;
      }

      // If user is ADMIN: STRICT HARDWARE-BOUND RULE
      // Admin CANNOT log in from an unknown device. Must be pre-registered admin device.
      if (user.role === UserRole.ADMIN) {
        if (!device || !device.is_admin_device) {
          console.warn(`[Security Alert] Unauthorized device attempted admin login: ${cleanEmail}`);
          return NextResponse.json(
            { error: 'ACCESS DENIED: Administrator account is strictly bound to the verified Admin hardware terminal. Unenrolled device prohibited.' },
            { status: 403 }
          );
        }
      }

      // For standard users on first enrollment:
      if (!device && userDevices.length === 0 && publicKey) {
        device = deviceStore.registerDevice({
          userId: user.id,
          deviceName: deviceName || 'Primary Enrolled Device',
          publicKey,
          isAdminDevice: false,
          customDeviceId: deviceId,
        });
      }
    }

    if (!device) {
      return NextResponse.json(
        { error: 'Device not registered. Please enroll this device using an enrollment code from your primary device.' },
        { status: 403 }
      );
    }

    if (device.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This device credential has been REVOKED. Please re-enroll this device.' },
        { status: 403 }
      );
    }

    // Check admin device integrity
    if (user.role === UserRole.ADMIN && !device.is_admin_device) {
      return NextResponse.json(
        { error: 'ACCESS DENIED: Non-admin device attempted administrative login.' },
        { status: 403 }
      );
    }

    // 4. Verify Cryptographic P-256 Signature
    const isValidSignature = await verifyP256Signature(
      device.public_key,
      cachedChallenge.message,
      signature
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Cryptographic signature verification failed. Private key mismatch.' },
        { status: 401 }
      );
    }

    // 5. Update device last used timestamp
    deviceStore.updateDeviceLastUsed(device.id);

    // 6. Issue SecureMAX 8-Hour Session
    const sessionId = crypto.randomUUID();
    const sessionToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      did: user.did,
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
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        did: user.did,
        device: {
          id: device.id,
          name: device.device_name,
          isAdminDevice: device.is_admin_device,
        },
      },
    });
  } catch (error) {
    console.error('[Login API Error]:', error);
    return NextResponse.json({ error: 'Internal authentication server error' }, { status: 500 });
  }
}
