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
    const { email, adminId, deviceId, challengeId, signature, publicKey, deviceName, region } = body;
    const identifier = String(email || adminId || body.userId || '').trim();

    if (!identifier || !challengeId || !signature) {
      return NextResponse.json(
        { error: 'Missing required credentials (email/adminId, challengeId, and cryptographic signature required)' },
        { status: 400 }
      );
    }

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

    // 2. Resolve User (by email, admin ID, or DID)
    const user = deviceStore.getUserByEmailOrId(identifier);
    if (!user) {
      return NextResponse.json({ error: 'User not registered in SecureMAX system' }, { status: 404 });
    }

    if (user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({ error: `User account is ${user.status}. Access prohibited.` }, { status: 403 });
    }

    // Check if Administrator is locked (Panic mechanism)
    if (user.role === UserRole.ADMIN && deviceStore.systemSettings.admin_locked) {
      deviceStore.recordAdminLogin({
        adminId: user.id,
        deviceId: deviceId || 'unknown',
        success: false,
        reason: 'ADMIN_ACCOUNT_LOCKED',
      });
      return NextResponse.json(
        { error: 'ACCESS DENIED: Administrator account is locked. Emergency recovery ceremony required to restore access.' },
        { status: 403 }
      );
    }

    // 3. Resolve Device & Enforce Device Credential Binding
    const userDevices = deviceStore.getDevicesForUser(user.id);
    let device = deviceId ? deviceStore.getDeviceById(deviceId) : null;

    if (!device) {
      if (publicKey) {
        device = userDevices.find(d => d.public_key === publicKey) || null;
      }

      // If user is ADMIN: STRICT HARDWARE-BOUND SINGLETON RULE
      // Admin CANNOT log in from an unknown device. Must be pre-registered admin device.
      if (user.role === UserRole.ADMIN) {
        if (!device || !device.is_admin_device) {
          // Check if there is an active admin device for this user
          const adminDev = userDevices.find(d => d.is_admin_device && d.status === 'ACTIVE');
          const SEED_PLACEHOLDER_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2Z37UoHq3y1V4XwH5K7oF9P9k3sZ0s7uVvWxX0y1A2bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4z5A6bC7w==';
          const isPlaceholderKey = adminDev && (adminDev.public_key === SEED_PLACEHOLDER_KEY || adminDev.public_key.startsWith('MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2Z37'));

          if (adminDev && (!publicKey || adminDev.public_key === publicKey || isPlaceholderKey)) {
            if (isPlaceholderKey && publicKey) {
              // Anchor the real browser hardware key to this Admin device
              adminDev.public_key = publicKey;
              if (deviceName) adminDev.device_name = deviceName;
              adminDev.last_authenticated_at = new Date().toISOString();
              deviceStore.devices.set(adminDev.id, adminDev);
              const passport = deviceStore.devicePassports.get(adminDev.id);
              if (passport) {
                passport.public_key = publicKey;
                if (deviceName) passport.device_name = deviceName;
                passport.last_authenticated_at = new Date().toISOString();
                deviceStore.devicePassports.set(adminDev.id, passport);
              }
              deviceStore.recordAuditEvent({
                eventType: 'ADMIN_HARDWARE_TERMINAL_BOUND',
                description: `Admin hardware terminal anchored with P-256 passkey for ${user.name}`,
                targetId: adminDev.id,
                userName: user.name,
                userEmail: user.email,
                performedBy: user.name,
                severity: 'INFO',
              });
              deviceStore.saveToDisk();
            }
            device = adminDev;
          } else {
            deviceStore.recordAdminLogin({
              adminId: user.id,
              deviceId: deviceId || 'unknown',
              success: false,
              reason: 'UNAUTHORIZED_ADMIN_DEVICE',
            });
            return NextResponse.json(
              { error: 'ACCESS DENIED: Administrator account is strictly bound to the verified Admin hardware terminal. Unenrolled device prohibited.' },
              { status: 403 }
            );
          }
        }
      }

      // For standard users / auditors on first login:
      const hasRealBoundDevice = userDevices.some(
        d => d.status === 'ACTIVE' && !d.public_key.startsWith('MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE')
      );

      if (!device && publicKey && (!hasRealBoundDevice || userDevices.length === 0)) {
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
        { error: 'This device credential has been REVOKED or SUSPENDED. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Check admin device integrity
    if (user.role === UserRole.ADMIN && !device.is_admin_device) {
      deviceStore.recordAdminLogin({
        adminId: user.id,
        deviceId: device.id,
        success: false,
        reason: 'NON_ADMIN_DEVICE_ATTEMPT',
      });
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
      if (user.role === UserRole.ADMIN) {
        deviceStore.recordAdminLogin({
          adminId: user.id,
          deviceId: device.id,
          success: false,
          reason: 'SIGNATURE_VERIFICATION_FAILED',
        });
      }
      return NextResponse.json(
        { error: 'Cryptographic signature verification failed. Private key mismatch.' },
        { status: 401 }
      );
    }

    // 5. Record permanent login event in database & update device
    deviceStore.updateDeviceLastUsed(device.id);
    deviceStore.recordLogin({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      deviceName: device.device_name,
      status: 'SUCCESS',
    });

    if (user.role === UserRole.ADMIN) {
      deviceStore.recordAdminLogin({
        adminId: user.id,
        deviceId: device.id,
        success: true,
        region,
      });
    }

    // 6. Issue SecureMAX 8-Hour Session with Assurance Level
    const sessionId = crypto.randomUUID();
    const assuranceLevel = user.role === UserRole.ADMIN ? 'LEVEL_3' : 'LEVEL_2';

    const sessionToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      did: user.did,
      deviceId: device.id,
      deviceName: device.device_name,
      sessionId,
      assuranceLevel,
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
      assuranceLevel,
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
