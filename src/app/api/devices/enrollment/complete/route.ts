import { NextResponse } from 'next/server';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      enrollmentCode, 
      deviceName, 
      publicKey, 
      deviceId,
      deviceType,
      os,
      browser,
      browserVersion,
      model,
      region,
      credentialId,
      credentialType
    } = body;

    if (!enrollmentCode || !publicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: enrollmentCode and publicKey are mandatory' },
        { status: 400 }
      );
    }

    // Consume enrollment capability and create Device Passport
    let result: { passport: any; user: any };
    try {
      result = deviceStore.consumeEnrollmentCapability(enrollmentCode, {
        deviceName: deviceName || 'Enrolled Device',
        deviceType,
        os,
        browser,
        browserVersion,
        model,
        region,
        publicKey,
        credentialId,
        credentialType: credentialType || 'WebAuthn',
        customDeviceId: deviceId,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Invalid or expired enrollment code' }, { status: 400 });
    }

    const { passport, user } = result;

    // Create active session for the newly registered device
    const session = deviceStore.createSession({
      userId: user.id,
      deviceId: passport.device_id,
      position: passport.position,
      authLevel: 'PASSKEY',
      durationHours: 8,
    });

    return NextResponse.json({
      success: true,
      message: `Device "${passport.device_name}" successfully linked to SecureMAX identity`,
      passport,
      device: {
        id: passport.device_id,
        name: passport.device_name,
        status: passport.status,
        risk_state: passport.risk_state,
        registration_region: passport.registration_region,
      },
      session: {
        id: session.session_id,
        expiresAt: session.expires_at,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        did: user.did,
        role: user.role,
        position: passport.position,
      },
    });
  } catch (error: any) {
    console.error('[Enrollment Complete Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete device enrollment' }, { status: 500 });
  }
}
