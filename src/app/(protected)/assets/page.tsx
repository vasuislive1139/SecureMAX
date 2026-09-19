'use client';

import * as React from 'react';
import {
  HardDrive,
  Lock,
  Unlock,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  Image as ImageIcon,
  File,
  Search,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Key,
  AlertTriangle,
  Sparkles,
  Clock,
  Share2,
  Trash2,
  Edit3,
  Eye,
  Download,
  UploadCloud,
  History,
  User,
  Users,
  Bell,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  Plus,
  Check,
  Calendar,
  Folder,
  FolderOpen,
  Shield,
  Layers,
  Cpu,
  Laptop,
  ArrowUpRight,
  MoreVertical,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { submitAccessRequestAction, approveAccessRequestAction } from '@/app/actions/accessRequests';

export interface VersionRecord {
  version: string;
  uploaded_by: string;
  timestamp: string;
  key_version: string;
  note: string;
}

export interface AccessLogItem {
  timestamp: string;
  user_name: string;
  action: string;
  status: 'SUCCESS' | 'DENIED' | 'PENDING';
}

export interface VaultAsset {
  id: string;
  code: string;
  name: string;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'HIGH';
  status: 'AUTHORIZED' | 'PENDING' | 'RESTRICTED' | 'ACTIVE';
  description: string;
  folder: 'Projects' | 'Finance' | 'HR' | 'Engineering' | 'Legal';
  category: 'Documents' | 'Images' | 'Videos' | 'Spreadsheets' | 'PDFs' | 'ZIP archives' | 'Other files';
  fileSize: string;
  fileExtension: string;
  ownerName: string;
  ownerAddress: string;
  did: string;
  tokenId: string;
  encryptionAlgorithm: string;
  keyVersion: string;
  createdAt: string;
  lastAccessedAt: string;
  canRead: boolean;
  canDecrypt: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canShare: boolean;
  canTransfer: boolean;
  canDelete: boolean;
  expiresAt?: string | null;
  versions: VersionRecord[];
  accessHistory: AccessLogItem[];
  isArchived: boolean;
}

export interface ShareableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface VaultNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  target_id?: string;
}

const FOLDERS = ['All', 'Projects', 'Finance', 'HR', 'Engineering', 'Legal'] as const;
type FolderType = (typeof FOLDERS)[number];

