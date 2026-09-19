import 'server-only';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { AssetNFTABI } from './abis';

import deployedAddresses from '../../../deployed-addresses.json';

export type OracleResult = {
  allowed: boolean;
  status: 'AUTHORIZED' | 'DENIED' | 'UNAVAILABLE' | 'ERROR' | 'CONFIG_ERROR';
  chainId: number;
  contractAddress?: string;
  reason?: string;
};

const targetChain = sepolia;
const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/alch_0qnxXuC1AluDumPOynCns';

const publicClient = createPublicClient({
  chain: targetChain,
  transport: http(rpcUrl),
});

export async function verifyChain1Access(userId: string, assetId: string): Promise<OracleResult> {
  const contractAddress = (process.env.NEXT_PUBLIC_ASSET_NFT_ADDRESS || deployedAddresses.contracts.AssetNFT) as `0x${string}`;
  if (!contractAddress) {
    return { allowed: false, status: 'CONFIG_ERROR', chainId: targetChain.id, reason: 'AssetNFT address not configured' };
  }

  try {
    // For demo MVP, we assume authorized if Asset exists on chain and is active.
    // Real verification would check owner address against identity.
    const asset = await publicClient.readContract({
      address: contractAddress,
      abi: AssetNFTABI,
      functionName: 'getAssetByAssetId',
      args: [assetId],
    });

    if (asset && (asset as any).status !== 3 && (asset as any).status !== 2) { // not decommissioned or suspended
      return { allowed: true, status: 'AUTHORIZED', chainId: targetChain.id, contractAddress };
    } else {
      return { allowed: false, status: 'DENIED', chainId: targetChain.id, contractAddress, reason: 'No active assignment found on Chain-1' };
    }
  } catch (error: any) {
    console.error('Chain 1 Oracle Error:', error.message);
    return { allowed: false, status: 'UNAVAILABLE', chainId: targetChain.id, contractAddress, reason: 'RPC Failure or Contract Revert' };
  }
}

export async function verifyChain2Policy(assetId: string): Promise<OracleResult> {
  // Deprecated Chain 2. Return authorized for demo to allow flow to proceed.
  return { allowed: true, status: 'AUTHORIZED', chainId: targetChain.id };
}
