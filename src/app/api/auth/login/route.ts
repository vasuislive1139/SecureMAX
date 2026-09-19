import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { verifyP256Signature, verifyChallengeToken } from '@/lib/crypto/p256';
import { deviceStore } from '@/lib/auth/deviceStore';
import { getJwtSecret } from '@/lib/auth/session';
import { UserRole, UserStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      email, 
      adminId, 
      deviceId, 
      challengeId, 
      challengeToken, 
      signature, 
      walletAddress, 
      authType,
      region 
    } = body;

    const isMetaMaskAuth = Boolean(walletAddress || authType === 'METAMASK');

    // =========================================================================
    // MODEL A: ORGANIZATION ADMINISTRATOR (METAMASK AUTHENTICATION)
    // =========================================================================
    if (isMetaMaskAuth) {
      const cleanWallet = String(walletAddress || '').trim().toLowerCase();
      if (!cleanWallet || !challengeId || !signature) {
        return NextResponse.json(
          { error: 'Missing required credentials (walletAddress, challengeId, and signature required for Admin authentication)' },
          { status: 400 }
        );
      }

      // 1. Retrieve challenge from persistent store
      const storedChallenge = deviceStore.getChallenge(challengeId);
      if (!storedChallenge) {
        return NextResponse.json(
          { error: 'Authentication challenge expired or invalid. Please request a new challenge.' },
          { status: 400 }
        );
      }

      if (storedChallenge.consumed) {
        deviceStore.recordAuditEvent({
          eventType: 'TOKEN_REPLAY_ATTEMPT',
          description: `Security Alert: Attempted replay of already consumed challenge ${challengeId} for wallet ${cleanWallet}`,
          severity: 'CRITICAL',
        });
        return NextResponse.json(
          { error: 'Challenge has already been consumed (replay attack prevented). Please request a new challenge.' },
          { status: 400 }
        );
      }

      if (new Date(storedChallenge.expiresAt).getTime() < Date.now()) {
        return NextResponse.json(
          { error: 'Challenge expired. Please request a new challenge.' },
          { status: 400 }
        );
      }

      // 2. Cryptographic proof of wallet ownership: Recover signer via EIP-191 personal_sign
      let recoveredSigner: string;
      try {
        recoveredSigner = ethers.verifyMessage(storedChallenge.message, signature).toLowerCase();
      } catch (err) {
        deviceStore.recordAuditEvent({
          eventType: 'ADMIN_LOGIN_FAILURE',
          description: `Admin authentication failed: Malformed cryptographic signature for wallet ${cleanWallet}`,
          severity: 'WARNING',
        });
        return NextResponse.json(
          { error: 'Malformed or invalid cryptographic wallet signature.' },
          { status: 401 }
        );
      }

      // Verify recovered signer matches the claimed wallet
      if (recoveredSigner !== cleanWallet) {
        deviceStore.recordAuditEvent({
          eventType: 'ADMIN_LOGIN_FAILURE',
          description: `Admin authentication failed: Claimed wallet ${cleanWallet} does not match signature signer ${recoveredSigner}`,
          severity: 'CRITICAL',
        });
        return NextResponse.json(
          { error: 'Wallet signature mismatch. Cryptographic proof failed.' },
          { status: 401 }
        );
      }

      // 3. Authoritative verification: Must match the registered Organization Admin wallet
      const registeredAdminWallet = deviceStore.getAdminWallet().toLowerCase();
      if (recoveredSigner !== registeredAdminWallet) {
        deviceStore.recordAuditEvent({
          eventType: 'ADMIN_LOGIN_FAILURE',
          description: `ACCESS DENIED: Unauthorized wallet ${recoveredSigner} attempted Administrator login. Registered admin wallet is ${registeredAdminWallet}`,
          severity: 'CRITICAL',
        });
        return NextResponse.json(
          { error: 'ACCESS DENIED: Wallet address is not authorized as the Organization Administrator.' },
          { status: 403 }
        );
      }

      // 4. Resolve Admin User Record
      const adminUser = deviceStore.getUserById(deviceStore.systemSettings.root_admin_id || 'usr_admin_001') || 
                        deviceStore.getUserByEmail('admin@securemax.mil') || 
                        Array.from(deviceStore.users.values()).find(u => u.role === UserRole.ADMIN);

      if (!adminUser) {
        return NextResponse.json(
          { error: 'System error: Organization Administrator identity record not found. Bootstrap required.' },
          { status: 500 }
        );
      }

      if (adminUser.status !== UserStatus.ACTIVE) {
        return NextResponse.json(
          { error: `Administrator account is ${adminUser.status}. Access prohibited.` },
          { status: 403 }
        );
      }

      if (deviceStore.systemSettings.admin_locked) {
        deviceStore.recordAdminLogin({
          adminId: adminUser.id,
          deviceId: 'metamask_' + recoveredSigner.slice(2, 10),
          success: false,
          reason: 'ADMIN_ACCOUNT_LOCKED',
        });
        return NextResponse.json(
          { error: 'ACCESS DENIED: Administrator account is locked. Emergency recovery ceremony required.' },
          { status: 403 }
        );
      }

      // 5. Atomically consume the challenge
      const consumption = deviceStore.consumeChallenge(challengeId);
      if (!consumption.valid) {
        return NextResponse.json(
          { error: consumption.error || 'Failed to consume challenge' },
          { status: 400 }
        );
      }

      // 6. Establish Secure Admin Session
      const session = deviceStore.createSession({
        userId: adminUser.id,
        deviceId: 'dev_admin_metamask',
        authLevel: 'METAMASK',
        durationHours: 8,
      });

      deviceStore.recordLogin({
        userId: adminUser.id,
        userName: adminUser.name,
        userEmail: adminUser.email,
        role: UserRole.ADMIN,
        deviceName: `MetaMask (${recoveredSigner.slice(0, 6)}...${recoveredSigner.slice(-4)})`,
        status: 'SUCCESS',
      });

      deviceStore.recordAdminLogin({
        adminId: adminUser.id,
        deviceId: 'dev_admin_metamask',
        success: true,
        region,
      });

      deviceStore.recordAuditEvent({
        eventType: 'ADMIN_LOGIN_SUCCESS',
        description: `Organization Administrator authenticated successfully via MetaMask (${recoveredSigner})`,
        targetId: session.session_id,
        userEmail: adminUser.email,
        userName: adminUser.name,
        severity: 'INFO',
      });

      // 7. Issue SecureMAX 8-Hour Session Token (LEVEL_3 assurance)
      const jwtSecret = getJwtSecret();
      const sessionToken = await new SignJWT({
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: UserRole.ADMIN,
        did: adminUser.did,
        deviceId: 'dev_admin_metamask',
        deviceName: `MetaMask (${recoveredSigner.slice(0, 6)}...${recoveredSigner.slice(-4)})`,
        walletAddress: recoveredSigner,
        sessionId: session.session_id,
        assuranceLevel: 'LEVEL_3',
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
        assuranceLevel: 'LEVEL_3',
        authModel: 'METAMASK',
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: UserRole.ADMIN,
          did: adminUser.did,
          walletAddress: recoveredSigner,
        },
      });
    }

    // =========================================================================
    // MODEL B: NORMAL USERS (ENROLLED P-256 CRYPTOGRAPHIC CREDENTIAL)
    // =========================================================================
    const identifier = String(email || adminId || body.userId || '').trim();

    if (!identifier || (!challengeId && !challengeToken) || !signature) {
      return NextResponse.json(
        { error: 'Missing required credentials (email/userId, challengeId, and cryptographic signature required)' },
        { status: 400 }
      );
    }

    // 1. Retrieve and validate the challenge from persistent store
    let challengeMessage: string | null = null;

    if (challengeId) {
      const storedChallenge = deviceStore.getChallenge(challengeId);
      if (!storedChallenge) {
        return NextResponse.json(
          { error: 'Cryptographic challenge expired or invalid. Please request a new challenge.' },
          { status: 400 }
        );
      }

      if (storedChallenge.consumed) {
        deviceStore.recordAuditEvent({
          eventType: 'TOKEN_REPLAY_ATTEMPT',
          description: `Security Alert: Attempted replay of challenge ${challengeId} for user ${identifier}`,
          severity: 'CRITICAL',
        });
        return NextResponse.json(
          { error: 'Challenge has already been consumed (replay attack prevented). Please request a new challenge.' },
          { status: 400 }
        );
      }

      if (new Date(storedChallenge.expiresAt).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Challenge expired. Please request a new challenge.' }, { status: 400 });
      }

      challengeMessage = storedChallenge.message;
    } else if (challengeToken) {
      const tokenVerification = verifyChallengeToken(challengeToken);
      if (tokenVerification.valid && tokenVerification.data) {
        challengeMessage = tokenVerification.data.message;
        if (new Date(tokenVerification.data.expiresAt).getTime() < Date.now()) {
          return NextResponse.json({ error: 'Challenge token expired. Please request a new challenge.' }, { status: 400 });
        }
      }
    }

    if (!challengeMessage) {
      return NextResponse.json(
        { error: 'Cryptographic challenge expired or invalid. Please request a new challenge.' },
        { status: 400 }
      );
    }

    // 2. Resolve User from Authoritative Database
    const user = deviceStore.getUserByEmailOrId(identifier);
    if (!user) {
      return NextResponse.json({ error: 'Authentication failed. Please check your credentials.' }, { status: 401 });
    }

    if (user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({ error: `User account is ${user.status}. Access prohibited.` }, { status: 403 });
    }

    // Normal users cannot use standard P-256 login to access ADMIN role
    if (user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Organization Administrator must authenticate using MetaMask wallet signature.' },
        { status: 403 }
      );
    }

    // 3. Resolve Device & Enforce Enrollment Binding (NEVER enroll or replace key during login!)
    const userDevices = deviceStore.getDevicesForUser(user.id);
    let device = null;

    if (deviceId) {
      device = userDevices.find(d => d.id === deviceId) || null;
    } else if (userDevices.length === 1 && userDevices[0].status === 'ACTIVE') {
      device = userDevices[0];
    }

    if (!device) {
      return NextResponse.json(
        { error: 'Device not enrolled. Please complete device enrollment using an authorized code.' },
        { status: 403 }
      );
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
      if (challengeId) {
        deviceStore.consumeChallenge(challengeId);
      }
      deviceStore.recordAuditEvent({
        eventType: 'USER_LOGIN_FAILURE',
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

    // 5. Atomically consume challenge
    if (challengeId) {
      deviceStore.consumeChallenge(challengeId);
    }

    // 6. Establish Stateful Zero-Trust Session
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

    deviceStore.recordAuditEvent({
      eventType: 'USER_LOGIN_SUCCESS',
      description: `Zero-trust authentication successful for ${user.name} (${user.role}) via ${device.device_name}`,
      targetId: session.session_id,
      userEmail: user.email,
      userName: user.name,
      severity: 'INFO',
    });

    // 7. Issue SecureMAX 8-Hour Session Token (LEVEL_2 assurance)
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
      assuranceLevel: 'LEVEL_2',
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
      assuranceLevel: 'LEVEL_2',
      authModel: 'P256',
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
