import { Router } from "express";
import { handleKYCRegistration, handleGetKYCStatus } from "../controllers/kycController.js";

export const kycRouter = Router();

kycRouter.post("/register", handleKYCRegistration);
kycRouter.get("/status/:did", handleGetKYCStatus);
