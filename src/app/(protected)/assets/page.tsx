'use client';

import * as React from 'react';
import { 
  HardDrive, 
  Lock, 
  Unlock, 
  FileText, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Key, 
  AlertTriangle,
  FileCode,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface AssetRecord {
  id: string;
  code: string;
  name: string;
  classification: string;
  status: string;
  description: string;
  canRead: boolean;
  canDecrypt: boolean;
}

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<AssetRecord[]>([]);
  const [userRole, setUserRole] = React.useState<string>('USER');
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Decryption Modal / Drawer State
  const [decryptingAssetId, setDecryptingAssetId] = React.useState<string | null>(null);
  const [decryptResult, setDecryptResult] = React.useState<any | null>(null);
  const [decryptError, setDecryptError] = React.useState<string | null>(null);
  const [decryptLoading, setDecryptLoading] = React.useState(false);

  const fetchAssets = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assets/list');
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets || []);
        setUserRole(data.role || 'USER');
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDecryptAsset = async (asset: AssetRecord) => {
    setDecryptingAssetId(asset.id);
    setDecryptLoading(true);
    setDecryptResult(null);
    setDecryptError(null);

    try {
      const res = await fetch('/api/assets/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Decryption authorization rejected');
      }

      setDecryptResult(data);
    } catch (err: any) {
      setDecryptError(err.message || 'Decryption Failed');
    } finally {
      setDecryptLoading(false);
    }
  };

  const handleAdminToggleRevoke = async (assetId: string, currentCanDecrypt: boolean) => {
    const action = currentCanDecrypt ? 'revoke' : 'assign';
    try {
      const res = await fetch('/api/assets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          assetId,
          targetUserId: 'usr_vasu_002',
          canRead: true,
          canDecrypt: !currentCanDecrypt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to update assignment');
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 uppercase flex items-center gap-3">
            <HardDrive className="h-7 w-7 text-cyan-400" />
            My Secure Data Vault
          </h2>
          <p className="text-xs text-zinc-500 font-mono tracking-widest mt-1 uppercase">
            Cryptographically Enforced Access • AES-256-GCM Hardware KMS Decryption
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-mono text-xs px-3 py-1">
            {isAdmin ? 'ADMINISTRATIVE OVERVIEW' : 'USER COMPARTMENT: VASU'}
          </Badge>
        </div>
      </div>

      {/* SEARCH AND FILTER */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            type="search"
            placeholder="Filter assigned assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#0a0a0c] border-zinc-800 font-mono text-xs text-zinc-200"
          />
        </div>
      </div>

      {/* ASSET CARDS / TABLE */}
      <div className="space-y-4">
        <div className="rounded-lg border border-zinc-800 bg-[#0a0a0c] overflow-hidden">
          <table className="w-full text-sm text-left font-mono">
            <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3.5 font-bold">Asset Code &amp; Name</th>
                <th className="px-6 py-3.5 font-bold">Classification</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Assigned</th>
                <th className="px-6 py-3.5 font-bold">Permissions</th>
                <th className="px-6 py-3.5 font-bold text-right">Cryptographic Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredAssets.map((asset) => {
                return (
                  <tr key={asset.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-3 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-bold text-zinc-100">{asset.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{asset.code}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge className={`text-[10px] font-mono border ${
                        asset.classification === 'HIGH' ? 'border-red-500/40 text-red-400 bg-red-950/20' :
                        asset.classification === 'RESTRICTED' ? 'border-amber-500/40 text-amber-400 bg-amber-950/20' :
                        'border-cyan-500/40 text-cyan-400 bg-cyan-950/20'
                      }`}>
                        {asset.classification}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                        ● {asset.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-emerald-400 flex items-center gap-1.5 pt-5">
                      <CheckCircle2 className="w-4 h-4" />
                      YES
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Read</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {asset.canDecrypt ? (
                            <span className="text-cyan-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                              Decrypt Authorized
                            </span>
                          ) : (
                            <span className="text-zinc-500 flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-zinc-600" />
                              No Decrypt Permission
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleDecryptAsset(asset)}
                        className={`text-xs font-mono font-bold ${
                          asset.canDecrypt 
                            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40'
                            : 'bg-zinc-800/40 text-zinc-500 hover:bg-zinc-800/60 border border-zinc-700/50'
                        }`}
                      >
                        {asset.canDecrypt ? (
                          <>
                            <Unlock className="h-3.5 w-3.5 mr-1.5" />
                            Decrypt &amp; View
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            Attempt Decrypt
                          </>
                        )}
                      </Button>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAdminToggleRevoke(asset.id, asset.canDecrypt)}
                          className="text-amber-400 hover:bg-amber-500/10 text-[10px] font-mono"
                        >
                          {asset.canDecrypt ? 'Revoke User' : 'Grant Decrypt'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* DECRYPTION INSPECTOR & KMS DECRYPT MODAL / RESULT     */}
      {/* ---------------------------------------------------- */}
      {decryptingAssetId && (
        <Card className="border-cyan-500/40 bg-[#0a0a0c] shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                10-Step Cryptographic Authorization Inspector
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400 font-mono">
                Asset ID: {decryptingAssetId} • Hardware Isolated Execution
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDecryptingAssetId(null); setDecryptResult(null); setDecryptError(null); }}
              className="text-zinc-400 hover:text-zinc-100 text-xs font-mono"
            >
              Close
            </Button>
          </CardHeader>

          <CardContent className="pt-6 pb-6 space-y-6">
            
            {/* Loading Indicator */}
            {decryptLoading && (
              <div className="p-8 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <div className="text-xs font-mono text-cyan-300">
                  Executing 10-Step Cryptographic Authorization Pipeline...
                </div>
              </div>
            )}

            {/* FAILURE / ACCESS DENIED STATE */}
            {decryptError && (
              <div className="p-5 bg-red-950/30 border border-red-500/40 rounded-lg space-y-3">
                <div className="flex items-center gap-3 text-red-400 font-bold text-sm">
                  <ShieldAlert className="w-6 h-6" />
                  ACCESS DENIED: KMS &amp; RBAC Authorization Rejection
                </div>
                <p className="text-xs font-mono text-zinc-300 leading-relaxed bg-black/60 p-3 rounded border border-red-900/50">
                  {decryptError}
                </p>
                <div className="text-[10px] font-mono text-zinc-500">
                  Security Invariant Enforced: Unauthorized parties never receive or derive Data Encryption Keys (DEKs). Audit event recorded.
                </div>
              </div>
            )}

            {/* SUCCESS STATE — DECRYPTED PAYLOAD */}
            {decryptResult && (
              <div className="space-y-4">
                
                {/* 10-Step Pipeline Verified Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                  <div className="bg-zinc-900/80 p-2.5 rounded border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 1. P-256 Auth OK
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 2. Session Active
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 3. Identity Active
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 4. KMS Authorized
                  </div>
                </div>

                {/* Decrypted Text Viewer */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      Decrypted Plaintext Payload (AES-256-GCM Unwrapped):
                    </span>
                    <span className="text-emerald-400 text-[10px]">INTEGRITY AUTHENTICATED</span>
                  </div>
                  <div className="p-4 bg-black/80 rounded-md border border-cyan-500/30 text-xs font-mono text-cyan-200 leading-relaxed select-all">
                    {decryptResult.decryptedData}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-zinc-500 flex justify-between items-center pt-2 border-t border-zinc-900">
                  <span>Authorized By: {decryptResult.authorizedBy}</span>
                  <span>Decrypted At: {new Date(decryptResult.decryptedAt).toLocaleTimeString()}</span>
                </div>

              </div>
            )}

          </CardContent>
        </Card>
      )}

    </div>
  );
}
