# Integration Guide for Teammates (Person 3 — RBAC & Authorization)

This guide documents how each teammate consumes the `AccessControlManager` smart contract and interface.

---

## 1. Quick Reference & Artifacts

- **Contract Source**: `blockchain/contracts/access-control/AccessControlManager.sol` (and `blockchain/access-control/AccessControlManager.sol`)
- **Shared Interface**: `blockchain/contracts/interfaces/IRBACRegistry.sol`
- **Exported ABI**: `blockchain/abi/AccessControlManager.json`
- **Deployments Info**: `blockchain/deployments/rbac-deployment.json`

---

## 2. Integration with Person 4 (AssetNFT Smart Contract)

Person 4's `AssetNFT.sol` contract directly consumes `IRBACRegistry` to enforce on-chain role checks:

```solidity
import "../interfaces/IRBACRegistry.sol";

contract AssetNFT {
    IRBACRegistry public rbacRegistry;

    modifier onlyAdminOrManager() {
        require(
            rbacRegistry.isAdmin(msg.sender) || rbacRegistry.isManager(msg.sender),
            "Unauthorized access"
        );
        _;
    }
}
```

---

## 3. Integration with Person 1 (Backend KYC & Role Sync)

After off-chain KYC verification, Person 1 can assign the default `USER_ROLE` (or administrative roles) on-chain using an Admin signer:

```typescript
import { ethers } from "ethers";
import AccessControlManagerABI from "../blockchain/abi/AccessControlManager.json";

export async function assignUserRoleOnChain(
  rbacContractAddress: string,
  adminSigner: ethers.Signer,
  targetUserAddress: string
) {
  const contract = new ethers.Contract(rbacContractAddress, AccessControlManagerABI, adminSigner);
  const USER_ROLE = await contract.USER_ROLE();

  const tx = await contract.assignRole(USER_ROLE, targetUserAddress);
  await tx.wait();
  console.log(`Role assigned on-chain to ${targetUserAddress}`);
}
```

---

## 4. Integration with Person 5 (Frontend Dashboard & Permissions)

Person 5 can query role statuses via JSON-RPC read-only calls:

```typescript
import { ethers } from "ethers";
import AccessControlManagerABI from "@/abi/AccessControlManager.json";

export async function getUserRoles(
  provider: ethers.Provider,
  rbacAddress: string,
  userAddress: string
) {
  const contract = new ethers.Contract(rbacAddress, AccessControlManagerABI, provider);

  const [isAdmin, isManager, isAuditor] = await Promise.all([
    contract.isAdmin(userAddress),
    contract.isManager(userAddress),
    contract.isAuditor(userAddress),
  ]);

  if (isAdmin) return "ADMIN";
  if (isManager) return "MANAGER";
  if (isAuditor) return "AUDITOR";
  return "USER";
}
```

---

## 5. Known Limitations
1. **Four Fixed Roles**: Any additional roles require contract upgrades or team approval.
2. **Admin Lockout Guard**: You cannot revoke the last remaining admin address without first designating another administrator.
