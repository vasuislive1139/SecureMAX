import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId parameter' }, { status: 400 });
    }

    deviceStore.revokeDevice(session.userId, deviceId);
    return NextResponse.json({ success: true, message: `Device ${deviceId} revoked successfully` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to revoke device' }, { status: 400 });
  }
}
