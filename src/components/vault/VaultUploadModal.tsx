'use client';

import * as React from 'react';
import { 
  X, 
  UploadCloud, 
  Lock, 
  ShieldCheck, 
  Cpu, 
  Loader2, 
  FileText, 
  AlertCircle,
  User,
  Users,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface VaultUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  defaultFolder?: string;
  availableUsers?: UserOption[];
  userDefaultPolicy?: 'PRIVATE' | 'ORGANIZATION';
}

export function VaultUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  defaultFolder = 'Projects',
  availableUsers = [],
  userDefaultPolicy = 'PRIVATE',
}: VaultUploadModalProps) {
  const [name, setName] = React.useState('');
  const [folder, setFolder] = React.useState(defaultFolder);
  const [classification, setClassification] = React.useState('CONFIDENTIAL');
  const [description, setDescription] = React.useState('');
  const [content, setContent] = React.useState('');
  
  // Access scope selection
  const [shareScope, setShareScope] = React.useState<'PRIVATE' | 'SPECIFIC_USER' | 'ALL_PEOPLE'>(
    userDefaultPolicy === 'ORGANIZATION' ? 'ALL_PEOPLE' : 'PRIVATE'
  );
  const [targetUserId, setTargetUserId] = React.useState('');
  const [saveDefaultPolicy, setSaveDefaultPolicy] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultFolder && defaultFolder !== 'ALL') {
      setFolder(defaultFolder);
    }
  }, [defaultFolder]);

  React.useEffect(() => {
    if (availableUsers.length > 0 && !targetUserId) {
      setTargetUserId(availableUsers[0].id);
    }
  }, [availableUsers, targetUserId]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('File name is required');
      return;
    }
    if (!content.trim()) {
      setError('File content payload cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          folder,
          classification,
          description: description.trim(),
          plaintext: content,
          shareScope,
          targetUserId: shareScope === 'SPECIFIC_USER' ? targetUserId : undefined,
          saveDefaultPolicy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload and encrypt asset');
      }

      // Reset form
      setName('');
      setDescription('');
      setContent('');
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-2xl p-6 space-y-5 font-mono text-xs max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 uppercase">
                Upload &amp; Encrypt Vault Asset
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                AES-256-GCM Envelope Encryption • Custom Access Control
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

        {/* Cryptographic Pipeline Flow Indicator */}
        <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Zero-Trust Encryption Pipeline
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
            <div className="p-1 rounded bg-black/40 border border-cyan-500/20 text-cyan-300">
              1. Generate DEK
            </div>
            <div className="p-1 rounded bg-black/40 border border-cyan-500/20 text-cyan-300">
              2. AES-256 Encrypt
            </div>
            <div className="p-1 rounded bg-black/40 border border-cyan-500/20 text-cyan-300">
              3. Wrap with KEK
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {error && (
            <div className="p-2.5 bg-rose-950/30 border border-rose-500/40 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick File Select */}
          <div className="space-y-1">
            <label className="text-zinc-400 text-[10px] uppercase tracking-wider">Select Local File (Optional)</label>
            <input
              type="file"
              onChange={handleFileUpload}
              className="w-full text-[11px] text-zinc-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
            />
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-zinc-400 text-[10px] uppercase tracking-wider">Asset / File Name *</label>
            <Input
              type="text"
              placeholder="e.g. Tactical_Comms_Spec.pdf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/60 border-zinc-800 text-zinc-200 text-xs font-mono"
              required
            />
          </div>

          {/* Folder and Classification Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-zinc-400 text-[10px] uppercase tracking-wider">Folder</label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full h-8 rounded-md bg-black/60 border border-zinc-800 text-zinc-200 text-xs font-mono px-2.5 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value="Projects">Projects</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Engineering">Engineering</option>
                <option value="Legal">Legal</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 text-[10px] uppercase tracking-wider">Classification</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full h-8 rounded-md bg-black/60 border border-zinc-800 text-zinc-200 text-xs font-mono px-2.5 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="RESTRICTED">RESTRICTED</option>
              </select>
            </div>
          </div>

          {/* ACCESS SCOPE SELECTION (Private to Me vs Specific Person vs All People) */}
          <div className="space-y-1.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
            <label className="text-zinc-300 text-[11px] font-bold uppercase tracking-wider block">
              Who Can Access This Data?
            </label>

            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => setShareScope('PRIVATE')}
                className={`p-2 rounded border text-center transition-all ${
                  shareScope === 'PRIVATE'
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'border-zinc-800 bg-black/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <User className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                <span>Private to Me</span>
              </button>

              <button
                type="button"
                onClick={() => setShareScope('SPECIFIC_USER')}
                className={`p-2 rounded border text-center transition-all ${
                  shareScope === 'SPECIFIC_USER'
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'border-zinc-800 bg-black/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                <span>Specific Person</span>
              </button>

              <button
                type="button"
                onClick={() => setShareScope('ALL_PEOPLE')}
                className={`p-2 rounded border text-center transition-all ${
                  shareScope === 'ALL_PEOPLE'
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'border-zinc-800 bg-black/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                <span>All People</span>
              </button>
            </div>

            {/* If Specific Person chosen, render user selector */}
            {shareScope === 'SPECIFIC_USER' && (
              <div className="pt-2 space-y-1">
                <label className="text-zinc-400 text-[10px] uppercase">Select User to Share With</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full h-8 rounded-md bg-black/60 border border-zinc-800 text-zinc-200 text-xs font-mono px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — {u.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Save as default setting checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveDefaultPolicy}
                  onChange={(e) => setSaveDefaultPolicy(e.target.checked)}
                  className="rounded border-zinc-700 bg-black/50 text-cyan-500 focus:ring-0"
                />
                <span>Set as my default access policy for future uploads</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-zinc-400 text-[10px] uppercase tracking-wider">Description</label>
            <Input
              type="text"
              placeholder="Brief description of data asset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/60 border-zinc-800 text-zinc-200 text-xs font-mono"
            />
          </div>

          {/* Plaintext / Content Payload */}
          <div className="space-y-1">
            <label className="text-zinc-400 text-[10px] uppercase tracking-wider">Plaintext Payload to Encrypt *</label>
            <textarea
              rows={3}
              placeholder="Enter plaintext or confidential data to be envelope-encrypted with AES-256-GCM..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-md bg-black/60 border border-zinc-800 p-2 text-zinc-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
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
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Encrypt &amp; Store
                </>
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
