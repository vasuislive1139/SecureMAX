import { ethers } from "ethers";
import { IdentityStatus, UserIdentity } from "../../types";
import { RPC_URL } from "../api";
import IdentityRegistryABI from "../../abi/IdentityRegistry.json";

export const IDENTITY_REGISTRY_ADDRESS =
  import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function getReadOnlyContract(): ethers.Contract {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(IDENTITY_REGISTRY_ADDRESS, IdentityRegistryABI, provider);
}

/**
 * Consumes Person 2's on-chain Identity Registry.
 */
export async function getOnChainIdentity(did: string): Promise<UserIdentity | null> {
  try {
    const contract = getReadOnlyContract();
    const record = await contract.getIdentity(did);

    const statusMap: IdentityStatus[] = ["None", "Active", "Suspended", "Revoked"];

    return {
      userId: did.replace("did:assetchain:", ""),
      did: record.did,
      publicKey: record.publicKey,
      controllerAddress: record.controller,
      role: "USER",
      identityStatus: statusMap[Number(record.status)] || "Active",
      kycStatus: "Verified",
      registeredAt: Number(record.registeredAt) * 1000,
      updatedAt: Number(record.updatedAt) * 1000,
    };
  } catch (err) {
    return null;
  }
}

export async function isIdentityActive(did: string): Promise<boolean> {
  try {
    const contract = getReadOnlyContract();
    return await contract.isIdentityActive(did);
  } catch {
    return true; // fallback
  }
}
