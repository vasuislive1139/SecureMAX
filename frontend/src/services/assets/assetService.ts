import { ethers } from "ethers";
import { AssetRecord, AssetStatus, AuditEvent } from "../../types";
import { RPC_URL } from "../api";
import AssetNFTABI from "../../abi/AssetNFT.json";

export const ASSET_NFT_ADDRESS =
  import.meta.env.VITE_ASSET_NFT_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

// In-memory prototype store of assets for offline demo / frontend testing
const mockAssets: Map<number, AssetRecord> = new Map([
  [
    1,
    {
      tokenId: 1,
      assetId: "AST-HW-2026-0001",
      assetType: "HARDWARE_HSM",
      assetReference: "ipfs://QmZtmD2qt8fJpqBp36gZsuSZSZvN5jVw9JBC09128312",
      metadataURI: "https://assets.securemax.org/metadata/ast-0001.json",
      currentOwner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      ownerDid: "did:assetchain:usr-admin01",
      status: "Registered",
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
    },
  ],
  [
    2,
    {
      tokenId: 2,
      assetId: "AST-SRV-2026-0002",
      assetType: "ENTERPRISE_SERVER",
      assetReference: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      metadataURI: "https://assets.securemax.org/metadata/ast-0002.json",
      currentOwner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      ownerDid: "did:assetchain:usr-mgr002",
      status: "Allocated",
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 43200000,
    },
  ],
  [
    3,
    {
      tokenId: 3,
      assetId: "AST-LIC-2026-0003",
      assetType: "SOFTWARE_KEY",
      assetReference: "ipfs://QmRAQB6YaCyidP37UdDnjFY5QQuiB21323asdxza123",
      metadataURI: "https://assets.securemax.org/metadata/ast-0003.json",
      currentOwner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      ownerDid: "did:assetchain:usr-aud003",
      status: "InMaintenance",
      createdAt: Date.now() - 60000000,
      updatedAt: Date.now() - 12000000,
    },
  ],
]);

