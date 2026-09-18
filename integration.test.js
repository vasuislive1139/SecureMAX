/**
 * End-to-end tests for the KYC + cryptographic authentication flows.
 *
 * Requires a PostgreSQL database and TEST_DATABASE_URL; the whole suite is
 * skipped otherwise so `npm test` still passes on a machine without a DB.
 *
 *   createdb identity_platform_test
 *   NODE_ENV=test npm run migrate
 *   npm test
 */
import './helpers/env.mjs';
import test, { describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { query, closePool } from '../src/db.js';
import { resetRateLimits } from '../src/middleware/rateLimit.js';
import { generateP256, signP256 } from './helpers/keys.mjs';

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const app = createApp();

async function registerUser(overrides = {}) {
  const { pair, publicKey } = await generateP256();
  const body = {
    email: `user-${Math.random().toString(36).slice(2)}@example.test`,
    name: 'Test User',
    algorithm: 'ECDSA_P256_SHA256',
    publicKey,
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { res, pair, publicKey, body };
}

/** Full happy-path login: challenge -> local signature -> session token. */
async function login(userId, pair) {
  const challenge = await request(app).post('/api/auth/challenge').send({ userId });
  const signature = await signP256(pair, challenge.body.message);
  const verified = await request(app)
    .post('/api/auth/verify')
    .send({ userId, challengeId: challenge.body.challengeId, signature });
  return { challenge, verified, token: verified.body.token };
}

describe('auth + KYC integration', { skip: enabled ? false : 'TEST_DATABASE_URL not set' }, () => {
  before(async () => {
    await query('SELECT 1 FROM users LIMIT 1'); // fails fast if migrations were not run
  });

  beforeEach(async () => {
    await query('TRUNCATE users, auth_audit_log RESTART IDENTITY CASCADE');
    resetRateLimits();
  });

  after(async () => {
    await closePool();
  });

  /* ------------------------------ registration ------------------------- */

  test('registers a user with a valid P-256 public key', async () => {
    const { res } = await registerUser();
    assert.equal(res.status, 201);
    assert.equal(res.body.kycStatus, 'PENDING');
    assert.match(res.body.identity.publicKeyFingerprint, /^sha256:[0-9a-f]{64}$/);
    assert.equal(res.body.publicKey, undefined);
  });

  test('rejects malformed email, missing name and unknown fields', async () => {
    const { publicKey } = await generateP256();
    const base = { name: 'X', algorithm: 'ECDSA_P256_SHA256', publicKey };

    assert.equal((await request(app).post('/api/auth/register').send({ ...base, email: 'nope' })).status, 400);
    assert.equal(
      (await request(app).post('/api/auth/register').send({ email: 'a@b.test', algorithm: 'ECDSA_P256_SHA256', publicKey })).status,
      400,
    );
    const extra = await request(app)
      .post('/api/auth/register')
      .send({ ...base, email: 'c@d.test', privateKey: 'should-not-be-accepted' });
    assert.equal(extra.status, 400, 'a privateKey field must be rejected outright');
  });

  test('rejects an invalid public key and a duplicate email', async () => {
    const bad = await request(app).post('/api/auth/register').send({
      email: 'bad@example.test',
      name: 'Bad Key',
      algorithm: 'ECDSA_P256_SHA256',
      publicKey: Buffer.from('not-a-key').toString('base64'),
    });
    assert.equal(bad.status, 400);

    const first = await registerUser();
    const second = await registerUser({ email: first.body.email });
    assert.equal(second.res.status, 409);
  });

  /* -------------------------------- login ------------------------------ */

  test('authenticates with a valid signature over the issued challenge', async () => {
    const { res, pair } = await registerUser();
    const { challenge, verified } = await login(res.body.userId, pair);

    assert.equal(challenge.status, 200);
    assert.match(challenge.body.message, /^did-auth-v1\n/);
    assert.ok(challenge.body.message.includes(res.body.userId), 'challenge must be bound to the user');
    assert.equal(verified.status, 200);
    assert.ok(verified.body.token);
  });

  test('rejects an invalid signature', async () => {
    const { res, pair } = await registerUser();
    const challenge = await request(app).post('/api/auth/challenge').send({ userId: res.body.userId });
    const signature = await signP256(pair, `${challenge.body.message}tampered`);

    const verified = await request(app)
      .post('/api/auth/verify')
      .send({ userId: res.body.userId, challengeId: challenge.body.challengeId, signature });

    assert.equal(verified.status, 401);
    assert.equal(verified.body.error.code, 'AUTH_FAILED');
  });

  test('rejects a signature made with a different private key', async () => {
    const victim = await registerUser();
    const attacker = await generateP256();
    const challenge = await request(app).post('/api/auth/challenge').send({ userId: victim.res.body.userId });
    const signature = await signP256(attacker.pair, challenge.body.message);

    const verified = await request(app)
      .post('/api/auth/verify')
      .send({ userId: victim.res.body.userId, challengeId: challenge.body.challengeId, signature });

    assert.equal(verified.status, 401);
  });

  test('rejects a reused challenge (replay)', async () => {
    const { res, pair } = await registerUser();
    const challenge = await request(app).post('/api/auth/challenge').send({ userId: res.body.userId });
    const signature = await signP256(pair, challenge.body.message);
    const payload = { userId: res.body.userId, challengeId: challenge.body.challengeId, signature };

    assert.equal((await request(app).post('/api/auth/verify').send(payload)).status, 200);
    const replay = await request(app).post('/api/auth/verify').send(payload);
    assert.equal(replay.status, 401, 'the same signature must not authenticate twice');
  });

  test('rejects an expired challenge', async () => {
    const { res, pair } = await registerUser();
    const challenge = await request(app).post('/api/auth/challenge').send({ userId: res.body.userId });
    await query(`UPDATE login_challenges SET expires_at = now() - interval '1 second' WHERE challenge_id = $1`, [
      challenge.body.challengeId,
    ]);
    const signature = await signP256(pair, challenge.body.message);

    const verified = await request(app)
      .post('/api/auth/verify')
      .send({ userId: res.body.userId, challengeId: challenge.body.challengeId, signature });

    assert.equal(verified.status, 401);
  });

  test('issuing a new challenge invalidates the previous one', async () => {
    const { res, pair } = await registerUser();
    const first = await request(app).post('/api/auth/challenge').send({ userId: res.body.userId });
    await request(app).post('/api/auth/challenge').send({ userId: res.body.userId });
    const signature = await signP256(pair, first.body.message);

    const verified = await request(app)
      .post('/api/auth/verify')
      .send({ userId: res.body.userId, challengeId: first.body.challengeId, signature });

    assert.equal(verified.status, 401);
  });

  test('does not reveal whether an account exists', async () => {
    const unknown = await request(app)
      .post('/api/auth/challenge')
      .send({ email: 'definitely-not-registered@example.test' });
    assert.equal(unknown.status, 200);
    assert.match(unknown.body.message, /^did-auth-v1\n/);
  });

  test('locks the account after repeated failures', async () => {
    const { res, pair } = await registerUser();
    let last;
    for (let i = 0; i < 6; i += 1) {
      const challenge = await request(app).post('/api/auth/challenge').send({ userId: res.body.userId });
      const signature = await signP256(pair, 'wrong message');
      last = await request(app)
        .post('/api/auth/verify')
        .send({ userId: res.body.userId, challengeId: challenge.body.challengeId, signature });
    }
    assert.equal(last.status, 429);
    assert.equal(last.body.error.code, 'AUTH_TEMPORARILY_LOCKED');
  });

  /* ------------------------------ sessions ----------------------------- */

  test('/api/auth/me requires a session and rejects forged tokens', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal(
      (await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token')).status,
      401,
    );
  });

  test('session expires and is rejected afterwards', async () => {
    const { res, pair } = await registerUser();
    const { token, verified } = await login(res.body.userId, pair);

    assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status, 200);
    await query(`UPDATE sessions SET expires_at = now() - interval '1 second' WHERE session_id = $1`, [
      verified.body.sessionId,
    ]);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status, 401);
  });

  test('logout revokes the session immediately', async () => {
    const { res, pair } = await registerUser();
    const { token } = await login(res.body.userId, pair);

    assert.equal((await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`)).status, 200);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status, 401);
  });

  /* -------------------------------- KYC -------------------------------- */

  test('submits KYC and a reviewer verifies it', async () => {
    const applicant = await registerUser();
    const reviewer = await registerUser();
    await query('UPDATE users SET is_reviewer = TRUE WHERE user_id = $1', [reviewer.res.body.userId]);

    const applicantToken = (await login(applicant.res.body.userId, applicant.pair)).token;
    const reviewerToken = (await login(reviewer.res.body.userId, reviewer.pair)).token;

    const submitted = await request(app)
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ dateOfBirth: '1998-04-12', governmentIdReference: 'DEMO-ID-0042' });
    assert.equal(submitted.status, 201);
    assert.equal(submitted.body.status, 'PENDING');

    const decided = await request(app)
      .post('/api/kyc/verify')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ userId: applicant.res.body.userId, decision: 'VERIFIED' });
    assert.equal(decided.status, 200);
    assert.equal(decided.body.kycStatus, 'VERIFIED');
  });

  test('sensitive KYC fields are encrypted at rest and never returned', async () => {
    const applicant = await registerUser();
    const token = (await login(applicant.res.body.userId, applicant.pair)).token;
    await request(app)
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ dateOfBirth: '1990-01-02', governmentIdReference: 'SECRET-ID-777' });

    const { rows } = await query('SELECT * FROM kyc_records WHERE user_id = $1', [applicant.res.body.userId]);
    const stored = JSON.stringify(rows[0]);
    assert.ok(!stored.includes('SECRET-ID-777'), 'ID reference must not be stored in plaintext');
    assert.ok(!stored.includes('1990-01-02'), 'date of birth must not be stored in plaintext');

    const status = await request(app).get('/api/kyc/status').set('Authorization', `Bearer ${token}`);
    assert.equal(status.status, 200);
    assert.ok(!JSON.stringify(status.body).includes('SECRET-ID-777'));
  });

  test('a rejected KYC decision revokes the user session', async () => {
    const applicant = await registerUser();
    const reviewer = await registerUser();
    await query('UPDATE users SET is_reviewer = TRUE WHERE user_id = $1', [reviewer.res.body.userId]);

    const applicantToken = (await login(applicant.res.body.userId, applicant.pair)).token;
    const reviewerToken = (await login(reviewer.res.body.userId, reviewer.pair)).token;

    await request(app)
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ dateOfBirth: '1991-06-06', governmentIdReference: 'DEMO-ID-9' });

    const decided = await request(app)
      .post('/api/kyc/verify')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ userId: applicant.res.body.userId, decision: 'REJECTED', reason: 'Document unreadable' });

    assert.equal(decided.body.kycStatus, 'REJECTED');
    assert.equal(
      (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${applicantToken}`)).status,
      401,
    );
  });

  test('a non-reviewer cannot decide KYC', async () => {
    const applicant = await registerUser();
    const other = await registerUser();
    const applicantToken = (await login(applicant.res.body.userId, applicant.pair)).token;
    const otherToken = (await login(other.res.body.userId, other.pair)).token;

    await request(app)
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ dateOfBirth: '1995-05-05', governmentIdReference: 'DEMO-ID-1' });

    const attempt = await request(app)
      .post('/api/kyc/verify')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ userId: applicant.res.body.userId, decision: 'VERIFIED' });

    assert.equal(attempt.status, 403);
    assert.equal(attempt.body.error.code, 'REVIEWER_REQUIRED');
  });

  test('rejects an implausible date of birth and a malformed ID reference', async () => {
    const applicant = await registerUser();
    const token = (await login(applicant.res.body.userId, applicant.pair)).token;

    for (const payload of [
      { dateOfBirth: '2020-01-01', governmentIdReference: 'DEMO-ID-1' },
      { dateOfBirth: '12/05/1990', governmentIdReference: 'DEMO-ID-1' },
      { dateOfBirth: '1990-01-01', governmentIdReference: 'x' },
    ]) {
      const res = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      assert.equal(res.status, 400);
    }
  });

  test('SQL-injection style input is treated as data, not SQL', async () => {
    const injection = "'; DROP TABLE users; --";
    const res = await request(app).post('/api/auth/challenge').send({ email: `${injection}@x.test` });
    assert.ok([200, 400].includes(res.status));
    const { rows } = await query('SELECT 1 FROM users LIMIT 1');
    assert.ok(Array.isArray(rows), 'users table must still exist');
  });

  /* ------------------------- internal interface ------------------------ */

  test('internal endpoints require the service key and expose no PII', async () => {
    const { res } = await registerUser();

    assert.equal((await request(app).get(`/api/internal/identities/${res.body.userId}`)).status, 401);

    const ok = await request(app)
      .get(`/api/internal/identities/${res.body.userId}`)
      .set('X-Internal-Api-Key', process.env.INTERNAL_API_KEY);

    assert.equal(ok.status, 200);
    assert.equal(ok.body.kycStatus, 'PENDING');
    assert.ok(ok.body.publicKey);
    const payload = JSON.stringify(ok.body);
    for (const field of ['email', 'name', 'phone', 'dateOfBirth', 'governmentIdReference']) {
      assert.ok(!payload.includes(field), `internal identity payload must not contain ${field}`);
    }
  });
});
