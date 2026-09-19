import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { targetUserId, positionId, durationMinutes, maxDevices, targetDeviceType } = body;

    let enrollForUserId = session.userId;

    if (session.role === UserRole.ADMIN) {
      if (!targetUserId) {
        return NextResponse.json(
          { error: 'Admin account is strictly hardware-bound. To enroll a device, select an authorized team member.' },
          { status: 400 }
        );
      }
      enrollForUserId = targetUserId;
    }

    const targetUser = deviceStore.getUserById(enrollForUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user record not found' }, { status: 404 });
    }

    if (targetUser.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Root administrator accounts cannot have secondary devices.' },
        { status: 403 }
      );
    }

    const { enrollment, plaintextCode } = deviceStore.createEnrollmentCapability({
      userId: targetUser.id,
      positionId,
      durationMinutes: durationMinutes ? Number(durationMinutes) : 15,
      maxDevices: maxDevices ? Number(maxDevices) : 1,
      callerUserId: session.userId,
      targetDeviceType,
    });

    const origin = req.headers.get('origin') || 'https://securemax.app';
    const enrollmentUrl = `${origin}/register-device?code=${plaintextCode}`;

    const qrPayload = JSON.stringify({
      app: 'SecureMAX',
      action: 'enroll_device',
      code: plaintextCode,
      url: enrollmentUrl,
      userId: targetUser.id,
      userEmail: targetUser.email,
      position: enrollment.position_name,
      expiresAt: enrollment.expires_at,
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        code: plaintextCode,
        expiresAt: enrollment.expires_at,
        qrPayload,
        enrollmentUrl,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        positionName: enrollment.position_name,
        durationMinutes: enrollment.duration_minutes,
      },
    });
  } catch (error: any) {
    console.error('[Enrollment Start Error]:', error);
    return NextResponse.json({ error: error.message || 'Unauthorized or failed to initiate enrollment' }, { status: 400 });
  }
}
