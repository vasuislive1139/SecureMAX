import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getVerifiedSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/db/client';

export async function POST() {
  try {
    const session = await getVerifiedSession().catch(() => null);
    
    if (session) {
      try {
        await supabaseAdmin
          .from('access_sessions')
          .update({ status: 'REVOKED' })
          .eq('id', session.sessionId);
      } catch (dbErr) {
        // Ignore offline database errors
      }
    }

    cookies().delete('securemesh_session');
    
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    cookies().delete('securemesh_session');
    return NextResponse.json({ success: true });
  }
}
