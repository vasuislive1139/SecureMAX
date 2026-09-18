import { safeFetch } from "../api";
import { AuthChallenge, KYCData, UserIdentity, UserRole } from "../../types";
import { verifySignatureLocally } from "../../utils/crypto";

// In-memory prototype store for offline testing / development
const mockRegisteredUsers: Map<string, UserIdentity> = new Map([
  [
    "did:assetchain:usr-admin01",
    {
      userId: "usr-admin01",
      did: "did:assetchain:usr-admin01",
      publicKey: "0x04bfcad84f346b8d91024bc68840c4",
      controllerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      role: "ADMIN",
      identityStatus: "Active",
      kycStatus: "Verified",
      registeredAt: Date.now() - 86400000,
    },
  ],
  [
    "did:assetchain:usr-mgr002",
    {
      userId: "usr-mgr002",
      did: "did:assetchain:usr-mgr002",
      publicKey: "0x04789abcefe123456789abcdef0123",
      controllerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      role: "MANAGER",
      identityStatus: "Active",
      kycStatus: "Verified",
      registeredAt: Date.now() - 43200000,
    },
  ],
  [
    "did:assetchain:usr-aud003",
    {
      userId: "usr-aud003",
      did: "did:assetchain:usr-aud003",
      publicKey: "0x0499aabbccddeeff00112233445566",
      controllerAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      role: "AUDITOR",
      identityStatus: "Active",
      kycStatus: "Verified",
      registeredAt: Date.now() - 21600000,
    },
  ],
]);

const activeChallenges: Map<string, { challenge: AuthChallenge; controllerAddress: string }> = new Map();

/**
 * Registers KYC and user identity with Person 1's backend.
 * Note: PII is kept strictly in the off-chain KYC database.
 */
export async function registerKYC(
  kyc: KYCData,
  publicKey: string,
  controllerAddress: string,
  did: string
): Promise<{ success: boolean; data?: UserIdentity; error?: string }> {
  const result = await safeFetch<UserIdentity>("/api/kyc/register", {
    method: "POST",
    body: JSON.stringify({
      ...kyc,
      publicKey,
      controllerAddress,
      did,
    }),
  });

  if (result.success && result.data) {
    return result;
  }

  // Fallback / Prototype Simulation for development
  const newUser: UserIdentity = {
    userId: did.replace("did:assetchain:", ""),
    did,
    publicKey,
    controllerAddress,
    role: "USER",
    identityStatus: "Active",
    kycStatus: "Verified",
    registeredAt: Date.now(),
  };

  mockRegisteredUsers.set(did, newUser);
  return { success: true, data: newUser };
}

/**
 * Requests an ephemeral authentication challenge from Person 1's backend.
 */
export async function requestChallenge(did: string): Promise<{ success: boolean; data?: AuthChallenge; error?: string }> {
  const result = await safeFetch<AuthChallenge>("/api/auth/challenge", {
    method: "POST",
    body: JSON.stringify({ did }),
  });

  if (result.success && result.data) {
    return result;
  }

  // Fallback / Prototype Challenge Generation
  const user = mockRegisteredUsers.get(did);
  if (!user) {
    return { success: false, error: "DID not found in registry. Please complete KYC registration first." };
  }

  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const challenge: AuthChallenge = {
    challengeId: `ch-${Date.now()}`,
    challengeText: `SecureMAX Cryptographic Login Challenge\nDID: ${did}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`,
    expiresAt: Date.now() + 300000, // 5 minutes
  };

  activeChallenges.set(challenge.challengeId, {
    challenge,
    controllerAddress: user.controllerAddress,
  });

  return { success: true, data: challenge };
}

/**
 * Submits the client-signed cryptographic challenge to Person 1's backend.
 */
export async function verifyLogin(
  did: string,
  challengeId: string,
  signature: string
): Promise<{ success: boolean; user?: UserIdentity; token?: string; error?: string }> {
  const result = await safeFetch<{ user: UserIdentity; token: string }>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ did, challengeId, signature }),
  });

  if (result.success && result.data) {
    return {
      success: true,
      user: result.data.user,
      token: result.data.token,
    };
  }

  // Fallback verification logic
  const record = activeChallenges.get(challengeId);
  if (!record) {
    return { success: false, error: "Invalid or expired challenge. Please request a new challenge." };
  }

  if (Date.now() > record.challenge.expiresAt) {
    activeChallenges.delete(challengeId);
    return { success: false, error: "Challenge expired. Please request a new challenge." };
  }

  const isValid = verifySignatureLocally(record.challenge.challengeText, signature, record.controllerAddress);
  if (!isValid) {
    return { success: false, error: "Invalid cryptographic signature. Access denied." };
  }

  activeChallenges.delete(challengeId);
  const user = mockRegisteredUsers.get(did);

  return {
    success: true,
    user: user!,
    token: `smx_jwt_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  };
}

export function getAllMockUsers(): UserIdentity[] {
  return Array.from(mockRegisteredUsers.values());
}

export function updateMockUserRole(did: string, role: UserRole): boolean {
  const user = mockRegisteredUsers.get(did);
  if (user) {
    user.role = role;
    return true;
  }
  return false;
}
