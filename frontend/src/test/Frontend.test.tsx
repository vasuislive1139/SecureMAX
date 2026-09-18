import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { App } from "../App";
import { StatusBadge } from "../components/StatusBadge";
import { AlertBanner } from "../components/AlertBanner";
import { generateClientKeyPair, signChallenge, verifySignatureLocally } from "../utils/crypto";
import { verifyLogin, requestChallenge } from "../services/auth/authService";

describe("Frontend Client-Side Cryptography (Person 5)", () => {
  it("should generate a valid client-side keypair with DID format did:assetchain:*", () => {
    const keyPair = generateClientKeyPair();
    expect(keyPair.did).toMatch(/^did:assetchain:usr-[a-f0-9]+$/);
    expect(keyPair.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(keyPair.publicKey).toMatch(/^0x[a-fA-F0-9]+/);
    expect(keyPair.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should sign and verify challenge correctly", async () => {
    const keyPair = generateClientKeyPair();
    const challenge = "SecureMAX Login Nonce 123456";
    const signature = await signChallenge(challenge, keyPair.privateKey);

    expect(signature).toBeDefined();
    expect(verifySignatureLocally(challenge, signature, keyPair.address)).toBe(true);
    expect(verifySignatureLocally(challenge, signature, "0x0000000000000000000000000000000000000000")).toBe(false);
  });
});

describe("Authentication & Security Failures", () => {
  it("should reject login when given an invalid signature", async () => {
    const chRes = await requestChallenge("did:assetchain:usr-admin01");
    expect(chRes.success).toBe(true);

    const invalidSig = "0x" + "00".repeat(65);
    const loginRes = await verifyLogin("did:assetchain:usr-admin01", chRes.data!.challengeId, invalidSig);

    expect(loginRes.success).toBe(false);
    expect(loginRes.error).toMatch(/Invalid cryptographic signature/i);
  });

  it("should reject challenge request for unknown DID", async () => {
    const chRes = await requestChallenge("did:assetchain:usr-unknown999");
    expect(chRes.success).toBe(false);
    expect(chRes.error).toMatch(/DID not found/i);
  });
});

describe("Frontend UI Components & Navigation", () => {
  it("should render status badges with correct styling", () => {
    const { unmount } = render(<StatusBadge status="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    unmount();

    render(<StatusBadge status="Decommissioned" />);
    expect(screen.getByText("Decommissioned")).toBeInTheDocument();
  });

  it("should render alert banners with error and success styles", () => {
    render(<AlertBanner type="error" message="Transaction reverted by EVM" />);
    expect(screen.getByText("Transaction reverted by EVM")).toBeInTheDocument();
  });

  it("should render login screen with zero-trust indicators", () => {
    render(<App />);
    expect(screen.getByText(/Cryptographic Challenge Login/i)).toBeInTheDocument();
    expect(screen.getByText(/No MetaMask/i)).toBeInTheDocument();
  });

  it("should navigate to KYC registration and allow generating keypairs", () => {
    render(<App />);
    const registerBtn = screen.getByText(/Register \/ KYC/i);
    fireEvent.click(registerBtn);

    expect(screen.getByText(/Off-Chain KYC & Decentralized Identity Setup/i)).toBeInTheDocument();
    const genKeysBtn = screen.getByText(/Generate Local Cryptographic Keys/i);
    fireEvent.click(genKeysBtn);

    expect(screen.getByText(/Assigned DID Format:/i)).toBeInTheDocument();
    expect(screen.getByText(/did:assetchain:usr-/i)).toBeInTheDocument();
  });

  it("should execute full cryptographic login flow with preset admin profile", async () => {
    render(<App />);
    
    // Select Admin preset
    const adminPreset = screen.getByRole("button", { name: /ADMIN/i });
    fireEvent.click(adminPreset);

    // Request Challenge
    const getChallengeBtn = screen.getByRole("button", { name: /Get Challenge/i });
    fireEvent.click(getChallengeBtn);

    // Wait for challenge display
    await waitFor(() => {
      expect(screen.getByText(/Ephemeral Challenge Issued/i)).toBeInTheDocument();
    });

    // Click Sign Challenge
    const signBtn = screen.getByRole("button", { name: /Sign Challenge Locally/i });
    fireEvent.click(signBtn);

    // Wait for Submit button
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit Signature & Enter Platform/i })).toBeInTheDocument();
    });

    // Click Submit
    const submitBtn = screen.getByRole("button", { name: /Submit Signature & Enter Platform/i });
    fireEvent.click(submitBtn);

    // Verify Admin Dashboard rendered
    await waitFor(() => {
      expect(screen.getByText(/Administrator Control Vault/i)).toBeInTheDocument();
      expect(screen.getByText(/Mint Asset NFT/i)).toBeInTheDocument();
    });
  });
});
