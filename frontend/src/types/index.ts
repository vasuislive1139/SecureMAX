export type UserRole = "ADMIN" | "MANAGER" | "AUDITOR" | "USER";

export type IdentityStatus = "None" | "Active" | "Suspended" | "Revoked";

export type AssetStatus = "None" | "Registered" | "Allocated" | "InMaintenance" | "Decommissioned";

export interface KYCData {
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  status: "Pending" | "Verified" | "Rejected";
}

export interface UserIdentity {
  userId: string;
  did: string;
  publicKey: string;
  controllerAddress: string;
  role: UserRole;
  identityStatus: IdentityStatus;
  kycStatus: "Verified" | "Pending" | "Rejected";
  registeredAt?: number;
  updatedAt?: number;
}

export interface AssetRecord {
  tokenId: number;
  assetId: string;
  assetType: string;
  assetReference: string;
  metadataURI: string;
  currentOwner: string;
  ownerDid: string;
  status: AssetStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEvent {
  id: string;
  eventType: "IDENTITY_REGISTERED" | "IDENTITY_STATUS_UPDATED" | "ROLE_ASSIGNED" | "ASSET_MINTED" | "ASSET_ALLOCATED" | "ASSET_TRANSFERRED" | "ASSET_STATUS_UPDATED";
  txHash: string;
  blockNumber: number;
  timestamp: number;
  details: string;
  initiator: string;
}

export interface AuthChallenge {
  challengeId: string;
  challengeText: string;
  expiresAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserIdentity | null;
  token: string | null;
  privateKey: string | null; // Stored only client-side in session memory
}
