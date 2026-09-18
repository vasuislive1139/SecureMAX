import { Router } from "express";
import { handleRequestChallenge, handleVerifySignature } from "../controllers/authController.js";
import { requireAuth, AuthenticatedRequest } from "../middlewares/authMiddleware.js";

export const authRouter = Router();

authRouter.post("/challenge", handleRequestChallenge);
authRouter.post("/verify", handleVerifySignature);

authRouter.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});
