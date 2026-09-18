# AssetNFT Smart Contract Documentation

**Contract Name**: `AssetNFT`  
**Standard**: `ERC-721` (`ERC721URIStorage`)  
**Solidity Version**: `^0.8.20`  
**License**: `MIT`  
**File Location**: `blockchain/contracts/assets/AssetNFT.sol` (and `blockchain/assets/AssetNFT.sol`)

---

## 1. RBAC Consumption Architecture

`AssetNFT` does NOT implement a competing access control registry. It consumes the `IRBACRegistry` interface provided by **Person 3**:

```solidity
interface IRBACRegistry {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function isAdmin(address account) external view returns (bool);
    function isManager(address account) external view returns (bool);
    function isAuditor(address account) external view returns (bool);
}
```

### Authorization Matrix

| Operation | ADMIN | MANAGER | AUDITOR | TOKEN OWNER / APPROVED | UNAUTHORIZED USER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`mintAsset`** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **`allocateAsset`** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **`transferAsset`** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **`updateAssetStatus`**| ✅ | ✅ | ❌ | ❌ | ❌ |
| **`updateMetadataURI`**| ✅ | ✅ | ❌ | ❌ | ❌ |
| **`setRBACRegistry`** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **`pause / unpause`** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **`getAsset / verify`**| ✅ | ✅ | ✅ | ✅ | ✅ (Public View) |

---

## 2. Functions Reference

### 2.1 State-Changing Functions

#### `mintAsset(string calldata assetId, string calldata assetType, string calldata assetReference, string calldata metadataURI, address initialRecipient, string calldata recipientDid)`
- **Access**: `ADMIN_ROLE` or `MANAGER_ROLE`.
- **Description**: Mints a new ERC-721 token, sets token URI, initializes `AssetRecord`, and increments token counter.
- **Errors**: `UnauthorizedAccess`, `AssetAlreadyExists`, `InvalidRecipientAddress`, `InvalidAssetData`.
- **Emits**: `AssetMinted`

#### `allocateAsset(uint256 tokenId, address newOwner, string calldata newOwnerDid)`
- **Access**: `ADMIN_ROLE` or `MANAGER_ROLE`.
- **Description**: Reassigns custody to a new user and marks status as `Allocated`. Performs underlying ERC-721 transfer.
- **Errors**: `UnauthorizedAccess`, `AssetNotFound`, `AssetDecommissioned`, `AssetInMaintenance`, `InvalidRecipientAddress`.
- **Emits**: `AssetAllocated`

#### `transferAsset(uint256 tokenId, address to, string calldata toDid)`
- **Access**: `ADMIN_ROLE`, `MANAGER_ROLE`, token owner, or approved operator.
- **Description**: Authorized transfer of organizational asset.
- **Errors**: `UnauthorizedAccess`, `AssetNotFound`, `AssetDecommissioned`, `AssetInMaintenance`, `InvalidRecipientAddress`.
- **Emits**: `AssetTransferred`

#### `updateAssetStatus(uint256 tokenId, AssetStatus newStatus)`
- **Access**: `ADMIN_ROLE` or `MANAGER_ROLE`.
- **Description**: Updates status (e.g., to `InMaintenance` or terminal `Decommissioned`).
- **Errors**: `UnauthorizedAccess`, `AssetNotFound`, `AssetDecommissioned`, `InvalidStatusTransition`.
- **Emits**: `AssetStatusUpdated`

#### `updateMetadataURI(uint256 tokenId, string calldata newURI)`
- **Access**: `ADMIN_ROLE` or `MANAGER_ROLE`.
- **Description**: Updates metadata reference URI on IPFS/Web.
- **Emits**: `AssetMetadataUpdated`

#### `setRBACRegistry(address newRbacRegistry)`
- **Access**: `ADMIN_ROLE` only.
- **Emits**: `RBACRegistryUpdated`

---

### 2.2 View / Query Functions

#### `getAsset(uint256 tokenId)` → `AssetRecord`
- Returns complete asset struct by token ID.

#### `getAssetByAssetId(string calldata assetId)` → `AssetRecord`
- Returns complete asset struct by organizational asset ID.

#### `verifyOwnership(uint256 tokenId, address claimant, string calldata claimantDid)` → `(bool isOwner, bool isDidMatch, AssetStatus status)`
- Validates whether an address and DID claim match on-chain custody records.

---

## 3. Events

```solidity
event AssetMinted(
    uint256 indexed tokenId,
    string indexed assetIdHash,
    string assetId,
    string assetType,
    address indexed owner,
    string ownerDid,
    uint256 timestamp
);

event AssetAllocated(
    uint256 indexed tokenId,
    string assetId,
    address indexed previousOwner,
    address indexed newOwner,
    string newOwnerDid,
    uint256 timestamp
);

event AssetTransferred(
    uint256 indexed tokenId,
    string assetId,
    address indexed from,
    address indexed to,
    string toDid,
    address operator,
    uint256 timestamp
);

event AssetStatusUpdated(
    uint256 indexed tokenId,
    string assetId,
    AssetStatus previousStatus,
    AssetStatus newStatus,
    address indexed updatedBy,
    uint256 timestamp
);

event RBACRegistryUpdated(
    address indexed previousRegistry,
    address indexed newRegistry,
    uint256 timestamp
);

event AssetMetadataUpdated(
    uint256 indexed tokenId,
    string previousURI,
    string newURI,
    address indexed updatedBy,
    uint256 timestamp
);
```

---

## 4. Custom Errors

- `UnauthorizedAccess(address caller)`: Caller lacks Admin, Manager, or Owner permissions.
- `AssetAlreadyExists(string assetId)`: Attempt to re-register an existing organizational asset ID.
- `AssetNotFound(uint256 tokenId)`: Token ID does not exist or has zero status.
- `AssetDecommissioned(uint256 tokenId)`: Attempted operation on a permanently decommissioned asset.
- `AssetInMaintenance(uint256 tokenId)`: Attempted transfer/allocation while locked for maintenance.
- `InvalidRecipientAddress()`: Recipient address is `address(0)`.
- `InvalidAssetData(string reason)`: String format, length, or boundary violation.
- `InvalidStatusTransition(AssetStatus currentStatus, AssetStatus newStatus)`: Forbidden status change.
- `ZeroAddressNotAllowed()`: Configuration passed `address(0)`.