const mockAuditEvents: AuditEvent[] = [
  {
    id: "evt-001",
    eventType: "IDENTITY_REGISTERED",
    txHash: "0x3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef01",
    blockNumber: 10420,
    timestamp: Date.now() - 86400000,
    details: "Identity did:assetchain:usr-admin01 registered on-chain",
    initiator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    id: "evt-002",
    eventType: "ASSET_MINTED",
    txHash: "0x8f90123456789abcdef0123456789abcdef0123456789abcdef013a4b5c6d7e",
    blockNumber: 10425,
    timestamp: Date.now() - 80000000,
    details: "Asset AST-HW-2026-0001 (Token #1) minted to did:assetchain:usr-admin01",
    initiator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    id: "evt-003",
    eventType: "ASSET_ALLOCATED",
    txHash: "0x456789abcdef0123456789abcdef013a4b5c6d7e8f90123456789abcdef0123",
    blockNumber: 10450,
    timestamp: Date.now() - 43200000,
    details: "Asset AST-SRV-2026-0002 (Token #2) allocated to did:assetchain:usr-mgr002",
    initiator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
  {
    id: "evt-004",
    eventType: "ASSET_STATUS_UPDATED",
    txHash: "0x0123456789abcdef013a4b5c6d7e8f90123456789abcdef0123456789abcdef",
    blockNumber: 10480,
    timestamp: Date.now() - 12000000,
    details: "Asset AST-LIC-2026-0003 status changed to InMaintenance",
    initiator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
];

export async function fetchAllAssets(): Promise<AssetRecord[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(ASSET_NFT_ADDRESS, AssetNFTABI, provider);
    const totalCount = await contract.totalAssetsCount();

    const assets: AssetRecord[] = [];
    const statusMap: AssetStatus[] = ["None", "Registered", "Allocated", "InMaintenance", "Decommissioned"];

    for (let i = 1; i <= totalCount; i++) {
      try {
        const record = await contract.getAsset(i);
        assets.push({
          tokenId: Number(record.tokenId),
          assetId: record.assetId,
          assetType: record.assetType,
          assetReference: record.assetReference,
          metadataURI: record.metadataURI,
          currentOwner: record.currentOwner,
          ownerDid: record.ownerDid,
          status: statusMap[Number(record.status)] || "Registered",
          createdAt: Number(record.createdAt) * 1000,
          updatedAt: Number(record.updatedAt) * 1000,
        });
      } catch {}
    }

    if (assets.length > 0) return assets;
  } catch {}

  return Array.from(mockAssets.values());
}

export async function fetchAssetsByDid(did: string): Promise<AssetRecord[]> {
  const all = await fetchAllAssets();
  return all.filter((a) => a.ownerDid.toLowerCase() === did.toLowerCase());
}

export async function mintAsset(
  assetId: string,
  assetType: string,
  assetReference: string,
  metadataURI: string,
  recipientAddress: string,
  recipientDid: string
): Promise<{ success: boolean; data?: AssetRecord; error?: string }> {
  const newId = mockAssets.size + 1;
  const newRecord: AssetRecord = {
    tokenId: newId,
    assetId,
    assetType,
    assetReference,
    metadataURI,
    currentOwner: recipientAddress,
    ownerDid: recipientDid,
    status: "Registered",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  mockAssets.set(newId, newRecord);

  mockAuditEvents.unshift({
    id: `evt-${Date.now()}`,
    eventType: "ASSET_MINTED",
    txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    blockNumber: 10500 + mockAssets.size,
    timestamp: Date.now(),
    details: `Asset ${assetId} (Token #${newId}) minted to ${recipientDid}`,
    initiator: recipientAddress,
  });

  return { success: true, data: newRecord };
}

export async function allocateAsset(
  tokenId: number,
  newOwnerAddress: string,
  newOwnerDid: string
): Promise<{ success: boolean; error?: string }> {
  const asset = mockAssets.get(tokenId);
  if (!asset) return { success: false, error: "Asset not found" };

  if (asset.status === "Decommissioned") {
    return { success: false, error: "Cannot allocate decommissioned asset" };
  }

  const prevOwner = asset.currentOwner;
  asset.currentOwner = newOwnerAddress;
  asset.ownerDid = newOwnerDid;
  asset.status = "Allocated";
  asset.updatedAt = Date.now();

  mockAuditEvents.unshift({
    id: `evt-${Date.now()}`,
    eventType: "ASSET_ALLOCATED",
    txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    blockNumber: 10510 + tokenId,
    timestamp: Date.now(),
    details: `Asset ${asset.assetId} allocated from ${prevOwner} to ${newOwnerDid}`,
    initiator: newOwnerAddress,
  });

  return { success: true };
}

export async function transferAsset(
  tokenId: number,
  toAddress: string,
  toDid: string
): Promise<{ success: boolean; error?: string }> {
  const asset = mockAssets.get(tokenId);
  if (!asset) return { success: false, error: "Asset not found" };

  if (asset.status === "InMaintenance" || asset.status === "Decommissioned") {
    return { success: false, error: `Transfer blocked: Asset is ${asset.status}` };
  }

  const prevOwner = asset.currentOwner;
  asset.currentOwner = toAddress;
  asset.ownerDid = toDid;
  asset.updatedAt = Date.now();

  mockAuditEvents.unshift({
    id: `evt-${Date.now()}`,
    eventType: "ASSET_TRANSFERRED",
    txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    blockNumber: 10520 + tokenId,
    timestamp: Date.now(),
    details: `Asset ${asset.assetId} transferred from ${prevOwner} to ${toDid}`,
    initiator: prevOwner,
  });

  return { success: true };
}

export async function updateAssetStatus(
  tokenId: number,
  newStatus: AssetStatus
): Promise<{ success: boolean; error?: string }> {
  const asset = mockAssets.get(tokenId);
  if (!asset) return { success: false, error: "Asset not found" };

  if (asset.status === "Decommissioned") {
    return { success: false, error: "Cannot modify a decommissioned asset" };
  }

  const prev = asset.status;
  asset.status = newStatus;
  asset.updatedAt = Date.now();

  mockAuditEvents.unshift({
    id: `evt-${Date.now()}`,
    eventType: "ASSET_STATUS_UPDATED",
    txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    blockNumber: 10530 + tokenId,
    timestamp: Date.now(),
    details: `Asset ${asset.assetId} status changed from ${prev} to ${newStatus}`,
    initiator: asset.currentOwner,
  });

  return { success: true };
}

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  return [...mockAuditEvents];
}
