import React, { useState } from "react";
import { Key, ShieldCheck, UserCheck, AlertTriangle, ArrowRight, Copy, Check } from "lucide-react";
import { Card } from "../components/Card";
import { AlertBanner } from "../components/AlertBanner";
import { generateClientKeyPair, ClientKeyPair } from "../utils/crypto";
import { registerKYC } from "../services/auth/authService";
import { KYCData } from "../types";

interface RegisterKYCPageProps {
  onSuccess: () => void;
}

export const RegisterKYCPage: React.FC<RegisterKYCPageProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<KYCData>({
    fullName: "",
    email: "",
    phone: "",
    documentType: "NATIONAL_ID",
    documentNumber: "",
    status: "Pending",
  });

  const [keyPair, setKeyPair] = useState<ClientKeyPair | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleGenerateKeys = () => {
    const keys = generateClientKeyPair();
    setKeyPair(keys);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!keyPair) {
      setError("Please generate your client-side cryptographic keypair first.");
      return;
    }

    if (!formData.fullName || !formData.email || !formData.documentNumber) {
      setError("Please fill out all required KYC fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await registerKYC(
        formData,
        keyPair.publicKey,
        keyPair.address,
        keyPair.did
      );

      if (response.success && response.data) {
        setSuccessData({
          ...response.data,
          privateKey: keyPair.privateKey,
        });
      } else {
        setError(response.error || "Registration failed.");
      }
    } catch (err: any) {
      setError(err.message || "Registration service error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Off-Chain KYC & Decentralized Identity Setup
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Verify real-world credentials off-chain and establish a zero-trust cryptographic identity on the blockchain.
        </p>
      </div>

      {error && <div className="mb-6"><AlertBanner type="error" message={error} onClose={() => setError(null)} /></div>}

      {successData ? (
        <Card title="Registration & Identity Created Successfully" className="border-emerald-500/30 bg-slate-900">
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-sm">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Zero-PII On-Chain Guarantee Verified
              </div>
              <p className="text-xs text-emerald-300/80">
                Your personal details (name, email, document) were verified and stored strictly off-chain by Person 1's KYC service. Only your public key, controller address, and DID are registered on-chain.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Issued DID:</div>
                <div className="text-emerald-400 flex items-center justify-between">
                  <span>{successData.did}</span>
                  <button onClick={() => copyToClipboard(successData.did, "did")} className="text-slate-400 hover:text-white">
                    {copiedField === "did" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Controller Address:</div>
                <div className="text-slate-300 flex items-center justify-between">
                  <span>{successData.controllerAddress}</span>
                  <button onClick={() => copyToClipboard(successData.controllerAddress, "addr")} className="text-slate-400 hover:text-white">
                    {copiedField === "addr" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 rounded-lg border border-amber-800/60">
                <div className="text-amber-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Your Client-Side Private Key (Save this for Login):
                </div>
                <div className="text-amber-200 break-all flex items-center justify-between">
                  <span>{successData.privateKey}</span>
                  <button onClick={() => copyToClipboard(successData.privateKey, "pk")} className="text-amber-400 hover:text-white ml-2">
                    {copiedField === "pk" ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onSuccess}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              Proceed to Cryptographic Login
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Off-Chain KYC Data */}
          <Card title="1. Real-World User Verification (Off-Chain)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Alice Smith"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="alice@organization.org"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Government ID Number *</label>
                <input
                  type="text"
                  required
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="GOV-ID-883921"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Client-Side Cryptographic Key Generation */}
          <Card
            title="2. Client-Side Cryptographic Key Generation"
            subtitle="Web Crypto API / Local ECDSA Keypair (No MetaMask Required)"
          >
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Architectural Rule:</span> Private keys are generated entirely in your browser and are NEVER transmitted to or stored by the backend.
              </div>

              {!keyPair ? (
                <button
                  type="button"
                  onClick={handleGenerateKeys}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium rounded-lg text-sm border border-emerald-500/30 flex items-center justify-center gap-2 transition"
                >
                  <Key className="w-4 h-4" />
                  Generate Local Cryptographic Keys
                </button>
              ) : (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-emerald-500/30">
                    <div className="text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Assigned DID Format:
                    </div>
                    <div className="text-slate-200">{keyPair.did}</div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-slate-400 mb-1">Public Key Bytes (To Be Registered On-Chain):</div>
                    <div className="text-slate-300 break-all text-[11px]">{keyPair.publicKey}</div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-slate-400 mb-1">Controller Address:</div>
                    <div className="text-slate-300">{keyPair.address}</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <button
            type="submit"
            disabled={loading || !keyPair}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            {loading ? "Registering with Off-Chain KYC Service..." : "Complete Registration & Register Identity"}
            <UserCheck className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
