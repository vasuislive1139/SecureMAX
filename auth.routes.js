import { Router } from 'express';
import { config } from '../config.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireSession } from '../middleware/auth.js';
import { registerSchema, challengeSchema, verifySchema, rotateKeySchema } from './schemas.js';
import * as users from '../services/userService.js';
import * as identities from '../services/identityService.js';
import * as challenges from '../services/challengeService.js';
import * as sessions from '../services/sessionService.js';
import * as audit from '../services/auditService.js';
import { verifySignature } from '../crypto/verify.js';
import { newChallengeId, newNonce, buildChallengeMessage } from '../crypto/challengeMessage.js';
import { unauthorized, notFound } from '../utils/errors.js';
import { hashIp } from '../utils/logger.js';

export const authRouter = Router();

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.auth.cookieSecure,
  sameSite: 'strict',
  path: '/',
  maxAge: config.auth.sessionTtlSeconds * 1000,
});

/* -------------------------------------------------------------------------
 * POST /api/auth/register
 * Creates the account and registers the user's PUBLIC key. The client must
 * have generated the key pair locally; the private key is never transmitted.
 * ---------------------------------------------------------------------- */
authRouter.post(
  '/register',
  rateLimit({ windowSeconds: 3600, max: 10 }),
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { email, name, phone, algorithm, publicKey } = req.body;
      const { user, identity } = await users.registerUser({ email, name, phone, algorithm, publicKey });

      await audit.recordEvent({
        userId: user.user_id,
        eventType: 'auth.register',
        success: true,
        ipHash: hashIp(req.ip),
        detail: { algorithm: identity.algorithm },
      });

      res.status(201).json({
        userId: user.user_id,
        email: user.email,
        kycStatus: user.kyc_status,
        identity: { algorithm: identity.algorithm, publicKeyFingerprint: identity.fingerprint },
        createdAt: user.created_at,
      });
    } catch (err) {
      next(err);
    }
  },
);

/* -------------------------------------------------------------------------
 * POST /api/auth/challenge
 * Returns the exact message to sign. For unknown accounts a syntactically
 * valid but unstored challenge is returned, so this endpoint cannot be used
 * to enumerate registered users. Such a challenge always fails at /verify.
 * ---------------------------------------------------------------------- */
authRouter.post(
  '/challenge',
  rateLimit({ windowSeconds: 60, max: 20 }),
  validate(challengeSchema),
  async (req, res, next) => {
    try {
      const { userId, email } = req.body;
      const user = userId ? await users.findById(userId) : await users.findByEmail(email);
      const identity = user ? await identities.getActiveIdentity(user.user_id) : null;

      if (!user || !identity) {
        const decoyId = newChallengeId();
        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt.getTime() + config.auth.challengeTtlSeconds * 1000);
        return res.status(200).json({
          userId: userId ?? decoyId,
          challengeId: decoyId,
          algorithm: 'ECDSA_P256_SHA256',
          message: buildChallengeMessage({
            userId: userId ?? decoyId,
            challengeId: decoyId,
            nonce: newNonce(),
            issuedAt,
            expiresAt,
          }),
          expiresAt,
        });
      }

      const challenge = await challenges.issueChallenge(user.user_id);
      await audit.recordEvent({
        userId: user.user_id,
        eventType: 'auth.challenge_issued',
        success: true,
        ipHash: hashIp(req.ip),
      });

      return res.status(200).json({
        userId: user.user_id,
        challengeId: challenge.challengeId,
        algorithm: identity.algorithm,
        message: challenge.message,
        expiresAt: challenge.expiresAt,
      });
    } catch (err) {
      return next(err);
    }
  },
);

/* -------------------------------------------------------------------------
 * POST /api/auth/verify
 * Consumes the challenge, verifies the signature against the registered
 * public key, and issues a session.
 *
 * Every failure path returns the same 401 AUTH_FAILED response. Callers
 * cannot tell an unknown user from an expired challenge, a reused challenge
 * or a bad signature; the precise reason is recorded in the audit log only.
 * ---------------------------------------------------------------------- */
