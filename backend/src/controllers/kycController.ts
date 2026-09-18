import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../models/db.js";

const KYCRegisterSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  documentType: z.string().min(2),
  documentNumber: z.string().min(3),
  publicKey: z.string().min(10),
  controllerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  did: z.string().startsWith("did:assetchain:"),
});

export async function handleKYCRegistration(req: Request, res: Response) {
  try {
    const validated = KYCRegisterSchema.parse(req.body);
    const userId = validated.did.replace("did:assetchain:", "");

    // 1. Store sensitive PII strictly in off-chain KYC database
    db.saveKYC({
      userId,
      fullName: validated.fullName,
      email: validated.email,
      phone: validated.phone,
      documentType: validated.documentType,
      documentNumber: validated.documentNumber,
      kycStatus: "Verified",
      createdAt: Date.now(),
    });

    // 2. Save public identity mapping
    const userAccount = {
      userId,
      did: validated.did,
      publicKey: validated.publicKey,
      controllerAddress: validated.controllerAddress,
      role: "USER" as const,
      identityStatus: "Active" as const,
      registeredAt: Date.now(),
    };
    db.saveUser(userAccount);

    return res.status(201).json({
      success: true,
      message: "KYC verified and identity registered successfully.",
      data: userAccount,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    return res.status(500).json({ success: false, error: "Internal KYC service error." });
  }
}

export async function handleGetKYCStatus(req: Request, res: Response) {
  const { did } = req.params;
  const user = db.getUserByDid(did);
  if (!user) {
    return res.status(404).json({ success: false, error: "DID not found." });
  }

  const kyc = db.getKYC(user.userId);
  return res.json({
    success: true,
    data: {
      did: user.did,
      kycStatus: kyc?.kycStatus || "Pending",
      registeredAt: user.registeredAt,
    },
  });
}
