import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function GET() {
  try {
    const session = await getVerifiedSession();
    const isAdmin = session.role === 'ADMIN';

    const devices = isAdmin 
      ? deviceStore.getAllDevices() 
      : deviceStore.getDevicesForUser(session.userId);

    const safeDevices = devices.map(d => ({
      id: d.id,
      deviceName: d.device_name,
      status: d.status,
      isAdminDevice: d.is_admin_device,
      userId: d.user_id,
      userEmail: (d as any).userEmail || session.email,
      userName: (d as any).userName || session.name,
      createdAt: d.created_at,
      lastUsedAt: d.last_used_at,
      revokedAt: d.revoked_at,
      publicKeyFingerprint: d.public_key ? `P256-${d.public_key.slice(0, 10)}...${d.public_key.slice(-8)}` : 'UNKNOWN',
    }));

    // If admin, also send registered users list for easy device assignment dropdown
    let personnelList: Array<{ id: string; name: string; email: string }> = [];
    if (isAdmin) {
      for (const u of deviceStore.users.values()) {
        if (u.role !== 'ADMIN' && !personnelList.some(p => p.id === u.id)) {
          personnelList.push({ id: u.id, name: u.name, email: u.email });
        }
      }
    }

    return NextResponse.json({
      success: true,
      devices: safeDevices,
      personnel: personnelList,
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