authRouter.post(
  '/verify',
  rateLimit({ windowSeconds: 60, max: 20 }),
  validate(verifySchema),
  async (req, res, next) => {
    const { userId, challengeId, signature } = req.body;
    const ipHash = hashIp(req.ip);

    const fail = async (reason) => {
      await audit.recordEvent({
        userId,
        eventType: 'auth.login',
        success: false,
        ipHash,
        detail: { reason },
      });
      throw unauthorized('AUTH_FAILED', 'Authentication failed');
    };

    try {
      const lockedUntil = await users.isLocked(userId);
      if (lockedUntil) {
        await audit.recordEvent({
          userId, eventType: 'auth.login', success: false, ipHash, detail: { reason: 'locked' },
        });
        return res.status(429).json({
          error: { code: 'AUTH_TEMPORARILY_LOCKED', message: 'Too many failed attempts' },
        });
      }

      // Single-use consumption happens first: one guess per issued challenge.
      const consumed = await challenges.consumeChallenge(challengeId, userId);
      if (!consumed) {
        await users.registerFailedAttempt(userId, {
          maxAttempts: config.auth.maxFailedVerifications,
          lockoutSeconds: config.auth.lockoutSeconds,
        });
        return await fail('challenge_invalid_expired_or_reused');
      }

      const identity = await identities.getActiveIdentity(userId);
      if (!identity) return await fail('no_active_identity');

      const ok = verifySignature({
        algorithm: identity.algorithm,
        publicKey: identity.public_key,
        message: consumed.challenge,
        signature,
      });

      if (!ok) {
        await users.registerFailedAttempt(userId, {
          maxAttempts: config.auth.maxFailedVerifications,
          lockoutSeconds: config.auth.lockoutSeconds,
        });
        return await fail('invalid_signature');
      }

      await users.clearFailedAttempts(userId);
      const user = await users.requireUser(userId);
      const session = await sessions.createSession(userId);

      await audit.recordEvent({
        userId,
        eventType: 'auth.login',
        success: true,
        ipHash,
        detail: { algorithm: identity.algorithm },
      });

      res.cookie(config.auth.cookieName, session.token, cookieOptions());
      return res.status(200).json({
        token: session.token,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        user: {
          userId: user.user_id,
          email: user.email,
          name: user.name,
          kycStatus: user.kyc_status,
          publicKeyFingerprint: identity.public_key_fingerprint,
        },
      });
    } catch (err) {
      return next(err);
    }
  },
);

/* ---------------------------- GET /api/auth/me -------------------------- */
authRouter.get('/me', requireSession, async (req, res, next) => {
  try {
    const identity = await identities.getActiveIdentity(req.session.userId);
    res.json({
      userId: req.session.userId,
      email: req.session.email,
      name: req.session.name,
      kycStatus: req.session.kycStatus,
      isReviewer: req.session.isReviewer,
      identity: identity
        ? { algorithm: identity.algorithm, publicKeyFingerprint: identity.public_key_fingerprint }
        : null,
      session: { sessionId: req.session.sessionId, expiresAt: req.session.expiresAt },
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------- POST /api/auth/logout ----------------------- */
authRouter.post('/logout', requireSession, async (req, res, next) => {
  try {
    await sessions.revokeSession(req.session.sessionId);
    await audit.recordEvent({
      userId: req.session.userId, eventType: 'auth.logout', success: true, ipHash: hashIp(req.ip),
    });
    res.clearCookie(config.auth.cookieName, { path: '/' });
    res.status(200).json({ loggedOut: true });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * POST /api/auth/identity/rotate
 * Replaces the active public key. Authorised by the current session, which
 * was itself obtained with a signature from the outgoing key. All sessions
 * are revoked afterwards so the user re-authenticates with the new key.
 * ---------------------------------------------------------------------- */
authRouter.post(
  '/identity/rotate',
  requireSession,
  rateLimit({ windowSeconds: 3600, max: 5, keyFn: (req) => req.session.userId }),
  validate(rotateKeySchema),
  async (req, res, next) => {
    try {
      const identity = await identities.rotateIdentity(req.session.userId, req.body);
      await sessions.revokeAllForUser(req.session.userId);
      await audit.recordEvent({
        userId: req.session.userId,
        eventType: 'auth.key_rotated',
        success: true,
        ipHash: hashIp(req.ip),
        detail: { algorithm: identity.algorithm },
      });
      res.clearCookie(config.auth.cookieName, { path: '/' });
      res.status(200).json({
        algorithm: identity.algorithm,
        publicKeyFingerprint: identity.public_key_fingerprint,
        createdAt: identity.created_at,
        note: 'All sessions revoked. Re-authenticate with the new key.',
      });
    } catch (err) {
      next(err);
    }
  },
);

/* -------------------------------------------------------------------------
 * GET /api/auth/identity/:userId
 * Public verification material for a user. Public keys, fingerprints and KYC
 * status are not secrets; this endpoint exists so Person 5 can display an
 * identity and Person 2 can cross-check a key before DID registration.
 * ---------------------------------------------------------------------- */
authRouter.get('/identity/:userId', async (req, res, next) => {
  try {
    const user = await users.findById(req.params.userId).catch(() => null);
    const identity = user ? await identities.getActiveIdentity(user.user_id) : null;
    if (!user || !identity) throw notFound('IDENTITY_NOT_FOUND', 'No active identity for this user');
    res.json({
      userId: user.user_id,
      algorithm: identity.algorithm,
      publicKey: identity.public_key,
      publicKeyFingerprint: identity.public_key_fingerprint,
      kycStatus: user.kyc_status,
    });
  } catch (err) {
    next(err);
  }
});
