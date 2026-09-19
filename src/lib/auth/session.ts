import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { UserRole } from '@/types';

export interface SessionPayload {
  userId: string;
  email?: string;
  name?: string;
  role: UserRole;
  did?: string;
  deviceId?: string;
  deviceName?: string;
  sessionId: string;
}

export async function getVerifiedSession(): Promise<SessionPayload> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('securemesh_session')?.value;
  
  if (!sessionToken) {
    throw new Error('Unauthorized: No active SecureMAX session');
  }

  try {
    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');
    const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    throw new Error('Invalid or expired SecureMAX session token');
  }
}
