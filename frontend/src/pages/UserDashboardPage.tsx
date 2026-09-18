import React, { useEffect, useState } from "react";
import { ShieldCheck, Package, ExternalLink, Key, CheckCircle, RefreshCw } from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { fetchAssetsByDid } from "../services/assets/assetService";
import { AssetRecord } from "../types";
import { formatAddress, formatDate, formatDID } from "../utils/formatters";

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssets = async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchAssetsByDid(user.did);
    setAssets(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAssets();
  }, [user?.did]);

  return (
    <div className="space-y-6">
      {/* Identity Overview Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Decentralized Identity Overview</h1>
              <StatusBadge status={user?.identityStatus || "Active"} />
              <StatusBadge status={user?.role || "USER"} />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              DID: <span className="text-emerald-400">{user?.did}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">Controller Address:</span>
              <span>{formatAddress(user?.controllerAddress || "")}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">KYC Verification:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Off-Chain Verified
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Allocated Assets & NFTs */}
      <Card
        title="My Allocated Organizational Assets & NFTs"
        subtitle="On-chain ERC-721 tokenized custody assigned to your DID"
        action={
          <button
            onClick={loadAssets}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      >
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading asset records from blockchain...</div>
        ) : assets.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-400">No assets currently allocated to your DID</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When an administrator or manager allocates an organizational asset (hardware, license, etc.) to your DID, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.tokenId}
                className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-mono text-emerald-400">Token #{asset.tokenId}</div>
                    <div className="text-sm font-semibold text-white">{asset.assetId}</div>
                  </div>
                  <StatusBadge status={asset.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 font-mono">
                  <div>
                    <span className="text-slate-600 block text-[10px]">Type:</span>
                    <span>{asset.assetType}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[10px]">Allocated Date:</span>
                    <span>{formatDate(asset.updatedAt)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                  <a
                    href={asset.metadataURI}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                  >
                    View Metadata Reference
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[10px] text-slate-500 font-mono">ERC-721 Token</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
