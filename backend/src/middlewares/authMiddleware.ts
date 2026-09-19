import { Request, Response, NextFunction } from "express";
import { verifySessionToken } from "../services/cryptoService.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    did: string;
    role: string;
    controllerAddress: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing or invalid authorization token" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifySessionToken(token);

  if (!decoded) {
    return res.status(401).json({ success: false, error: "Invalid or expired session token" });
  }

  req.user = decoded;
  next();
}
