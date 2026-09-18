import { ethers } from "ethers";

export interface ClientKeyPair {
  privateKey: string;
  publicKey: string;
  address: string;
  did: string;
}

/**
 * Generates a fresh cryptographic keypair on the client side.
 * Raw private keys NEVER leave the browser or get transmitted to the backend.
 */
export function generateClientKeyPair(): ClientKeyPair {
  // Generate 32 bytes of secure client-side randomness
  const entropy = ethers.randomBytes(32);
  const privateKey = ethers.hexlify(entropy);
  const wallet = new ethers.Wallet(privateKey);
  const rawId = wallet.address.slice(2, 10).toLowerCase();
  const did = `did:assetchain:usr-${rawId}`;

  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.signingKey.publicKey,
    address: wallet.address,
    did: did,
  };
}

/**
 * Signs an authentication challenge string locally using the client's private key.
 */
export async function signChallenge(challengeText: string, privateKey: string): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signMessage(challengeText);
}

/**
 * Verifies a signature against an expected address.
 */
export function verifySignatureLocally(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
