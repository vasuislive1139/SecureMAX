import React, { useState, useEffect } from "react";
import { PackagePlus, ArrowRightLeft, Wrench, ShieldAlert, RefreshCw } from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { AlertBanner } from "../components/AlertBanner";
import { Modal } from "../components/Modal";
import { fetchAllAssets, updateAssetStatus, allocateAsset, mintAsset } from "../services/assets/assetService";
import { getAllMockUsers } from "../services/auth/authService";
import { AssetRecord, AssetStatus, UserIdentity } from "../types";
import { formatDID } from "../utils/formatters";

export const ManagerDashboardPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [users, setUsers] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Status Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<number>(1);
  const [targetStatus, setTargetStatus] = useState<AssetStatus>("InMaintenance");

  const refresh = async () => {
    setLoading(true);
    const asts = await fetchAllAssets();
    setAssets(asts);
    setUsers(getAllMockUsers());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateAssetStatus(selectedToken, targetStatus);
    if (res.success) {
      setMessage({ type: "success", text: `Token #${selectedToken} status updated to ${targetStatus}` });
      setIsStatusModalOpen(false);
      refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Status update failed" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manager Asset Vault</h1>
          <p className="text-xs text-slate-400">
            Organizational inventory allocation, maintenance locking, and custodian transfers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Wrench className="w-4 h-4" />
            Update Asset Status / Maintenance
          </button>
          <button onClick={refresh} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && <AlertBanner type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <Card title="Managed Asset Inventory" subtitle="Overview of organizational hardware and software assets">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Token ID</th>
                <th className="pb-3 font-semibold">Asset ID</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Custodian DID</th>
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

      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Change Asset Lifecycle Status">
        <form onSubmit={handleStatusChange} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Select Asset</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              {assets.map((a) => (
                <option key={a.tokenId} value={a.tokenId}>
                  Token #{a.tokenId} - {a.assetId} (Current: {a.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 mb-1">New Lifecycle Status</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as AssetStatus)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="Allocated">Allocated</option>
              <option value="InMaintenance">InMaintenance (Lock Transfers)</option>
              <option value="Registered">Registered (Return to Pool)</option>
              <option value="Decommissioned">Decommissioned (Terminal)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition"
          >
            {loading ? "Updating..." : "Update Status"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
