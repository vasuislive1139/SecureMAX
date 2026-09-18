# Asset Management (Person 4)

This module handles the representation of organizational assets using ERC-721 NFTs. It manages asset registration (minting), allocation to users, and authorized transfers.

## Asset Data Model

The conceptual fields mapped to the smart contract struct:
- **assetId (uint256)**: Unique identifier for the asset (maps 1:1 with NFT Token ID).
- **assetType (string)**: The category or type of the asset (e.g., "Laptop", "Server").
- **assetReference (string)**: Internal organization reference (e.g., Serial Number).
- **metadataReference (string)**: URI pointing to off-chain metadata (e.g., IPFS hash).
- **nftTokenId (uint256)**: The ERC-721 token ID.
- **ownerIdentityReference (string)**: The Decentralized Identity (DID) of the assigned user.
- **status (string)**: Current status of the asset ("Registered", "Allocated", "Transferred").

```solidity
struct Asset {
    uint256 assetId;
    string assetType;
    string assetReference;
    string metadataReference;
    uint256 nftTokenId;
    string ownerIdentityReference;
    string status;
}
```

## Contract Dependencies & Integration
- **IRBAC.sol**: The AssetNFT contract depends on the Role-Based Access Control (RBAC) interface provided by Person 3. It expects an address to an RBAC contract during deployment.
- **Roles consumed**: The contract checks for `ADMIN_ROLE` and `MANAGER_ROLE`. 

### How RBAC is consumed:
The AssetNFT contract stores a reference to `IRBAC` and enforces role checks via the `onlyAdminOrManager` modifier. It explicitly disables standard user-initiated `transferFrom` and `safeTransferFrom` by overriding the internal OpenZeppelin `_update` function unless the caller possesses the `ADMIN_ROLE` or `MANAGER_ROLE`.

## Processes

### How NFT is minted
- An Admin or Manager calls `mintAsset(assetType, assetReference, metadataReference)`.
- The asset is minted, assigned `status = "Registered"`, and owned by the calling manager.
- Emits `AssetMinted` event.

### How asset is allocated
- An Admin or Manager calls `allocateAsset(assetId, toAddress, ownerIdentityReference)`.
- The asset is transferred to the user's blockchain address (`toAddress`), and the DID is recorded.
- The `status` becomes `"Allocated"`.
- Emits `AssetAllocated` event.

### Who can transfer
- Only Admins and Managers can execute transfers. Users cannot freely trade assets because this is an organizational asset-management system, not an unrestricted NFT marketplace.
- An Admin or Manager calls `transferAsset(assetId, toAddress, newOwnerIdentityReference)`.
- Emits `AssetTransferred` event.

### How ownership is verified
- Using the `verifyOwnership(assetId, expectedOwnerAddress, expectedIdentityReference)` function.
- It verifies both the blockchain-level ERC-721 ownership and the recorded DID ownership reference, ensuring full alignment between cryptographic ownership and organizational identity.

## Known Limitations
- The contract does not verify the real-world authenticity of the physical object itself. Authenticity originates from the authorized registration process performed by Managers/Admins.
- Private keys and KYC are strictly handled off-chain.

## Event Documentation
- `AssetMinted(uint256 indexed assetId, uint256 indexed nftTokenId, string assetType)`: Emitted when a new asset is registered.
- `AssetAllocated(uint256 indexed assetId, address indexed to, string ownerIdentityReference)`: Emitted when an asset is assigned to a user's address and DID.
- `AssetTransferred(uint256 indexed assetId, address indexed from, address indexed to)`: Emitted when an asset is moved between blockchain addresses by an Admin/Manager.

## Setup & Deployment
To test and deploy the contract within this module:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run tests:
   ```bash
   npx hardhat test
   ```
3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
   *(Ensure RBAC_ADDRESS environment variable is set or it will deploy a Mock RBAC for testing purposes).*
