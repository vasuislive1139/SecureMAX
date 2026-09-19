import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
vi.mock('server-only', () => ({}));
import { POST as authLogin } from '../../src/app/api/auth/login/route';
import { POST as authChallenge } from '../../src/app/api/auth/challenge/route';
import { POST as demoLogin } from '../../src/app/api/auth/demo-login/route';
import { cookies } from 'next/headers';
import { deviceStore } from '../../src/lib/auth/deviceStore';

// Mock Next.js next/headers cookies
vi.mock('next/headers', () => {
  const store = new Map();
  return {
    cookies: vi.fn(() => ({
      get: vi.fn((key) => store.get(key)),
      set: vi.fn((key, val) => store.set(key, { value: val })),
      delete: vi.fn((key) => store.delete(key)),
      _store: store
    }))
  };
});

describe('SecureMAX P-256 Authentication & Zero-Trust Session Tests', () => {
  beforeAll(() => {
    deviceStore.seedTestDataForTesting();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const cookieStore = cookies() as any;
    cookieStore._store.clear();
  });

  it('SHOULD ISSUE CHALLENGE: High-entropy cryptographic challenge generated for user', async () => {
    const req = new Request('http://localhost/api/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@securemax.mil' }),
    });

    const res = await authChallenge(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.challengeId).toBeDefined();

    // Verify challenge is recorded in store
    const stored = deviceStore.challengeCache.get(body.challengeId);
    expect(stored).toBeDefined();
    expect(stored?.identifier).toBe('admin@securemax.mil');
  });

  it('SHOULD REJECT LOGIN: Missing credentials rejected with 400 Bad Request', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vasu@securemax.mil' }),
    });

    const res = await authLogin(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required credentials');
  });

  it('SHOULD REJECT LOGIN: Unregistered email returns 404 Not Found', async () => {
    // Generate valid challenge first
    const chalId = 'chal_' + Math.random().toString(36).substring(7);
    deviceStore.challengeCache.set(chalId, {
      challengeId: chalId,
      userId: 'stranger@evil.com',
      challenge: 'randomchallenge',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'stranger@evil.com',
        challengeId: chalId,
        signature: 'fake-sig',
      }),
    });

    const res = await authLogin(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('User not registered in SecureMAX system');
  });

  it('SHOULD AUTHENTICATE: Demo fast login establishes valid session for USER, ADMIN, and AUDITOR', async () => {
    const cookieStore = cookies() as any;

    // 1. Admin login
    const adminReq = new Request('http://localhost/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    const adminRes = await demoLogin(adminReq);
    expect(adminRes.status).toBe(200);
    const adminBody = await adminRes.json();
    expect(adminBody.success).toBe(true);
    expect(adminBody.user.role).toBe('ADMIN');
    expect(adminBody.user.email).toBe('admin@securemax.mil');

    // 2. Auditor login
    const auditorReq = new Request('http://localhost/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'AUDITOR' }),
    });
    const auditorRes = await demoLogin(auditorReq);
    expect(auditorRes.status).toBe(200);
    const auditorBody = await auditorRes.json();
    expect(auditorBody.success).toBe(true);
    expect(auditorBody.user.role).toBe('AUDITOR');
    expect(auditorBody.user.email).toBe('auditor@securemax.mil');

    // 3. User login
    const userReq = new Request('http://localhost/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'USER' }),
    });
    const userRes = await demoLogin(userReq);
    expect(userRes.status).toBe(200);
    const userBody = await userRes.json();
    expect(userBody.success).toBe(true);
    expect(userBody.user.role).toBe('USER');
    expect(userBody.user.email).toBe('vasu@securemax.mil');
  });
});
