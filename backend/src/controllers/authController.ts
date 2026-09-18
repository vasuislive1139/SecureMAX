import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../models/db.js";
import { generateChallengeText, verifyClientSignature, issueSessionToken } from "../services/cryptoService.js";

const ChallengeRequestSchema = z.object({
  did: z.string().startsWith("did:assetchain:"),
});

const VerifySignatureSchema = z.object({
  did: z.string().startsWith("did:assetchain:"),
  challengeId: z.string(),
  signature: z.string().min(10),
});

export async function handleRequestChallenge(req: Request, res: Response) {
  try {
    const { did } = ChallengeRequestSchema.parse(req.body);
    const user = db.getUserByDid(did);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "DID not registered in system. Please complete KYC registration first.",
      });
    }

    if (user.identityStatus !== "Active") {
      return res.status(403).json({
        success: false,
        error: `Identity status is ${user.identityStatus}. Authentication rejected.`,
      });
    }

    const { challengeId, challengeText, expiresAt } = generateChallengeText(did);

    db.saveChallenge({
      challengeId,
      did,
      controllerAddress: user.controllerAddress,
      challengeText,
      expiresAt,
      used: false,
    });

    return res.json({
      success: true,
      data: {
        challengeId,
        challengeText,
        expiresAt,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || "Invalid challenge request" });
  }
}

export async function handleVerifySignature(req: Request, res: Response) {
  try {
    const { did, challengeId, signature } = VerifySignatureSchema.parse(req.body);
    const challenge = db.getChallenge(challengeId);

    if (!challenge) {
      return res.status(400).json({ success: false, error: "Challenge not found or invalid." });
    }

    if (challenge.used) {
      return res.status(400).json({ success: false, error: "Challenge has already been used (Replay attack blocked)." });
    }

    if (Date.now() > challenge.expiresAt) {
      return res.status(400).json({ success: false, error: "Challenge has expired." });
    }

    if (challenge.did.toLowerCase() !== did.toLowerCase()) {
      return res.status(400).json({ success: false, error: "DID mismatch for this challenge." });
    }

    // Verify cryptographic signature against controller address
    const isValid = verifyClientSignature(challenge.challengeText, signature, challenge.controllerAddress);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Invalid cryptographic signature. Authentication failed." });
    }

    db.markChallengeUsed(challengeId);

    const user = db.getUserByDid(did)!;
    const token = issueSessionToken(user.did, user.role, user.controllerAddress);

    return res.json({
      success: true,
      message: "Cryptographic authentication successful.",
      data: {
        user,
        token,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || "Verification failed." });
  }
}
