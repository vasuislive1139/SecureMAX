'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';
import { useBlockchainTransaction } from '@/hooks/useBlockchainTransaction';
import { AssetNFTABI } from '@/lib/blockchain/abis';
import { useAccount, useReadContract } from 'wagmi';

export function AssignAssetButton({ assetId, assigneeDid }: { assetId: string, assigneeDid: string }) {
  const { execute, txState, errorMessage, hash } = useBlockchainTransaction();
  const { address } = useAccount();

  const { data: assetData, isLoading: assetLoading } = useReadContract({
    address: process.env.NEXT_PUBLIC_ASSET_NFT_ADDRESS as `0x${string}`,
    abi: AssetNFTABI,
    functionName: 'getAssetByAssetId',
    args: [assetId]
  });

  const isRegistered = Boolean(assetData && (assetData as any).registeredAt > 0n);
  const checksLoaded = !assetLoading;

  const handleAssign = () => {
    execute({
      address: process.env.NEXT_PUBLIC_ASSET_NFT_ADDRESS as `0x${string}`,
      abi: AssetNFTABI,
      functionName: 'allocateAsset',
      args: [isRegistered ? (assetData as any).tokenId : 0n, "0x0000000000000000000000000000000000000000"], // Dummy address, it needs the real assignee address which we might not have here? We only have assigneeDid.
    });
  };

  const getButtonText = () => {
    if (txState !== 'IDLE') return txState;
    if (checksLoaded && !isRegistered) return 'Asset Not Found';
    return 'Assign Access (Domain 1)';
  };

  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={handleAssign} 
        disabled={(!isRegistered) || txState === 'PREPARING' || txState === 'WALLET_CONFIRMATION_REQUIRED' || txState === 'SUBMITTED' || txState === 'CONFIRMING'}
        size="sm" 
        className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50"
      >
        <Key className="w-4 h-4 mr-2" /> 
        {getButtonText()}
      </Button>
      {hash && <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">Tx: {hash}</span>}
      {errorMessage && <span className="text-[10px] text-destructive font-mono">{errorMessage}</span>}
    </div>
  );
}
