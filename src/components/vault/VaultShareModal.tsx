'use client';

import * as React from 'react';
import { 
  X, 
  Share2, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface VaultShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  availableUsers: UserOption[];
  onShareSuccess: () => void;
}

export function VaultShareModal({
  isOpen,
  onClose,
  assetId,
  assetName,
  availableUsers,
  onShareSuccess,
}: VaultShareModalProps) {
  const [targetUserId, setTargetUserId] = React.useState('');
  const [canRead, setCanRead] = React.useState(true);
  const [canDecrypt, setCanDecrypt] = React.useState(true);
  const [canDownload, setCanDownload] = React.useState(true);
  const [canEdit, setCanEdit] = React.useState(false);
  const [expiry, setExpiry] = React.useState<'24h' | '7d' | '30d' | 'never'>('7d');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (availableUsers.length > 0 && !targetUserId) {
      setTargetUserId(availableUsers[0].id);
    }
  }, [availableUsers, targetUserId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      setError('Please select a recipient user');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assets/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          targetUserId,
          canRead,
          canDecrypt,
          canDownload,
          canEdit,
          expiry,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to share asset');
      }

      onShareSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Sharing error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-2xl p-6 space-y-6 font-mono text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 uppercase">
                Controlled Asset Sharing
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[240px]">
                {assetName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-lg text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Target User Picker */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-[11px] uppercase tracking-wider">Select Recipient User</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full h-9 rounded-md bg-black/60 border border-zinc-800 text-zinc-200 text-xs px-3 py-1 focus:outline-none focus:border-cyan-500"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
          </div>

          {/* Granular Permissions Matrix */}
          <div className="space-y-2">
            <label className="text-zinc-400 text-[11px] uppercase tracking-wider">Grant Permissions</label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
              
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canRead}
                  onChange={(e) => setCanRead(e.target.checked)}
                  className="rounded border-zinc-700 bg-black/50 text-cyan-500 focus:ring-0"
                />
                <span>Read Metadata</span>
              </label>

              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDecrypt}
                  onChange={(e) => setCanDecrypt(e.target.checked)}
                  className="rounded border-zinc-700 bg-black/50 text-cyan-500 focus:ring-0"
                />
                <span className="text-cyan-400 font-bold">Decrypt (KMS)</span>
              </label>

              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDownload}
                  onChange={(e) => setCanDownload(e.target.checked)}
                  className="rounded border-zinc-700 bg-black/50 text-cyan-500 focus:ring-0"
                />
                <span>Download File</span>
              </label>

              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canEdit}
                  onChange={(e) => setCanEdit(e.target.checked)}
                  className="rounded border-zinc-700 bg-black/50 text-cyan-500 focus:ring-0"
                />
                <span>Edit / Manage</span>
              </label>

            </div>
          </div>

          {/* Expiring Access Selection */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Access Duration (Auto-Expiring)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: '24h', label: '24 Hours' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'never', label: 'Permanent' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExpiry(opt.id as any)}
                  className={`py-2 px-1 rounded border text-center text-[10px] transition-all ${
                    expiry === opt.id
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold'
                      : 'border-zinc-800 bg-black/40 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Cryptographic KMS clearance will automatically revoke when expiration timestamp is reached.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 text-xs font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-mono font-bold text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Granting Access...
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                  Grant Access
                </>
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