const STATUS_FILTERS = ['All', 'Authorized', 'Pending', 'Restricted', 'Recently Accessed', 'Recently Uploaded'] as const;
type StatusFilterType = (typeof STATUS_FILTERS)[number];

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<VaultAsset[]>([]);
  const [userRole, setUserRole] = React.useState<string>('USER');
  const [userId, setUserId] = React.useState<string>('usr_vasu_002');
  const [userName, setUserName] = React.useState<string>('Vasu (Lead Engineer)');
  const [deviceName, setDeviceName] = React.useState<string>('Workstation Laptop A');
  const [shareableUsers, setShareableUsers] = React.useState<ShareableUser[]>([]);
  const [notifications, setNotifications] = React.useState<VaultNotification[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showActivityFeed, setShowActivityFeed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFolder, setActiveFolder] = React.useState<FolderType>('All');
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<StatusFilterType>('All');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');

  // Selected Asset for Slide-over Drawer
  const [selectedAsset, setSelectedAsset] = React.useState<VaultAsset | null>(null);

  // Secure Preview & Decryption Modal
  const [previewAsset, setPreviewAsset] = React.useState<VaultAsset | null>(null);
  const [decryptResult, setDecryptResult] = React.useState<any | null>(null);
  const [decryptError, setDecryptError] = React.useState<string | null>(null);
  const [decryptLoading, setDecryptLoading] = React.useState(false);

  // Upload Asset Modal
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [uploadName, setUploadName] = React.useState('');
  const [uploadFolder, setUploadFolder] = React.useState<'Projects' | 'Finance' | 'HR' | 'Engineering' | 'Legal'>('Projects');
  const [uploadCategory, setUploadCategory] = React.useState<'Documents' | 'Images' | 'Videos' | 'Spreadsheets' | 'PDFs' | 'ZIP archives' | 'Other files'>('Documents');
  const [uploadClassification, setUploadClassification] = React.useState<'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED'>('CONFIDENTIAL');
  const [uploadDescription, setUploadDescription] = React.useState('');
  const [uploadContent, setUploadContent] = React.useState('');
  const [uploadSubmitting, setUploadSubmitting] = React.useState(false);

  // Controlled Share Modal
  const [sharingAsset, setSharingAsset] = React.useState<VaultAsset | null>(null);
  const [shareRecipientId, setShareRecipientId] = React.useState('');
  const [sharePerms, setSharePerms] = React.useState({
    canRead: true,
    canDecrypt: true,
    canDownload: true,
    canEdit: false,
    canShare: false,
    canTransfer: false,
    canDelete: false,
  });
  const [shareExpiry, setShareExpiry] = React.useState('2026-09-25');
  const [shareSubmitting, setShareSubmitting] = React.useState(false);

  // Request Access Modal
  const [requestingAsset, setRequestingAsset] = React.useState<VaultAsset | null>(null);
  const [requestReason, setRequestReason] = React.useState('Tactical mission review and operational verification');
  const [requestSubmitting, setRequestSubmitting] = React.useState(false);

  // New Version Upload State (Inside Drawer)
  const [showVersionUpload, setShowVersionUpload] = React.useState(false);
  const [newVersionContent, setNewVersionContent] = React.useState('');
  const [newVersionNote, setNewVersionNote] = React.useState('');
  const [versionSubmitting, setVersionSubmitting] = React.useState(false);

  // General Notification Banner
  const [notice, setNotice] = React.useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 5000);
  };

  // Fetch all vault assets & status
  const fetchVault = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assets/list');
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets || []);
        setUserRole(data.role || 'USER');
        setUserId(data.userId || 'usr_vasu_002');
        if (data.userName) setUserName(data.userName);
        if (data.deviceName) setDeviceName(data.deviceName);
        if (data.shareableUsers) setShareableUsers(data.shareableUsers);
        if (data.notifications) setNotifications(data.notifications);

        // Update selected asset if currently open
        if (selectedAsset) {
          const fresh = data.assets.find((a: VaultAsset) => a.id === selectedAsset.id);
          if (fresh) setSelectedAsset(fresh);
        }
      }
    } catch (err) {
      console.error('Failed to load vault assets:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAsset]);

  React.useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  const isAdmin = userRole === 'ADMIN';

  // Stats calculation
  const totalAssetsCount = assets.length;
  const authorizedCount = assets.filter(a => a.canDecrypt || a.status === 'AUTHORIZED' || isAdmin).length;
  const pendingCount = assets.filter(a => a.status === 'PENDING' && !isAdmin).length;
  const restrictedCount = assets.filter(a => a.status === 'RESTRICTED' && !isAdmin).length;

  // Execute Decryption & Open Secure Preview (Feature 7 & 8)
  const handleDecryptAndPreview = async (asset: VaultAsset) => {
    setPreviewAsset(asset);
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
        throw new Error(data.error || 'Decryption authorization rejected by Server-Side KMS policy');
      }

      setDecryptResult(data);
      // Refresh to update access history
      fetchVault();
    } catch (err: any) {
      setDecryptError(err.message || 'Decryption Failed: Access Denied');
    } finally {
      setDecryptLoading(false);
    }
  };

  // Download Decrypted File (Feature 2)
  const handleDownloadDecrypted = (asset: VaultAsset, content: string) => {
    if (!asset.canDownload && !isAdmin) {
      alert('Download permission not granted for your current authorization token.');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Downloaded decrypted file: ${asset.name}`);
  };

  // Handle Upload New Asset (Feature 2)
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) return;

    setUploadSubmitting(true);
    try {
      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName,
          folder: uploadFolder,
          category: uploadCategory,
          classification: uploadClassification,
          description: uploadDescription || 'Encrypted organizational asset',
          content: uploadContent || `Secure encrypted payload for ${uploadName}.\nStored securely in AES-256-GCM authenticated vault.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload');

      setShowUploadModal(false);
      setUploadName('');
      setUploadDescription('');
      setUploadContent('');
      showNotification(`Asset encrypted (AES-256-GCM) and registered: ${data.asset.name} (${data.asset.code})`);
      await fetchVault();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploadSubmitting(false);
    }
  };

  // Handle Controlled Sharing (Feature 14)
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingAsset || !shareRecipientId) return;

    setShareSubmitting(true);
    try {
      const res = await fetch('/api/assets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'share',
          assetId: sharingAsset.id,
          toUserId: shareRecipientId,
          permissions: sharePerms,
          expiresAt: shareExpiry ? new Date(shareExpiry).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to share asset');

      setSharingAsset(null);
      showNotification(`Controlled access granted for ${sharingAsset.name}`);
      await fetchVault();
    } catch (err: any) {
      alert(err.message || 'Share failed');
    } finally {
      setShareSubmitting(false);
    }
  };

  // Handle Submit Access Request (Feature 6)
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingAsset) return;

    setRequestSubmitting(true);
    try {
      const res = await submitAccessRequestAction({
        assetId: requestingAsset.id,
        requestType: 'HIGH_RISK_DATA',
        reason: requestReason || 'Authorized duty access request',
      });
      if (res.success) {
        setRequestingAsset(null);
        showNotification(`Access request submitted for ${requestingAsset.name}. Awaiting Admin NFT approval.`, 'info');
        await fetchVault();
      } else {
        alert(res.error || 'Failed to submit request');
      }
    } catch (err: any) {
      alert(err.message || 'Request submission failed');
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Handle Admin Quick Grant / Revoke (Feature 8 & 16)
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
      showNotification(currentCanDecrypt ? 'Clearance revoked' : 'Clearance granted');
      await fetchVault();
    } catch (err: any) {
      alert(err.message || 'Failed to update assignment');
    }
  };

  // Upload New Version (Feature 10)
  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !newVersionContent.trim()) return;

    setVersionSubmitting(true);
    try {
      const res = await fetch('/api/assets/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          newContent: newVersionContent,
          note: newVersionNote || 'Updated encrypted revision',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload version');

      setShowVersionUpload(false);
      setNewVersionContent('');
      setNewVersionNote('');
      showNotification(`Version ${data.keyVersion} committed. Key rotated.`);
      await fetchVault();
    } catch (err: any) {
      alert(err.message || 'Version upload failed');
    } finally {
      setVersionSubmitting(false);
    }
  };

  // Quick Action: Rename, Move, Archive, Delete (Feature 2)
  const handleRename = async (asset: VaultAsset) => {
    const newName = prompt('Enter new asset name:', asset.name);
    if (!newName || newName === asset.name) return;
    try {
      const res = await fetch('/api/assets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', assetId: asset.id, newName }),
      });
      if (res.ok) {
        showNotification(`Renamed to "${newName}"`);
        await fetchVault();
      }
    } catch {}
  };

  const handleMove = async (asset: VaultAsset) => {
    const folder = prompt('Enter destination folder (Projects, Finance, HR, Engineering, Legal):', asset.folder);
    if (!folder || !['Projects', 'Finance', 'HR', 'Engineering', 'Legal'].includes(folder)) return;
    try {
      const res = await fetch('/api/assets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', assetId: asset.id, targetFolder: folder }),
      });
      if (res.ok) {
        showNotification(`Moved to ${folder}`);
        await fetchVault();
      }
    } catch {}
  };

  const handleDelete = async (asset: VaultAsset) => {
    if (!confirm(`Are you sure you want to permanently delete "${asset.name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch('/api/assets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', assetId: asset.id }),
      });
      if (res.ok) {
        showNotification(`Deleted ${asset.name}`);
        if (selectedAsset?.id === asset.id) setSelectedAsset(null);
        await fetchVault();
      }
    } catch {}
  };

  // Helper for Category Icon
  const getCategoryIcon = (category: string, ext: string) => {
    switch (category) {
      case 'PDFs':
        return <FileText className="h-5 w-5 text-red-400 shrink-0" />;
      case 'Spreadsheets':
        return <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />;
      case 'ZIP archives':
        return <FileArchive className="h-5 w-5 text-amber-400 shrink-0" />;
      case 'Images':
        return <ImageIcon className="h-5 w-5 text-purple-400 shrink-0" />;
      case 'Documents':
        return <FileCode className="h-5 w-5 text-cyan-400 shrink-0" />;
      default:
        return <File className="h-5 w-5 text-zinc-400 shrink-0" />;
    }
  };

  // Helper for Classification Pill (Feature 17)
  const renderClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'PUBLIC':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-emerald-500/40 bg-emerald-950/40 text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            PUBLIC
          </span>
        );
      case 'INTERNAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-blue-500/40 bg-blue-950/40 text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
            INTERNAL
          </span>
        );
      case 'CONFIDENTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-amber-500/40 bg-amber-950/40 text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            CONFIDENTIAL
          </span>
        );
      case 'RESTRICTED':
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-red-500/40 bg-red-950/40 text-red-300">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
            RESTRICTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-zinc-700 bg-zinc-900 text-zinc-300">
            {classification}
          </span>
        );
    }
  };

  // Helper for Status Badge (Feature 8)
  const renderStatusBadge = (asset: VaultAsset) => {
    if (isAdmin || asset.canDecrypt || asset.status === 'AUTHORIZED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-cyan-500/30 bg-cyan-950/30 text-cyan-300">
          <Unlock className="w-3 h-3 text-cyan-400" /> Authorized
        </span>
      );
    }
    if (asset.status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-amber-500/30 bg-amber-950/30 text-amber-300">
          <Clock className="w-3 h-3 text-amber-400 animate-pulse" /> Pending Permit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-red-500/30 bg-red-950/30 text-red-300">
        <Lock className="w-3 h-3 text-red-400" /> Restricted
      </span>
    );
  };

  // Filter Assets (Feature 4)
  const filteredAssets = assets.filter((asset) => {
    // 1. Search Query Match
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.folder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.classification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Folder Match
    if (activeFolder !== 'All' && asset.folder !== activeFolder) return false;

    // 3. Category Match
    if (selectedCategory !== 'All' && asset.category !== selectedCategory) return false;

    // 4. Status Filter Match
    if (activeStatusFilter === 'Authorized') {
      return isAdmin || asset.canDecrypt || asset.status === 'AUTHORIZED';
    }
    if (activeStatusFilter === 'Pending') {
      return asset.status === 'PENDING';
    }
    if (activeStatusFilter === 'Restricted') {
      return asset.status === 'RESTRICTED';
    }
    if (activeStatusFilter === 'Recently Accessed') {
      return asset.lastAccessedAt.includes('2026-09-19');
    }
    if (activeStatusFilter === 'Recently Uploaded') {
      return asset.createdAt.includes('2026-09-19') || asset.createdAt.includes('2026-09-18');
    }

    return true;
  });

  return (
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-16">
      {/* ---------------------------------------------------- */}
      {/* 1. VAULT HEADER & METADATA BAR                       */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase flex items-center gap-3">
            <HardDrive className="h-8 w-8 text-cyan-400" />
            My Secure Data Vault
          </h1>
          <p className="text-xs text-zinc-400 font-mono tracking-widest mt-1 uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            AES-256-GCM • Server-Side KMS • Authorized Decryption
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-950/40 font-mono text-xs px-3 py-1.5">
            {isAdmin ? 'ADMINISTRATIVE MASTER CONSOLE' : `USER COMPARTMENT: ${userName.toUpperCase()}`}
          </Badge>

          {/* Upload Button (Feature 2) */}
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Upload File
          </Button>

          {/* Notifications Button (Feature 20) */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="border-zinc-800 bg-[#0a0a0c] hover:bg-zinc-900 text-zinc-300 relative"
              title="Vault Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-cyan-500 text-black rounded-full text-[9px] font-bold flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </Button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-800 bg-[#0a0a0c] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" /> Vault Notifications
                  </span>
                  <button onClick={() => setShowNotifications(false)} className="text-zinc-500 hover:text-zinc-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-zinc-900 max-h-80 overflow-y-auto font-mono text-xs mt-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-bold flex items-center gap-1.5 text-cyan-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> {n.title}
                        </span>
                        <span className="text-[10px] text-zinc-500">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActivityFeed(!showActivityFeed)}
            className="border-zinc-800 bg-[#0a0a0c] hover:bg-zinc-900 text-xs font-mono text-zinc-300"
          >
            <History className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            {showActivityFeed ? 'Hide Activity' : 'Recent Activity'}
          </Button>
        </div>
      </div>

      {/* NOTICE BANNER */}
      {notice && (
        <div
          className={`border px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between shadow-lg animate-in fade-in ${
            notice.type === 'info'
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. DASHBOARD / OVERVIEW CARDS (Feature 1)            */}
      {/* Total files | Authorized | Pending | Restricted     */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <Card className="border-zinc-800 bg-[#0a0a0c] p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs uppercase">
            <span>Total Assets</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-zinc-100">{totalAssetsCount}</div>
            <div className="text-[10px] text-zinc-500 mt-1">100% Encrypted at Rest</div>
          </div>
        </Card>

        <Card className="border-zinc-800 bg-[#0a0a0c] p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs uppercase">
            <span>Authorized</span>
            <Unlock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-cyan-400">{authorizedCount}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Clearance Active (Read/Decrypt)</div>
          </div>
        </Card>

        <Card className="border-zinc-800 bg-[#0a0a0c] p-4 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs uppercase">
            <span>Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-amber-400">{pendingCount}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Awaiting Admin NFT Permit</div>
          </div>
        </Card>

        <Card className="border-zinc-800 bg-[#0a0a0c] p-4 flex flex-col justify-between hover:border-red-500/40 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs uppercase">
            <span>Restricted</span>
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-red-400">{restrictedCount}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Clearance Required</div>
          </div>
        </Card>
      </div>

      {/* SECONDARY INFO BAR: Storage, Device, Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* Storage Bar */}
        <div className="p-3.5 rounded-lg border border-zinc-800 bg-[#0a0a0c] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-zinc-400 uppercase text-[10px] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" /> Encrypted Storage Usage
            </div>
            <div className="text-zinc-200 font-bold">48.5 MB / 5.0 GB</div>
          </div>
          <div className="text-right">
            <span className="text-cyan-400 font-bold">9.7%</span>
            <div className="w-20 bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: '9.7%' }}></div>
            </div>
          </div>
        </div>

        {/* Security Alerts */}
        <div className="p-3.5 rounded-lg border border-zinc-800 bg-[#0a0a0c] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-zinc-400 uppercase text-[10px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sentinel Shield Status
            </div>
            <div className="text-emerald-400 font-bold">0 Active Security Alerts</div>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-950/20 text-[10px]">
            ACTIVE ENCLAVE
          </Badge>
        </div>

        {/* Device Context */}
        <div className="p-3.5 rounded-lg border border-zinc-800 bg-[#0a0a0c] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-zinc-400 uppercase text-[10px] flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" /> Bound Client Device
            </div>
            <div className="text-zinc-200 font-bold truncate max-w-[180px]">{deviceName}</div>
          </div>
          <div className="text-[10px] text-zinc-500 text-right">
            <span>ECDSA P-256</span>
            <div className="text-emerald-400">● Verified</div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* RECENT ACTIVITY FEED (Feature 1 & 12)                */}
      {/* ---------------------------------------------------- */}
      {showActivityFeed && (
        <Card className="border-zinc-800 bg-[#0a0a0c] p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Recent Vault &amp; Security Activity
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowActivityFeed(false)} className="text-xs font-mono text-zinc-500">
              Close
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 font-mono text-xs">
            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Unlock className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold text-zinc-200">Project Alpha.pdf</div>
                  <div className="text-[10px] text-zinc-500">Decrypted for authorized session</div>
                </div>
              </div>
              <span className="text-[10px] text-zinc-400">5 min ago</span>
            </div>

            <div className="p-3 rounded bg-zinc-900/60 border border-red-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <div className="font-bold text-zinc-200">Annual Treasury Allocation.xlsx</div>
                  <div className="text-[10px] text-red-400/80">Access denied (Restricted clearance)</div>
                </div>
              </div>
              <span className="text-[10px] text-zinc-400">12 min ago</span>
            </div>

            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-zinc-200">Financial Report Q3.xlsx</div>
                  <div className="text-[10px] text-emerald-400/80">Shared with you by Finance Directorate</div>
                </div>
              </div>
              <span className="text-[10px] text-zinc-400">Today, 16:15</span>
            </div>

            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold text-zinc-200">Project Beta Architecture.zip</div>
                  <div className="text-[10px] text-zinc-500">Uploaded version v2 by Vasu</div>
                </div>
              </div>
              <span className="text-[10px] text-zinc-400">Yesterday</span>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. FOLDERS / COLLECTIONS (Off-Chain Organization)     */}
      {/* Projects | Finance | HR | Engineering | Legal | All  */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="uppercase tracking-wider flex items-center gap-1.5 font-bold text-zinc-300">
            <FolderOpen className="w-4 h-4 text-cyan-400" /> Vault Collections &amp; Compartments
          </span>
          <span className="text-zinc-500">Off-chain organizational layer</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
          {FOLDERS.map((folder) => {
            const isSelected = activeFolder === folder;
            const count = folder === 'All' ? assets.length : assets.filter((a) => a.folder === folder).length;
            return (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300 shadow-md shadow-cyan-950/40'
                    : 'border-zinc-800 bg-[#0a0a0c] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Folder className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    {count}
                  </span>
                </div>
                <div className="font-bold mt-2 truncate">{folder === 'All' ? '📁 All Files' : `📁 ${folder}`}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. SEARCH AND FILTER BAR (Feature 4)                 */}
      {/* Status tabs: All, Authorized, Pending, Restricted    */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md font-mono">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              type="search"
              placeholder="Search by file name, asset code, owner, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#0a0a0c] border-zinc-800 text-xs text-zinc-200 font-mono placeholder:text-zinc-600"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0a0a0c] border border-zinc-800 rounded-md px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All File Types</option>
              <option value="PDFs">PDFs</option>
              <option value="Documents">Documents</option>
              <option value="Spreadsheets">Spreadsheets</option>
              <option value="ZIP archives">ZIP Archives</option>
              <option value="Images">Images</option>
              <option value="Other files">Other Files</option>
            </select>
          </div>

        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800 pb-2 font-mono text-xs">
          {STATUS_FILTERS.map((tab) => {
            const isActive = activeStatusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/30 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2 & 5. FILE / ASSET LIST TABLE (Feature 2 & 5)       */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-zinc-800 bg-[#0a0a0c] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left font-mono">
            <thead className="bg-zinc-900/70 text-zinc-400 text-[11px] uppercase border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3.5 font-bold">Asset Name &amp; Code</th>
                <th className="px-6 py-3.5 font-bold">Classification</th>
                <th className="px-6 py-3.5 font-bold">Folder &amp; Type</th>
                <th className="px-6 py-3.5 font-bold">Encryption &amp; Key</th>
                <th className="px-6 py-3.5 font-bold">My Permissions</th>
                <th className="px-6 py-3.5 font-bold text-right">Cryptographic Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => {
                  const canDecrypt = isAdmin || asset.canDecrypt || asset.status === 'AUTHORIZED';
                  const isPending = asset.status === 'PENDING' && !isAdmin;
                  const isRestricted = asset.status === 'RESTRICTED' && !isAdmin;

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {/* Name & Code */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getCategoryIcon(asset.category, asset.fileExtension)}
                          <div className="ml-3">
                            <div className="font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                              {asset.name}
                              {asset.isArchived && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">ARCHIVED</span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                              <span>{asset.code}</span>
                              <span>•</span>
                              <span>{asset.fileSize}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Classification (Feature 17) */}
                      <td className="px-6 py-4">
                        {renderClassificationBadge(asset.classification)}
                      </td>

                      {/* Folder & Type (Feature 3) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-zinc-300">
                            <Folder className="w-3.5 h-3.5 text-zinc-500" />
                            {asset.folder}
                          </span>
                          <div className="text-[10px] text-zinc-500 uppercase">{asset.category}</div>
                        </div>
                      </td>

                      {/* Encryption Status (Feature 8) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-zinc-200">
                            <Lock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>AES-256-GCM</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            Key Version: <span className="text-cyan-400 font-bold">{asset.keyVersion}</span>
                          </div>
                        </div>
                      </td>

                      {/* Granular Permissions (Feature 5) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(asset)}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className={asset.canRead || isAdmin ? 'text-emerald-400' : 'text-zinc-600'}>
                              {asset.canRead || isAdmin ? '✓ READ' : '✗ READ'}
                            </span>
                            <span className={canDecrypt ? 'text-cyan-400' : 'text-zinc-600'}>
                              {canDecrypt ? '✓ DECRYPT' : '✗ DECRYPT'}
                            </span>
                            <span className={asset.canDownload || isAdmin ? 'text-zinc-300' : 'text-zinc-600'}>
                              {asset.canDownload || isAdmin ? '✓ DOWNLOAD' : '✗ DOWNLOAD'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {canDecrypt ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleDecryptAndPreview(asset)}
                              className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40"
                            >
                              <Unlock className="h-3.5 w-3.5 mr-1.5" />
                              Decrypt &amp; View
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSharingAsset(asset);
                                setShareRecipientId(shareableUsers.find((u) => u.id !== userId)?.id || '');
                              }}
                              className="text-xs font-mono border-zinc-800 text-zinc-300 hover:text-cyan-300"
                              title="Controlled Share"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : isPending ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs font-mono">
                              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                              Awaiting Permit
                            </span>

                            <Button
                              size="sm"
                              onClick={() => handleDecryptAndPreview(asset)}
                              className="text-xs font-mono bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50"
                              title="Demonstrate Zero-Trust cryptographic refusal"
                            >
                              <Lock className="h-3.5 w-3.5 mr-1" />
                              Attempt
                            </Button>

                            {isAdmin && (
                              <Button
                                size="sm"
                                onClick={() => handleAdminToggleRevoke(asset.id, false)}
                                className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              >
                                Mint Permit
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setRequestingAsset(asset);
                                setRequestReason('Tactical mission review and clearance verification');
                              }}
                              className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
                            >
                              <Key className="h-3.5 w-3.5 mr-1.5" />
                              Request Access
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleDecryptAndPreview(asset)}
                              className="text-xs font-mono bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50"
                              title="Zero-Trust cryptographic refusal test"
                            >
                              <Lock className="h-3.5 w-3.5 mr-1" />
                              Attempt
                            </Button>
                          </>
                        )}

                        {/* Slide-over trigger */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedAsset(asset)}
                          className="text-zinc-400 hover:text-zinc-100 text-xs font-mono"
                          title="Open Asset Details"
                        >
                          Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-mono">
                    <FileText className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                    No assets matched your search or folder filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 7. SECURE PREVIEW MODAL / DRAWER (Feature 7)         */}
      {/* Encrypted at rest -> Auth check -> KMS Auth -> Decrypt*/}
      {/* ---------------------------------------------------- */}
      {previewAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="border-cyan-500/50 bg-[#0a0a0c] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Secure Preview: {previewAsset.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400 font-mono mt-1">
                    Asset ID: {previewAsset.code} • Ephemeral Memory Isolation
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreviewAsset(null);
                    setDecryptResult(null);
                    setDecryptError(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-100 font-mono text-xs"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Cryptographic Pipeline Flow Banner */}
              <div className="mt-4 p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 font-mono text-[10px] text-zinc-300 flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-400">Encrypted at Rest</span>
                <span className="text-cyan-400">➔</span>
                <span className="text-zinc-400">Auth Check</span>
                <span className="text-cyan-400">➔</span>
                <span className="text-zinc-400">KMS Authorization</span>
                <span className="text-cyan-400">➔</span>
                <span className="text-emerald-400 font-bold">AES-256-GCM Decrypted</span>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-5 font-mono text-xs">
              {/* Loading State */}
              {decryptLoading && (
                <div className="p-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <div className="text-xs font-mono text-cyan-300">
                    Executing 10-Step Cryptographic Authorization Pipeline...
                  </div>
                  <div className="text-[10px] text-zinc-500">Unwrapping AES-256-GCM DEK inside secure enclave</div>
                </div>
              )}

              {/* Failure State (Zero-Trust Demonstration) */}
              {decryptError && (
                <div className="p-5 bg-red-950/40 border border-red-500/40 rounded-xl space-y-3">
                  <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5" />
                    ACCESS DENIED: Zero-Trust KMS Authorization Refusal
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-black/60 p-3.5 rounded border border-red-900/50">
                    {decryptError}
                  </p>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-red-900/30 flex justify-between items-center">
                    <span>Invariant: Unauthorized sessions never obtain plaintext or DEKs.</span>
                    <span className="text-red-400">Audit logged</span>
                  </div>
                </div>
              )}

              {/* Success State — Decrypted Content */}
              {decryptResult && (
                <div className="space-y-4">
                  {/* Verified Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div className="bg-zinc-900 p-2 rounded border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> P-256 Valid
                    </div>
                    <div className="bg-zinc-900 p-2 rounded border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Session Active
                    </div>
                    <div className="bg-zinc-900 p-2 rounded border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> RBAC Clearance
                    </div>
                    <div className="bg-zinc-900 p-2 rounded border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> MAC Authenticated
                    </div>
                  </div>

                  {/* Decrypted Payload Container */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        Decrypted Plaintext Document:
                      </span>
                      <span className="text-emerald-400 text-[10px] font-bold">
                        🔐 DECRYPTED FOR AUTHORIZED SESSION
                      </span>
                    </div>

                    <div className="p-4 bg-black/90 rounded-lg border border-cyan-500/30 text-xs font-mono text-cyan-200 leading-relaxed whitespace-pre-wrap select-all max-h-72 overflow-y-auto">
                      {decryptResult.decryptedData}
                    </div>
                  </div>

                  {/* Footer Context */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-zinc-500 pt-3 border-t border-zinc-900 gap-2">
                    <span>Authorized by: {decryptResult.authorizedBy}</span>
                    <div className="flex items-center gap-3">
                      {(previewAsset.canDownload || isAdmin) && (
                        <Button
                          size="sm"
                          onClick={() => handleDownloadDecrypted(previewAsset, decryptResult.decryptedData)}
                          className="text-xs font-mono bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPreviewAsset(null);
                          setDecryptResult(null);
                        }}
                        className="text-xs font-mono text-zinc-400 hover:text-zinc-100"
                      >
                        Close Preview
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. ASSET DETAILS SLIDE-OVER DRAWER (Feature 9, 10, 11, 18, 19) */}
      {/* ---------------------------------------------------- */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-[#0a0a0c] border-l border-zinc-800 h-full p-6 overflow-y-auto font-mono text-xs space-y-6 shadow-2xl animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-100 uppercase">{selectedAsset.name}</h3>
                  {renderClassificationBadge(selectedAsset.classification)}
                </div>
                <p className="text-[11px] text-zinc-500">{selectedAsset.code} • {selectedAsset.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAsset(null)}
                className="text-zinc-400 hover:text-zinc-100 -mr-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Actions inside Drawer */}
            <div className="flex flex-wrap gap-2 pt-1">
              {(isAdmin || selectedAsset.canDecrypt) && (
                <Button
                  size="sm"
                  onClick={() => handleDecryptAndPreview(selectedAsset)}
                  className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-mono font-bold"
                >
                  <Unlock className="w-3.5 h-3.5 mr-1.5" /> Decrypt &amp; View
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSharingAsset(selectedAsset);
                  setShareRecipientId(shareableUsers.find((u) => u.id !== userId)?.id || '');
                }}
                className="border-zinc-800 text-zinc-300 hover:text-cyan-300 text-xs font-mono"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRename(selectedAsset)}
                className="border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Rename
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMove(selectedAsset)}
                className="border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                <Folder className="w-3.5 h-3.5 mr-1" /> Move
              </Button>

              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(selectedAsset)}
                  className="border-red-900/40 text-red-400 hover:bg-red-950/20 text-xs font-mono"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>

            {/* Core Metadata Grid (Feature 9) */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-800 pb-2 flex items-center justify-between">
                <span>Asset Specifications</span>
                <span className="text-cyan-400">SMX-AST-ACTIVE</span>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Asset ID</div>
                  <div className="text-zinc-200 font-bold mt-0.5">{selectedAsset.code}</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Type / Format</div>
                  <div className="text-zinc-200 font-bold mt-0.5 uppercase">{selectedAsset.category} (.{selectedAsset.fileExtension})</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Folder / Compartment</div>
                  <div className="text-zinc-200 font-bold mt-0.5">📁 {selectedAsset.folder}</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Owner</div>
                  <div className="text-zinc-200 font-bold mt-0.5">{selectedAsset.ownerName}</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Created</div>
                  <div className="text-zinc-300 mt-0.5">{new Date(selectedAsset.createdAt).toLocaleDateString()}</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Last Access</div>
                  <div className="text-zinc-300 mt-0.5">{new Date(selectedAsset.lastAccessedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-500 uppercase">Encryption Standard</div>
                  <div className="text-cyan-300 font-bold mt-0.5">
                    {selectedAsset.encryptionAlgorithm}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Active Key Version</div>
                  <div className="text-cyan-400 font-bold mt-0.5">{selectedAsset.keyVersion}</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Blockchain Status</div>
                  <div className="text-emerald-400 font-bold mt-0.5">✓ Registered on Sepolia</div>
                </div>
              </div>
            </div>

            {/* 10. VERSION HISTORY (Feature 10) */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-cyan-400" /> Version History
                </span>
                {(selectedAsset.canEdit || isAdmin) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowVersionUpload(!showVersionUpload)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 p-0 h-auto"
                  >
                    + Upload New Version
                  </Button>
                )}
              </div>

              {/* Upload Version Form */}
              {showVersionUpload && (
                <form onSubmit={handleUploadNewVersion} className="p-3 bg-black/60 rounded-lg border border-cyan-500/30 space-y-3 animate-in fade-in">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Version Revision Note</label>
                    <Input
                      type="text"
                      placeholder="e.g. Frequency modulation calibration update"
                      value={newVersionNote}
                      onChange={(e) => setNewVersionNote(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Updated Document Content</label>
                    <textarea
                      rows={3}
                      placeholder="Enter updated encrypted content payload..."
                      value={newVersionContent}
                      onChange={(e) => setNewVersionContent(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-200"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowVersionUpload(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={versionSubmitting} className="bg-cyan-500 text-black font-bold text-xs">
                      {versionSubmitting ? 'Committing...' : 'Commit Version & Rotate Key'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Versions List */}
              <div className="space-y-2.5">
                {selectedAsset.versions?.map((v, idx) => (
                  <div key={v.version} className="flex items-start justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800/60">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-400">{v.version}</span>
                        {idx === 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                            CURRENT
                          </span>
                        )}
                        <span className="text-zinc-500 text-[10px]">Key Version: {v.key_version}</span>
                      </div>
                      <div className="text-[11px] text-zinc-300">{v.note}</div>
                      <div className="text-[10px] text-zinc-500">Uploaded by {v.uploaded_by}</div>
                    </div>
                    <span className="text-[10px] text-zinc-500">{new Date(v.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 11. ACCESS HISTORY (Feature 11) */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Asset Access History
              </div>
              <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto pr-1">
                {selectedAsset.accessHistory?.map((log, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200 font-bold">{log.user_name}</span>
                        <span className={`text-[9px] px-1 rounded ${
                          log.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                          log.status === 'PENDING' ? 'bg-amber-950 text-amber-400 border border-amber-500/30' :
                          'bg-red-950 text-red-400 border border-red-500/30'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400">{log.action}</div>
                    </div>
                    <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 18 & 19. BLOCKCHAIN VERIFICATION PANEL (Feature 18 & 19) */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-[#060608] space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Blockchain Verification
                </span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                  ON-CHAIN ANCHOR
                </Badge>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> <span>Identity Verified (P-256 DID)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> <span>Owner Cryptographically Verified</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> <span>Asset Registered on Sepolia Testnet</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> <span>Transfer History Cryptographically Recorded</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-zinc-500">Network:</span>
                  <div className="text-zinc-300 font-bold">Ethereum Sepolia</div>
                </div>
                <div>
                  <span className="text-zinc-500">Contract:</span>
                  <div className="text-zinc-300 font-bold">AssetNFT (0xC538...)</div>
                </div>
                <div>
                  <span className="text-zinc-500">Token ID:</span>
                  <div className="text-cyan-400 font-bold">{selectedAsset.tokenId}</div>
                </div>
                <div>
                  <span className="text-zinc-500">DID Identifier:</span>
                  <div className="text-zinc-400 truncate">{selectedAsset.did}</div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`https://sepolia.etherscan.io/address/0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                >
                  View on Sepolia Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. UPLOAD NEW ASSET MODAL (Feature 2)                */}
      {/* ---------------------------------------------------- */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="border-cyan-500/40 bg-[#0a0a0c] shadow-2xl max-w-lg w-full font-mono text-xs animate-in zoom-in-95">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-cyan-400" />
                  Upload &amp; Encrypt Vault Asset
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)} className="text-zinc-400">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-xs text-zinc-400 font-mono mt-1">
                Upload File ➔ AES-256-GCM Encrypt ➔ Store Encrypted Data ➔ Register AssetNFT
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateAsset}>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">File Name (with extension)</label>
                  <Input
                    required
                    type="text"
                    placeholder="e.g. Tactical_Mesh_Briefing.pdf"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Collection / Folder</label>
                    <select
                      value={uploadFolder}
                      onChange={(e) => setUploadFolder(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300"
                    >
                      <option value="Projects">📁 Projects</option>
                      <option value="Finance">📁 Finance</option>
                      <option value="HR">📁 HR</option>
                      <option value="Engineering">📁 Engineering</option>
                      <option value="Legal">📁 Legal</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300"
                    >
                      <option value="Documents">Documents</option>
                      <option value="PDFs">PDFs</option>
                      <option value="Spreadsheets">Spreadsheets</option>
                      <option value="ZIP archives">ZIP Archives</option>
                      <option value="Images">Images</option>
                      <option value="Videos">Videos</option>
                      <option value="Other files">Other Files</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Data Classification</label>
                  <select
                    value={uploadClassification}
                    onChange={(e) => setUploadClassification(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300"
                  >
                    <option value="PUBLIC">🟢 PUBLIC</option>
                    <option value="INTERNAL">🔵 INTERNAL</option>
                    <option value="CONFIDENTIAL">🟠 CONFIDENTIAL</option>
                    <option value="RESTRICTED">🔴 RESTRICTED</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Description</label>
                  <Input
                    type="text"
                    placeholder="Brief description of the asset contents..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Document Plaintext Payload (To Be Encrypted)</label>
                  <textarea
                    rows={4}
                    placeholder="Enter confidential text or document payload here..."
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="p-3 bg-zinc-950/60 rounded border border-zinc-800 text-[10px] text-zinc-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Encrypted on ingestion via Server-Side KMS. Stored as authenticated ciphertext.</span>
                </div>
              </CardContent>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-2.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploadSubmitting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs"
                >
                  {uploadSubmitting ? 'Encrypting & Minting...' : 'Encrypt & Register'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 14. CONTROLLED SHARING MODAL (Feature 14 & 15)       */}
      {/* ---------------------------------------------------- */}
      {sharingAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="border-cyan-500/40 bg-[#0a0a0c] shadow-2xl max-w-md w-full font-mono text-xs animate-in zoom-in-95">
            <CardHeader className="border-b border-zinc-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  Controlled Share: {sharingAsset.name}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSharingAsset(null)} className="text-zinc-400">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-xs text-zinc-400 font-mono">
                Cryptographically bound access delegation with strict expiry.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleShareSubmit}>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-bold">Select Recipient User</label>
                  <select
                    value={shareRecipientId}
                    onChange={(e) => setShareRecipientId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-200"
                  >
                    {shareableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) — {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-zinc-400 block font-bold">Granular Permissions Granted</label>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded bg-zinc-950/60 border border-zinc-800">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={sharePerms.canRead}
                        onChange={(e) => setSharePerms({ ...sharePerms, canRead: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-cyan-500"
                      />
                      <span>READ</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={sharePerms.canDecrypt}
                        onChange={(e) => setSharePerms({ ...sharePerms, canDecrypt: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-cyan-500"
                      />
                      <span>DECRYPT</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={sharePerms.canDownload}
                        onChange={(e) => setSharePerms({ ...sharePerms, canDownload: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-cyan-500"
                      />
                      <span>DOWNLOAD</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={sharePerms.canEdit}
                        onChange={(e) => setSharePerms({ ...sharePerms, canEdit: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-cyan-500"
                      />
                      <span>EDIT</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-bold">Access Expiration Date</label>
                  <Input
                    type="date"
                    value={shareExpiry}
                    onChange={(e) => setShareExpiry(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Access will be revoked automatically after the expiration threshold.
                  </span>
                </div>
              </CardContent>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSharingAsset(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={shareSubmitting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs"
                >
                  {shareSubmitting ? 'Granting...' : 'Grant Controlled Access'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. ACCESS REQUEST MODAL (Feature 6)                  */}
      {/* ---------------------------------------------------- */}
      {requestingAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="border-amber-500/40 bg-[#0a0a0c] shadow-2xl max-w-md w-full font-mono text-xs animate-in zoom-in-95">
            <CardHeader className="border-b border-zinc-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  Request Access Clearance
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setRequestingAsset(null)} className="text-zinc-400">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-xs text-zinc-400 font-mono">
                Asset: <span className="text-zinc-200 font-bold">{requestingAsset.name}</span> ({requestingAsset.code})
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleRequestSubmit}>
              <CardContent className="pt-4 space-y-4">
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Restricted Enterprise Asset
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    You do not currently possess active cryptographic clearance for this file. Submitting this request sends an alert to the Administrator to mint an on-chain NFT permit.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-bold">Operational Justification / Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                    placeholder="Describe mission or operational requirement..."
                  />
                </div>
              </CardContent>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setRequestingAsset(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={requestSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs"
                >
                  {requestSubmitting ? 'Submitting...' : 'Submit Access Request'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
