# Integration Guide for Teammates (Person 2 — DID & Identity Registry)

This document provides ready-to-use interfaces, code examples, and integration assumptions for the team:
- **Person 1**: KYC / Authentication & Backend Registrar
- **Person 3**: RBAC & Authorization Smart Contracts
- **Person 4**: NFT & Asset Ownership Smart Contracts
- **Person 5**: Frontend & User Interface

---

## 1. Quick Reference & Artifacts

- **Contract Source**: `blockchain/contracts/identity/IdentityRegistry.sol`
- **Exported ABI**: `blockchain/abi/IdentityRegistry.json`
- **Deployments File**: `blockchain/deployments/identity-registry-deployment.json`

---

## 2. Integration with Person 1 (KYC / Authentication Backend)

When Person 1 finishes off-chain KYC verification for a user and registers their DID:

```typescript
import { ethers } from "ethers";
import IdentityRegistryABI from "../blockchain/abi/IdentityRegistry.json";

async function registerVerifiedUserOnChain(
  did: string,              // e.g., "did:assetchain:usr-1001-alice"
  publicKeyHex: string,     // e.g., "0x04bfcad8..."
  controllerAddress: string,// User's Ethereum address
  registrarSigner: ethers.Signer,
  identityRegistryAddress: string
) {
  const contract = new ethers.Contract(
    identityRegistryAddress,
    IdentityRegistryABI,
    registrarSigner
  );

  const publicKeyBytes = ethers.getBytes(publicKeyHex);

  const tx = await contract.registerIdentity(
    did,
    publicKeyBytes,
    controllerAddress
  );
  const receipt = await tx.wait();
  console.log(`Identity registered on-chain! Hash: ${receipt.hash}`);
}
```

---

## 3. Integration with Person 3 (RBAC & Authorization)

Person 3's contracts can query `IdentityRegistry` to verify that an identity is registered and active before granting or checking roles:

```solidity
// In RBAC / RoleRegistry contract
interface IIdentityRegistry {
    function isIdentityActive(string calldata did) external view returns (bool);
    function getIdentity(string calldata did) external view returns (
        string memory did,
        bytes memory publicKey,
        address controller,
        uint8 status,
        uint256 registeredAt,
        uint256 updatedAt
    );
    function getDidByController(address controller) external view returns (string memory);
}

contract RoleRegistry {
    IIdentityRegistry public immutable identityRegistry;

    constructor(address _identityRegistry) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    function assignRole(string calldata did, bytes32 role) external {
        require(identityRegistry.isIdentityActive(did), "Identity not active on-chain");
        // ... perform role assignment
    }
}
```

---

## 4. Integration with Person 4 (NFT / Asset Ownership)

Person 4's NFT minting and transfer logic can verify recipient identity status and resolve controller addresses directly:

```solidity
function mintAssetNFT(
    string calldata recipientDid,
    uint256 tokenId,
    string calldata metadataUri
) external {
    // Ensure recipient DID is active
    require(identityRegistry.isIdentityActive(recipientDid), "Recipient DID not active");

    (,, address controller,,,) = identityRegistry.getIdentity(recipientDid);
    _safeMint(controller, tokenId);
}
```

---

## 5. Integration with Person 5 (Frontend)

Person 5 can read identity records directly via JSON-RPC / ethers provider without requiring user signatures:

```typescript
import { ethers } from "ethers";
import IdentityRegistryABI from "@/abi/IdentityRegistry.json";

export async function fetchIdentity(provider: ethers.Provider, registryAddress: string, did: string) {
  const contract = new ethers.Contract(registryAddress, IdentityRegistryABI, provider);
  const record = await contract.getIdentity(did);
  return {
    did: record.did,
    publicKey: record.publicKey,
    controller: record.controller,
    status: ["None", "Active", "Suspended", "Revoked"][record.status],
    registeredAt: new Date(Number(record.registeredAt) * 1000),
    updatedAt: new Date(Number(record.updatedAt) * 1000),
  };
}
```

---

## 6. Assumptions & Known Limitations
1. **DID Syntax**: All DIDs must strictly start with `did:assetchain:` (max 128 bytes).
2. **Account Binding**: Enforces a strict 1-to-1 relationship between an active controller address and a DID to prevent cross-account impersonation.
3. **Revocation Terminality**: Once an identity is transitioned to `Revoked`, it cannot be reactivated on-chain. A new DID must be issued after fresh KYC.
4. **Off-Chain KYC Dependency**: Registration requires the caller to hold `REGISTRAR_ROLE` (operated by Person 1's KYC verification server or governance admin).
