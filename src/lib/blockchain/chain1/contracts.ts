import { Contract, Provider, Signer } from "ethers";

import IdentityRegistryArtifact from "../abi/IdentityRegistry.json";
import AccessControlManagerArtifact from "../abi/AccessControlManager.json";
import AssetNFTArtifact from "../abi/AssetNFT.json";

export function getIdentityRegistryContract(providerOrSigner: Provider | Signer): Contract {
  const address = process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS not set");
  return new Contract(address, IdentityRegistryArtifact.abi, providerOrSigner);
}

export function getAccessControlManagerContract(providerOrSigner: Provider | Signer): Contract {
  const address = process.env.NEXT_PUBLIC_ACCESS_CONTROL_MANAGER_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_ACCESS_CONTROL_MANAGER_ADDRESS not set");
  return new Contract(address, AccessControlManagerArtifact.abi, providerOrSigner);
}

export function getAssetNFTContract(providerOrSigner: Provider | Signer): Contract {
  const address = process.env.NEXT_PUBLIC_ASSET_NFT_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_ASSET_NFT_ADDRESS not set");
  return new Contract(address, AssetNFTArtifact.abi, providerOrSigner);
}
