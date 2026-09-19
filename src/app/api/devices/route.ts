import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function GET() {
  try {
    const session = await getVerifiedSession();
    const devices = deviceStore.getDevicesForUser(session.userId);

    const safeDevices = devices.map(d => ({
      id: d.id,
      deviceName: d.device_name,
      status: d.status,
      isAdminDevice: d.is_admin_device,
      createdAt: d.created_at,
      lastUsedAt: d.last_used_at,
      revokedAt: d.revoked_at,
      publicKeyFingerprint: d.public_key ? `P256-${d.public_key.slice(0, 10)}...${d.public_key.slice(-8)}` : 'UNKNOWN',
    }));

    return NextResponse.json({
      success: true,
      devices: safeDevices,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { deviceId, action } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId parameter' }, { status: 400 });
    }

    if (action === 'revoke') {
      deviceStore.revokeDevice(session.userId, deviceId);
      return NextResponse.json({ success: true, message: `Device ${deviceId} revoked successfully` });
    }

    return NextResponse.json({ error: 'Invalid device action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update device' }, { status: 400 });
  }
}
