import React, { useState, useEffect } from "react";
import { Users, PlusCircle, ArrowRightLeft, Shield, CheckCircle2, RefreshCw } from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { AlertBanner } from "../components/AlertBanner";
import { Modal } from "../components/Modal";
import { getAllMockUsers, updateMockUserRole } from "../services/auth/authService";
import { fetchAllAssets, mintAsset, allocateAsset } from "../services/assets/assetService";
import { AssetRecord, UserIdentity, UserRole } from "../types";
import { formatAddress, formatDID } from "../utils/formatters";

export const AdminDashboardPage: React.FC = () => {
  const [users, setUsers] = useState<UserIdentity[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Mint Asset Modal State
  const [isMintOpen, setIsMintOpen] = useState(false);
  const [mintForm, setMintForm] = useState({
    assetId: "AST-HW-2026-0004",
    assetType: "HARDWARE_SECURITY_MODULE",
    assetReference: "ipfs://QmDigestExample998811",
    metadataURI: "https://assets.securemax.org/ast-4.json",
    recipientDid: "did:assetchain:usr-admin01",
    recipientAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  });

  // Allocate Asset Modal State
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);
  const [targetUserDid, setTargetUserDid] = useState<string>("");

  const refreshData = async () => {
    setLoading(true);
    setUsers(getAllMockUsers());
    const asts = await fetchAllAssets();
    setAssets(asts);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleRoleChange = async (did: string, newRole: UserRole) => {
    updateMockUserRole(did, newRole);
    setMessage({ type: "success", text: `Role for ${did} updated to ${newRole}` });
    refreshData();
  };

  const handleMintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await mintAsset(
      mintForm.assetId,
      mintForm.assetType,
      mintForm.assetReference,
      mintForm.metadataURI,
      mintForm.recipientAddress,
      mintForm.recipientDid
    );

    if (res.success) {
      setMessage({ type: "success", text: `Asset ${mintForm.assetId} successfully minted on-chain!` });
      setIsMintOpen(false);
      refreshData();
    } else {
      setMessage({ type: "error", text: res.error || "Minting failed" });
    }
    setLoading(false);
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find((u) => u.did === targetUserDid);
    if (!targetUser) {
      setMessage({ type: "error", text: "Target user DID not found." });
      return;
    }

    setLoading(true);
    const res = await allocateAsset(selectedTokenId, targetUser.controllerAddress, targetUser.did);
    if (res.success) {
      setMessage({ type: "success", text: `Token #${selectedTokenId} successfully allocated to ${targetUser.did}` });
      setIsAllocateOpen(false);
      refreshData();
    } else {
      setMessage({ type: "error", text: res.error || "Allocation failed" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Administrator Control Vault</h1>
          <p className="text-xs text-slate-400">
            System governance, on-chain identity management, RBAC assignment, and asset lifecycle control.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMintOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Mint Asset NFT
          </button>
          <button
            onClick={() => setIsAllocateOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            Allocate Asset
          </button>
          <button
            onClick={refreshData}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && <AlertBanner type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      {/* Section 1: User & Identity Registry Table */}
      <Card title="Decentralized Identity & RBAC Management" subtitle="Verified identities and on-chain role assignments">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">User DID</th>
                <th className="pb-3 font-semibold">Controller Address</th>
                <th className="pb-3 font-semibold">KYC Status</th>
                <th className="pb-3 font-semibold">Identity Status</th>
                <th className="pb-3 font-semibold">Current Role</th>
                <th className="pb-3 font-semibold text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {users.map((u) => (
                <tr key={u.did} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 font-medium text-emerald-400">{formatDID(u.did)}</td>
                  <td className="py-3 text-slate-400">{formatAddress(u.controllerAddress)}</td>
                  <td className="py-3 font-sans">
                    <StatusBadge status={u.kycStatus} />
                  </td>
                  <td className="py-3 font-sans">
                    <StatusBadge status={u.identityStatus} />
                  </td>
                  <td className="py-3 font-sans">
                    <StatusBadge status={u.role} />
                  </td>
                  <td className="py-3 text-right font-sans">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.did, e.target.value as UserRole)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="USER">USER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="AUDITOR">AUDITOR</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 2: Organization Assets Table */}
      <Card title="All Organizational Asset NFTs" subtitle="Current inventory, custody records, and lifecycle statuses">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Token ID</th>
                <th className="pb-3 font-semibold">Asset Code</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Current Custodian DID</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {assets.map((a) => (
                <tr key={a.tokenId} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 text-emerald-400">#{a.tokenId}</td>
                  <td className="py-3 text-white font-medium">{a.assetId}</td>
                  <td className="py-3 text-slate-400">{a.assetType}</td>
                  <td className="py-3 text-slate-300">{formatDID(a.ownerDid)}</td>
                  <td className="py-3 font-sans">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mint Asset Modal */}
      <Modal isOpen={isMintOpen} onClose={() => setIsMintOpen(false)} title="Mint New Organizational Asset NFT">
        <form onSubmit={handleMintSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Organizational Asset Code *</label>
            <input
              type="text"
              required
              value={mintForm.assetId}
              onChange={(e) => setMintForm({ ...mintForm, assetId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Asset Classification *</label>
            <input
              type="text"
              required
              value={mintForm.assetType}
              onChange={(e) => setMintForm({ ...mintForm, assetType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Off-Chain Specs Digest / Reference</label>
            <input
              type="text"
              value={mintForm.assetReference}
              onChange={(e) => setMintForm({ ...mintForm, assetReference: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Metadata URI</label>
            <input
              type="text"
              value={mintForm.metadataURI}
              onChange={(e) => setMintForm({ ...mintForm, metadataURI: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Initial Recipient DID</label>
            <input
              type="text"
              value={mintForm.recipientDid}
              onChange={(e) => setMintForm({ ...mintForm, recipientDid: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
          >
            {loading ? "Minting on Blockchain..." : "Confirm & Mint ERC-721 Token"}
          </button>
        </form>
      </Modal>

      {/* Allocate Asset Modal */}
      <Modal isOpen={isAllocateOpen} onClose={() => setIsAllocateOpen(false)} title="Allocate Asset to Custodian DID">
        <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Select Asset Token</label>
            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              {assets.map((a) => (
                <option key={a.tokenId} value={a.tokenId}>
                  Token #{a.tokenId} - {a.assetId} ({a.assetType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Assign to User DID</label>
            <select
              value={targetUserDid}
              onChange={(e) => setTargetUserDid(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px]"
            >
              <option value="">Select a verified user...</option>
              {users.map((u) => (
                <option key={u.did} value={u.did}>
                  {u.did} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !targetUserDid}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition"
          >
            {loading ? "Allocating..." : "Authorize Allocation"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
