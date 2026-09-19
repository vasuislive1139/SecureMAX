import { NextResponse } from 'next/server';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  
  if (require('@/lib/auth/deviceStore').deviceStore) {
    await require('@/lib/auth/deviceStore').deviceStore.loadFromCloud();
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { code } = body;

    if (!code) {
      
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json(
        { error: 'Enrollment code is required' },
        { status: 400 }
      );
    }

    const verification = deviceStore.verifyEnrollmentCapability(code);

    if (!verification.valid || !verification.enrollment) {
      
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json(
        { error: verification.error || 'Invalid or expired enrollment code' },
        { status: 400 }
      );
    }

    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json({
      success: true,
      valid: true,
      enrollment: {
        id: verification.enrollment.id,
        positionName: verification.enrollment.position_name,
        expiresAt: verification.enrollment.expires_at,
        durationMinutes: verification.enrollment.duration_minutes,
        targetDeviceType: verification.enrollment.target_device_type,
      },
      user: verification.user ? {
        id: verification.user.id,
        name: verification.user.name,
        email: verification.user.email,
        role: verification.user.role,
        position: verification.user.position || verification.enrollment.position_name,
      } : null,
      position: verification.position ? {
        id: verification.position.id,
        name: verification.position.name,
        privilege_level: verification.position.privilege_level,
        description: verification.position.description,
      } : null,
    });
  } catch (error: any) {
    console.error('[Verify Enrollment Error]:', error);
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json(
      { error: error.message || 'Failed to verify enrollment code' },
      { status: 500 }
    );
  }
}
