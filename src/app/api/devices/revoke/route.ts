import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  if (require('@/lib/auth/deviceStore').deviceStore?.readyPromise) {
    await require('@/lib/auth/deviceStore').deviceStore.readyPromise;
  }
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { deviceId } = body;

    if (!deviceId) {
      
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json({ error: 'Missing deviceId parameter' }, { status: 400 });
    }

    deviceStore.revokeDevice(session.userId, deviceId);
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json({ success: true, message: `Device ${deviceId} revoked successfully` });
  } catch (error: any) {
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json({ error: error.message || 'Failed to revoke device' }, { status: 400 });
  }
}
