# Integration Guide for Teammates (Person 4 — NFT & Asset Management)

This guide documents how each teammate interacts with the `AssetNFT` smart contract.

---

## 1. Quick Reference & Artifacts

- **Contract Source**: `blockchain/contracts/assets/AssetNFT.sol` (and `blockchain/assets/AssetNFT.sol`)
- **Exported ABI**: `blockchain/abi/AssetNFT.json`
- **Deployment Info**: `blockchain/deployments/asset-nft-deployment.json`

---

## 2. Integration with Person 1 & Person 3 (Backend / RBAC Signers)

### Minting an Asset from Authorized Backend
```typescript
import { ethers } from "ethers";
import AssetNFTABI from "../blockchain/abi/AssetNFT.json";

export async function mintOrganizationalAsset(
  contractAddress: string,
  managerSigner: ethers.Signer,
  assetId: string,          // e.g. "AST-HW-2026-0001"
  assetType: string,        // e.g. "HARDWARE"
  assetRefDigest: string,   // e.g. "ipfs://Qm..."
  metadataURI: string,      // e.g. "https://assets.securemax.org/ast-1.json"
  custodianAddress: string, // Initial recipient address
  custodianDid: string      // "did:assetchain:usr-1001-alice"
) {
  const contract = new ethers.Contract(contractAddress, AssetNFTABI, managerSigner);

  const tx = await contract.mintAsset(
    assetId,
    assetType,
    assetRefDigest,
    metadataURI,
    custodianAddress,
    custodianDid
  );

  const receipt = await tx.wait();
  console.log(`Asset NFT minted! TX: ${receipt.hash}`);
}
```

### Allocating an Asset to an Employee
```typescript
export async function allocateAssetToUser(
  contractAddress: string,
  managerSigner: ethers.Signer,
  tokenId: number,
  newUserAddress: string,
  newUserDid: string
) {
  const contract = new ethers.Contract(contractAddress, AssetNFTABI, managerSigner);
  const tx = await contract.allocateAsset(tokenId, newUserAddress, newUserDid);
  await tx.wait();
  console.log(`Asset ${tokenId} allocated to ${newUserDid}`);
}
```

---

## 3. Integration with Person 2 (DID Verification)

Before allocating or minting an asset to a DID, backend/frontend can query `IdentityRegistry` to verify active DID status, then execute `AssetNFT` operations:

```typescript
// 1. Verify DID with Person 2 IdentityRegistry
const isDidActive = await identityRegistry.isIdentityActive(recipientDid);
if (!isDidActive) throw new Error("Recipient DID is not active on-chain");

// 2. Mint Asset NFT with Person 4 AssetNFT
await assetNFT.mintAsset(assetId, assetType, ref, uri, recipientAddress, recipientDid);
```

---

## 4. Integration with Person 5 (Frontend Asset Dashboard & Auditor View)

```typescript
import { ethers } from "ethers";
import AssetNFTABI from "@/abi/AssetNFT.json";

export async function fetchAssetDetails(
  provider: ethers.Provider,
  contractAddress: string,
  tokenId: number
) {
  const contract = new ethers.Contract(contractAddress, AssetNFTABI, provider);
  const record = await contract.getAsset(tokenId);

  const statusLabels = ["None", "Registered", "Allocated", "InMaintenance", "Decommissioned"];

  return {
    tokenId: record.tokenId.toString(),
    assetId: record.assetId,
    assetType: record.assetType,
    assetReference: record.assetReference,
    metadataURI: record.metadataURI,
    currentOwner: record.currentOwner,
    ownerDid: record.ownerDid,
    status: statusLabels[record.status],
    createdAt: new Date(Number(record.createdAt) * 1000),
    updatedAt: new Date(Number(record.updatedAt) * 1000),
  };
}
```

---

## 5. Contract Dependencies & Known Limitations
1. **RBAC Dependency**: Requires a deployed contract implementing `IRBACRegistry` (supplied by Person 3).
2. **Decommissioning Terminality**: Once an asset status is set to `Decommissioned`, it cannot be revived, transferred, or allocated.
3. **Marketplace Restriction**: This is an enterprise / organizational custody tracking platform, not an open NFT marketplace. Direct token transfers must be performed by authorized roles or active custodians.
