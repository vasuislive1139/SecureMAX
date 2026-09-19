import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { verifyP256Signature, verifyChallengeToken } from '@/lib/crypto/p256';
import { deviceStore } from '@/lib/auth/deviceStore';
import { getJwtSecret } from '@/lib/auth/session';
import { UserRole, UserStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, adminId, deviceId, challengeId, challengeToken, signature, region } = body;
    const identifier = String(email || adminId || body.userId || '').trim();

    if (!identifier || (!challengeId && !challengeToken) || !signature) {
      return NextResponse.json(
        { error: 'Missing required credentials (email/adminId, challengeId, and cryptographic signature required)' },
        { status: 400 }
      );
    }

    // 1. Retrieve and validate the challenge (via memory cache or signed token)
    let challengeMessage: string | null = null;
    let challengeExpiresAt: string | null = null;

    if (challengeId && deviceStore.challengeCache.has(challengeId)) {
      const cachedChallenge = deviceStore.challengeCache.get(challengeId)!;
      challengeMessage = cachedChallenge.message;
      challengeExpiresAt = cachedChallenge.expiresAt;
      // Single-use: delete to prevent replay attacks
      deviceStore.challengeCache.delete(challengeId);
    } else if (challengeToken) {
      const tokenVerification = verifyChallengeToken(challengeToken);
      if (tokenVerification.valid && tokenVerification.data) {
        challengeMessage = tokenVerification.data.message;
        challengeExpiresAt = tokenVerification.data.expiresAt;
      }
    }

    if (!challengeMessage || !challengeExpiresAt) {
      return NextResponse.json(
        { error: 'Cryptographic challenge expired or invalid. Please request a new challenge.' },
        { status: 400 }
      );
    }

    if (new Date(challengeExpiresAt).getTime() < Date.now()) {
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

    // 3. Resolve Device & Enforce Enrollment Binding (NEVER enroll or replace key during login)
    const userDevices = deviceStore.getDevicesForUser(user.id);
    let device = null;

    if (user.role === UserRole.ADMIN) {
      // ADMIN SINGLE-DEVICE POLICY: strictly bound to primary admin workstation
      const adminDev = userDevices.find(d => d.is_admin_device && d.status === 'ACTIVE');
      
      if (!adminDev) {
        return NextResponse.json(
          { error: 'ACCESS DENIED: No active Primary Admin Workstation registered. System bootstrap required.' },
          { status: 403 }
        );
      }

      // If client supplied a deviceId, it must match the enrolled primary admin device
      if (deviceId && deviceId !== adminDev.id) {
        deviceStore.recordAdminLogin({
          adminId: user.id,
          deviceId,
          success: false,
          reason: 'NON_ADMIN_DEVICE_ATTEMPT',
        });
        return NextResponse.json(
          { error: 'ACCESS DENIED: Non-primary device attempted administrative login. Admin access is strictly bound to your primary workstation.' },
          { status: 403 }
        );
      }

      device = adminDev;
    } else {
      // Non-Admin: Multi-device support (lookup pre-enrolled device)
      if (deviceId) {
        device = userDevices.find(d => d.id === deviceId) || null;
      } else if (userDevices.length === 1 && userDevices[0].status === 'ACTIVE') {
        device = userDevices[0];
      }

      if (!device) {
        return NextResponse.json(
          { error: 'Device not enrolled. Please enroll this device using an enrollment code from your active device.' },
          { status: 403 }
        );
      }
    }

    if (device.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `This device credential has been ${device.status}. Please contact administrator.` },
        { status: 403 }
      );
    }

    // 4. Verify Cryptographic P-256 Signature using STORED public key only
    const isValidSignature = await verifyP256Signature(
      device.public_key,
      challengeMessage,
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
      deviceStore.recordAuditEvent({
        eventType: 'LOGIN_SIGNATURE_FAILED',
        description: `Cryptographic signature verification failed for user ${user.email} on device ${device.id}`,
        targetId: device.id,
        userEmail: user.email,
        userName: user.name,
        severity: 'WARNING',
      });
      return NextResponse.json(
        { error: 'Cryptographic signature verification failed. Private key mismatch.' },
        { status: 401 }
      );
    }

    // 5. Establish Stateful Zero-Trust Session
    const assuranceLevel = user.role === UserRole.ADMIN ? 'LEVEL_3' : 'LEVEL_2';
    const session = deviceStore.createSession({
      userId: user.id,
      deviceId: device.id,
      authLevel: 'P256',
      durationHours: 8,
    });

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

    deviceStore.recordAuditEvent({
      eventType: 'USER_LOGIN_SUCCESS',
      description: `Zero-trust authentication successful for ${user.name} (${user.role}) via ${device.device_name}`,
      targetId: session.session_id,
      userEmail: user.email,
      userName: user.name,
      severity: 'INFO',
    });

    // 6. Issue SecureMAX 8-Hour Session Token
    const jwtSecret = getJwtSecret();
    const sessionToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      did: user.did,
      deviceId: device.id,
      deviceName: device.device_name,
      sessionId: session.session_id,
      assuranceLevel,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(jwtSecret);

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
