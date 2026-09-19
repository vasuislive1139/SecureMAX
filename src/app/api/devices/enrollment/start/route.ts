import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export async function POST() {
  try {
    const session = await getVerifiedSession();
    const user = deviceStore.getUserById(session.userId);

    if (!user) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    if (session.role === UserRole.ADMIN || user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin account is strictly hardware-bound to the administrator terminal. Additional device enrollment is restricted for root security.' },
        { status: 403 }
      );
    }

    const enrollment = deviceStore.createEnrollment(session.userId);

    const qrPayload = JSON.stringify({
      app: 'SecureMAX',
      action: 'enroll_device',
      code: enrollment.code,
      userId: session.userId,
      userEmail: session.email || user.email,
      expiresAt: enrollment.expires_at,
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        code: enrollment.code,
        expiresAt: enrollment.expires_at,
        qrPayload,
      },
    });
  } catch (error: any) {
    console.error('[Enrollment Start Error]:', error);
    return NextResponse.json({ error: error.message || 'Unauthorized or failed to initiate enrollment' }, { status: 400 });
  }
}
