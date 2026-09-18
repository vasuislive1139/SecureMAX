import { describe, it, expect } from "vitest";
import request from "supertest";
import { ethers } from "ethers";
import { app } from "../app.js";

describe("SecureMAX Backend - Person 1 (KYC & Auth)", () => {
  // Test wallet / keypair generated locally (simulating client)
  const wallet = ethers.Wallet.createRandom();
  const testDid = `did:assetchain:usr-${wallet.address.slice(2, 10).toLowerCase()}`;

  // =========================================================================
  // 1. KYC REGISTRATION (OFF-CHAIN)
  // =========================================================================
  it("should register user KYC off-chain without exposing private key", async () => {
    const kycPayload = {
      fullName: "Bob Jones",
      email: "bob@securemax.org",
      phone: "+919876543210",
      documentType: "NATIONAL_ID",
      documentNumber: "GOV-778899",
      publicKey: wallet.signingKey.publicKey,
      controllerAddress: wallet.address,
      did: testDid,
    };

    const res = await request(app).post("/api/kyc/register").send(kycPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.did).toBe(testDid);
    expect(res.body.data.controllerAddress).toBe(wallet.address);
  });

  // =========================================================================
  // 2. CRYPTOGRAPHIC CHALLENGE GENERATION
  // =========================================================================
  it("should generate an ephemeral challenge for registered DID", async () => {
    const res = await request(app).post("/api/auth/challenge").send({ did: testDid });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.challengeId).toBeDefined();
    expect(res.body.data.challengeText).toContain(testDid);
    expect(res.body.data.expiresAt).toBeGreaterThan(Date.now());
  });

  it("should reject challenge request for unregistered DID", async () => {
    const res = await request(app)
      .post("/api/auth/challenge")
      .send({ did: "did:assetchain:usr-unknown999" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // =========================================================================
  // 3. CRYPTOGRAPHIC SIGNATURE VERIFICATION
  // =========================================================================
  it("should authenticate user with valid cryptographic signature", async () => {
    // 1. Request challenge
    const chRes = await request(app).post("/api/auth/challenge").send({ did: testDid });
    const { challengeId, challengeText } = chRes.body.data;

    // 2. Client signs challenge locally
    const signature = await wallet.signMessage(challengeText);

    // 3. Submit signature
    const verifyRes = await request(app).post("/api/auth/verify").send({
      did: testDid,
      challengeId,
      signature,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.token).toBeDefined();
    expect(verifyRes.body.data.user.did).toBe(testDid);

    // 4. Test protected endpoint with token
    const token = verifyRes.body.data.token;
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.did).toBe(testDid);
  });

  // =========================================================================
  // 4. SECURITY NEGATIVE TESTS (REPLAY / INVALID SIGNATURE)
  // =========================================================================
  it("should reject invalid signature from different private key", async () => {
    const chRes = await request(app).post("/api/auth/challenge").send({ did: testDid });
    const { challengeId, challengeText } = chRes.body.data;

    // Sign with WRONG wallet
    const attackerWallet = ethers.Wallet.createRandom();
    const badSignature = await attackerWallet.signMessage(challengeText);

    const verifyRes = await request(app).post("/api/auth/verify").send({
      did: testDid,
      challengeId,
      signature: badSignature,
    });

    expect(verifyRes.status).toBe(401);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.error).toContain("Invalid cryptographic signature");
  });

  it("should reject replayed challenge submission (Replay Attack Protection)", async () => {
    const chRes = await request(app).post("/api/auth/challenge").send({ did: testDid });
    const { challengeId, challengeText } = chRes.body.data;

    const signature = await wallet.signMessage(challengeText);

    // First use: success
    await request(app).post("/api/auth/verify").send({
      did: testDid,
      challengeId,
      signature,
    });

    // Second use: replay blocked
    const replayRes = await request(app).post("/api/auth/verify").send({
      did: testDid,
      challengeId,
      signature,
    });

    expect(replayRes.status).toBe(400);
    expect(replayRes.body.success).toBe(false);
    expect(replayRes.body.error).toContain("already been used");
  });
});
