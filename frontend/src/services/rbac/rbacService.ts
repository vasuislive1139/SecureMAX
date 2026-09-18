import { ethers } from "ethers";
import { UserRole } from "../../types";
import { RPC_URL } from "../api";
import { updateMockUserRole } from "../auth/authService";

export const RBAC_REGISTRY_ADDRESS =
  import.meta.env.VITE_RBAC_REGISTRY_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Standard RBAC Minimal ABI (Person 3)
const RBAC_ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function isAdmin(address account) external view returns (bool)",
  "function isManager(address account) external view returns (bool)",
  "function isAuditor(address account) external view returns (bool)",
  "function assignRole(address account, bytes32 role) external",
];

export async function checkUserRole(address: string): Promise<UserRole> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(RBAC_REGISTRY_ADDRESS, RBAC_ABI, provider);

    if (await contract.isAdmin(address)) return "ADMIN";
    if (await contract.isManager(address)) return "MANAGER";
    if (await contract.isAuditor(address)) return "AUDITOR";
    return "USER";
  } catch {
    return "USER";
  }
}

export async function assignRoleToUser(did: string, targetAddress: string, newRole: UserRole): Promise<boolean> {
  updateMockUserRole(did, newRole);
  return true;
}
