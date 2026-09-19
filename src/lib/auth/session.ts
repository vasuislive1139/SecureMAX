import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { UserRole, UserStatus } from '@/types';
import { deviceStore } from './deviceStore';

export interface SessionPayload {
  userId: string;
  email?: string;
  name?: string;
  role: UserRole;
  did?: string;
  deviceId?: string;
  deviceName?: string;
  sessionId: string;
  assuranceLevel?: string;
}

/**
 * Returns the cryptographically validated JWT secret.
 * Enforces strong production secrets and prevents insecure fallback leaks.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.includes('fallback-secret') || secret.length < 32)) {
    throw new Error('CRITICAL SECURITY ERROR: Strong JWT_SECRET (>= 32 chars) must be configured in production environment.');
  }
  return new TextEncoder().encode(secret || 'securemax-dev-jwt-secret-minimum-32-chars-long-secure-padding');
}

/**
 * Validates the current HTTP session cookie AND enforces live zero-trust state checks:
 * 1. Cryptographic JWT signature and expiration verification
 * 2. Live session status (not revoked, not expired in database/store)
 * 3. Live user account status (ACTIVE; suspended/revoked users denied immediately)
 * 4. Live device status (ACTIVE; suspended/revoked devices denied immediately)
 */
export async function getVerifiedSession(): Promise<SessionPayload> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('securemesh_session')?.value;
  
  if (!sessionToken) {
    throw new Error('Unauthorized: No active SecureMAX session');
  }

  let payload: SessionPayload;
  try {
    const { payload: jwtPayload } = await jwtVerify(sessionToken, getJwtSecret());
    payload = jwtPayload as unknown as SessionPayload;
  } catch (error) {
    throw new Error('Unauthorized: Invalid or expired SecureMAX session token');
  }

  // Zero-Trust Live Session Verification
  if (payload.sessionId) {
    const storedSession = deviceStore.getSession(payload.sessionId);
    if (storedSession) {
      if (storedSession.status !== 'ACTIVE') {
        throw new Error('Unauthorized: Session has been REVOKED');
      }
      if (new Date(storedSession.expires_at).getTime() < Date.now()) {
        throw new Error('Unauthorized: Session has EXPIRED');
      }
    }
  }

  // Zero-Trust Live User Account Verification
  if (payload.userId) {
    const user = deviceStore.getUserById(payload.userId);
    if (user && user.status !== UserStatus.ACTIVE) {
      throw new Error(`Unauthorized: User account is ${user.status}. Access denied.`);
    }
  }

  // Zero-Trust Live Device Verification
  if (payload.deviceId) {
    const device = deviceStore.getDeviceById(payload.deviceId);
    if (device && device.status !== 'ACTIVE') {
      throw new Error(`Unauthorized: Device credential is ${device.status}. Access denied.`);
    }
  }

  return payload;
}
