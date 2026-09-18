import React, { useState } from "react";
import { Key, ShieldAlert, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { Card } from "../components/Card";
import { AlertBanner } from "../components/AlertBanner";
import { useAuth } from "../hooks/useAuth";
import { requestChallenge, verifyLogin, getAllMockUsers } from "../services/auth/authService";
import { signChallenge } from "../utils/crypto";
import { AuthChallenge } from "../types";

interface CryptoLoginPageProps {
  onSuccess: (role: string) => void;
}

export const CryptoLoginPage: React.FC<CryptoLoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [did, setDid] = useState("did:assetchain:usr-admin01");
  const [privateKey, setPrivateKey] = useState("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"); // Hardhat Account #0 default for testing
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const mockUsers = getAllMockUsers();

  const handleSelectPreset = (selectedDid: string) => {
    setDid(selectedDid);
    setChallenge(null);
    setSignature(null);
    setStep(1);

    if (selectedDid.includes("admin")) {
      setPrivateKey("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    } else if (selectedDid.includes("mgr")) {
      setPrivateKey("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    } else if (selectedDid.includes("aud")) {
      setPrivateKey("0x5de4111afa1a4b94908f83103eb2f9547b1015d10d642861a104990d9fbe123a");
    } else {
      setPrivateKey("");
    }
  };

  const handleRequestChallenge = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await requestChallenge(did.trim());
      if (res.success && res.data) {
        setChallenge(res.data);
        setStep(2);
      } else {
        setError(res.error || "Failed to generate challenge.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignChallenge = async () => {
    setError(null);
    if (!challenge || !privateKey) {
      setError("Please provide your local private key to sign the challenge.");
      return;
    }

    try {
      const sig = await signChallenge(challenge.challengeText, privateKey.trim());
      setSignature(sig);
      setStep(3);
    } catch (err: any) {
      setError("Cryptographic signing failed. Verify your private key format.");
    }
  };

  const handleVerifyAndLogin = async () => {
    setError(null);
    if (!challenge || !signature) {
      setError("Missing signature or challenge.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyLogin(did.trim(), challenge.challengeId, signature);
      if (res.success && res.user && res.token) {
        login(res.user, res.token, privateKey);
        onSuccess(res.user.role);
      } else {
        setError(res.error || "Authentication failed.");
      }
    } catch (err: any) {
      setError(err.message || "Verification service error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4">
          <Key className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Cryptographic Challenge Login
        </h1>
        <p className="text-xs text-slate-400">
          Zero-trust authentication using client-side cryptographic signatures (No MetaMask).
        </p>
      </div>

      {error && <div className="mb-6"><AlertBanner type="error" message={error} onClose={() => setError(null)} /></div>}

      {/* Preset Profiles Selector for Easy Testing */}
      <div className="mb-6 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="text-[11px] text-slate-400 mb-2 font-medium">Quick Demo Profiles:</div>
        <div className="grid grid-cols-3 gap-2">
          {mockUsers.map((u) => (
            <button
              key={u.did}
              type="button"
              onClick={() => handleSelectPreset(u.did)}
              className={`p-2 text-left rounded-lg border text-xs transition ${
                did === u.did
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="font-bold text-[11px]">{u.role}</div>
              <div className="font-mono text-[9px] truncate text-slate-500">{u.did.replace("did:assetchain:", "")}</div>
            </button>
          ))}
        </div>
      </div>

      <Card title="Cryptographic Login Sequence">
        <div className="space-y-5">
          {/* Step 1: DID Input & Challenge Request */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              1. Decentralized Identifier (DID)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={did}
                onChange={(e) => setDid(e.target.value)}
                placeholder="did:assetchain:usr-..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleRequestChallenge}
                disabled={loading || !did}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-400 rounded-lg transition disabled:opacity-50"
              >
                {loading && step === 1 ? "Requesting..." : "Get Challenge"}
              </button>
            </div>
          </div>

          {/* Step 2: Client-side signing */}
          {challenge && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Ephemeral Challenge Issued
                </span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {challenge.challengeId}</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-400 whitespace-pre-wrap">
                {challenge.challengeText}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Client Private Key (Local Memory Only - Never Sent to Server):
                </label>
                <input
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSignChallenge}
                className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium rounded-lg text-xs transition"
              >
                Sign Challenge Locally (WebCrypto)
              </button>
            </div>
          )}

          {/* Step 3: Signature & Submit */}
          {signature && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px]">
                <div className="text-slate-500 mb-1">Generated Cryptographic Signature:</div>
                <div className="text-emerald-400 break-all">{signature}</div>
              </div>

              <button
                type="button"
                onClick={handleVerifyAndLogin}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                {loading ? "Verifying Signature..." : "Submit Signature & Enter Platform"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
