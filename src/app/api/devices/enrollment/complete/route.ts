import { NextResponse } from 'next/server';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { enrollmentCode, deviceName, publicKey, deviceId } = body;

    if (!enrollmentCode || !publicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: enrollmentCode and publicKey are mandatory' },
        { status: 400 }
      );
    }

    // 1. Consume one-time enrollment code
    let userId: string;
    try {
      userId = deviceStore.consumeEnrollment(enrollmentCode);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Invalid or expired enrollment code' }, { status: 400 });
    }

    const user = deviceStore.getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    // 2. Register Device B
    const registeredDevice = deviceStore.registerDevice({
      userId,
      deviceName: deviceName || 'Secondary Enrolled Device',
      publicKey,
      isAdminDevice: false,
      customDeviceId: deviceId,
    });

    return NextResponse.json({
      success: true,
      message: `Device "${registeredDevice.device_name}" successfully linked to SecureMAX identity`,
      device: {
        id: registeredDevice.id,
        name: registeredDevice.device_name,
        status: registeredDevice.status,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        did: user.did,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('[Enrollment Complete Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete device enrollment' }, { status: 500 });
  }
}
