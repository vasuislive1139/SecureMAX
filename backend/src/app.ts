import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/authRoutes.js";
import { kycRouter } from "./routes/kycRoutes.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/kyc", kycRouter);

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});
