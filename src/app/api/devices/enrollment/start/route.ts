import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { targetUserId } = body;

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

    const enrollment = deviceStore.createEnrollment(targetUser.id, session.userId);

    const qrPayload = JSON.stringify({
      app: 'SecureMAX',
      action: 'enroll_device',
      code: enrollment.code,
      userId: targetUser.id,
      userEmail: targetUser.email,
      expiresAt: enrollment.expires_at,
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        code: enrollment.code,
        expiresAt: enrollment.expires_at,
        qrPayload,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
      },
    });
  } catch (error: any) {
    console.error('[Enrollment Start Error]:', error);
    return NextResponse.json({ error: error.message || 'Unauthorized or failed to initiate enrollment' }, { status: 400 });
  }
}
