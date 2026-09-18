# Frontend & System Integration Guide (Person 5)

**Module**: Person 5 — Frontend + System Integration Engineer  
**Framework**: React 18, Vite, TypeScript, Tailwind CSS, ethers.js  
**Status**: Implemented, Built, Tested, and Verified

---

## 1. Integrations Summary

### 1.1 Consumed APIs (Person 1 — KYC & Authentication)
- `POST /api/kyc/register`: Transmits off-chain KYC fields along with public key, controller address, and DID.
- `POST /api/auth/challenge`: Requests an ephemeral login challenge for a DID.
- `POST /api/auth/verify`: Verifies the client-side cryptographic signature against the challenge.

### 1.2 Consumed Smart Contracts
- **Person 2 (`IdentityRegistry.sol`)**:
  - `getIdentity(string did)`: Queries on-chain identity record and timestamps.
  - `isIdentityActive(string did)`: Validates active status prior to operations.
- **Person 3 (`RBACRegistry.sol`)**:
  - `isAdmin(address)` / `isManager(address)` / `isAuditor(address)` / `hasRole(role, address)`.
- **Person 4 (`AssetNFT.sol`)**:
  - `getAsset(uint256 tokenId)` / `getAssetByAssetId(string assetId)`: Fetches token metadata.
  - `mintAsset(...)`: Mints organizational NFT to recipient DID.
  - `allocateAsset(...)`: Assigns custody to an employee DID.
  - `transferAsset(...)`: Transfers custody.
  - `updateAssetStatus(...)`: Toggles maintenance or decommissioning status.

---

## 2. Environment Variables Configuration

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | `http://localhost:5000` | Backend KYC / Auth API URL |
| `VITE_RPC_URL` | `http://127.0.0.1:8545` | EVM JSON-RPC provider endpoint |
| `VITE_IDENTITY_REGISTRY_ADDRESS` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Deployed IdentityRegistry address |
| `VITE_RBAC_REGISTRY_ADDRESS` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Deployed RBACRegistry address |
| `VITE_ASSET_NFT_ADDRESS` | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | Deployed AssetNFT address |

---

## 3. Security Design & Known Limitations
1. **No MetaMask**: The UI does not depend on MetaMask or browser extensions. All cryptographic key operations occur in local client memory via Web Crypto API / ethers.js wallet signing.
2. **Zero-PII On Blockchain**: The frontend ensures that user personal data is only sent to Person 1's off-chain KYC endpoint and is never broadcasted to smart contracts.
3. **UX-Only Role Checks**: UI views adapt to the user's role for clean UX, but all actual enforcement is verified cryptographically by backend APIs and smart contracts.
