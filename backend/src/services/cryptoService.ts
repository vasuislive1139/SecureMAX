import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "securemax-hackathon-prototype-secret-key-2026";

export function generateChallengeText(did: string): { challengeId: string; challengeText: string; expiresAt: number } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const expiresAt = timestamp + 300000; // 5 minutes validity
  const challengeId = `ch_${crypto.randomBytes(8).toString("hex")}`;

  const challengeText = `SecureMAX Cryptographic Login Challenge\nDID: ${did}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

  return { challengeId, challengeText, expiresAt };
}

export function verifyClientSignature(challengeText: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(challengeText, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}

export function issueSessionToken(did: string, role: string, controllerAddress: string): string {
  return jwt.sign(
    {
      did,
      role,
      controllerAddress,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

export function verifySessionToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
