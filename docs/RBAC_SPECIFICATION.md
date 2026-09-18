# Role-Based Access Control (RBAC) Specification & Permission Matrix
**Module**: Person 3 — RBAC + Smart-Contract Authorization Engineer  
**Contract**: `blockchain/contracts/access-control/AccessControlManager.sol`  
**Status**: Implemented & Verified

---

## 1. Approved System Roles

The platform recognizes exactly four mutually distinct organizational roles. No additional roles may be created without team approval:

| Role Name | Solidity Identifier (`bytes32`) | Description |
| :--- | :--- | :--- |
| **`ADMIN`** | `keccak256("ADMIN_ROLE")` (`0xdf8b4c52...`) | Full governance, role assignment, role revocation, and emergency circuit breakers. |
| **`MANAGER`** | `keccak256("MANAGER_ROLE")` (`0x241ecf16...`) | Operational management: asset minting, custody allocation, and maintenance status locking. |
| **`AUDITOR`** | `keccak256("AUDITOR_ROLE")` (`0x03816752...`) | Compliance & inspection: read-only access to chronological audit logs, historical transfers, and status changes. |
| **`USER`** | `keccak256("USER_ROLE")` (`0x2da87770...`) | Verified individual custodian authorized to view and interact with assigned organizational assets. |

---

## 2. Complete Permission Matrix

| Platform Action | ADMIN | MANAGER | AUDITOR | USER | UNAUTHORIZED / PUBLIC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Assign / Revoke Roles** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Pause / Unpause Contracts** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Mint Organizational NFT** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Allocate Asset to Custodian DID** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Update Asset Maintenance Status** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Decommission Asset Permanently** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Transfer Owned Asset (Custodian)** | ✅ | ✅ | ❌ | ✅ (Owned Only) | ❌ |
| **Inspect Event History & Audit Logs**| ✅ | ✅ | ✅ | ❌ | ❌ (Internal UI) |
| **Verify Asset Ownership & DID** | ✅ | ✅ | ✅ | ✅ | ✅ (Public Read) |

---

## 3. On-Chain Security Invariants

> [!IMPORTANT]
> **Frontend Checks Are NOT Security**: UI controls adapt to roles for clean UX, but all state mutations are verified cryptographically on-chain via `AccessControlManager.sol` and `onlyAdminOrManager` modifiers.

1. **Admin Lockout Protection**: The smart contract strictly prohibits revoking the last remaining active Administrator to prevent permanent governance lockout (`CannotRevokeLastAdmin`).
2. **Strict Hierarchy**: Only accounts possessing `ADMIN_ROLE` can invoke `assignRole()` or `revokeRole()`. Managers and Auditors cannot escalate privileges.
3. **Zero-Address Validation**: All role assignments require a valid non-zero address.
4. **Invalid Role Rejection**: Passing undefined bytes32 hashes reverts with `InvalidRoleIdentifier`.
