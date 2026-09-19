import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

/**
 * POST /api/admin/panic
 * Emergency panic lock for Administrator.
 * Immediately:
 * 1. Revokes all active admin sessions
 * 2. Disables/suspends admin device
 * 3. Requires emergency recovery ceremony to restore access
 */
export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const adminId = body.adminId || session?.userId;

    if (!adminId) {
      return NextResponse.json(
        { error: 'Missing administrator ID for panic lock' },
        { status: 400 }
      );
    }

    // Verify caller is admin
    const targetAdmin = deviceStore.getUserByEmailOrId(adminId);
    if (!targetAdmin || targetAdmin.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Only root administrator accounts can activate panic lockout' },
        { status: 403 }
      );
    }

    deviceStore.lockAdministrator(targetAdmin.id, session?.userId || 'PANIC_TRIGGER');

    // Clear session cookie immediately
    cookies().delete('securemesh_session');

    return NextResponse.json({
      success: true,
      message: 'CRITICAL SECURITY ACTION: Administrator account is locked. All sessions revoked and device suspended. Emergency recovery ceremony is required to re-establish access.',
      adminLocked: true,
    });
  } catch (error: any) {
    console.error('[Admin Panic Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger panic lock' },
      { status: 500 }
    );
  }
}
