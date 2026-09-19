import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { supabaseAdmin } from '@/lib/db/client';

export async function POST() {
  try {
    const session = await getVerifiedSession().catch(() => null);
    
    if (session) {
      if (session.sessionId) {
        await deviceStore.invalidateSession(session.sessionId, session.userId);
      }

      await deviceStore.recordAuditEvent({
        eventType: 'USER_LOGOUT',
        description: `User ${session.name || session.email || session.userId} logged out`,
        targetId: session.sessionId,
        userName: session.name,
        userEmail: session.email,
        performedBy: session.name || session.email,
        severity: 'INFO',
      });
      try {
        await supabaseAdmin
          .from('access_sessions')
          .update({ status: 'REVOKED' })
          .eq('id', session.sessionId);
      } catch (dbErr) {
        // Fallback gracefully when Supabase is offline
      }
    }

    cookies().delete('securemesh_session');
    
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    cookies().delete('securemesh_session');
    return NextResponse.json({ success: true });
  }
}
