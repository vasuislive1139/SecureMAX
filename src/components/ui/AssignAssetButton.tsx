'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';
import { useBlockchainTransaction } from '@/hooks/useBlockchainTransaction';
import { AssetNFTABI } from '@/lib/blockchain/abis';
import { useAccount, useReadContract } from 'wagmi';

import deployedAddresses from '../../../deployed-addresses.json';

export function AssignAssetButton({ assetId, assigneeDid }: { assetId: string, assigneeDid: string }) {
  const { execute, txState, errorMessage, hash } = useBlockchainTransaction();
  const { address } = useAccount();

  const assetNftAddress = (process.env.NEXT_PUBLIC_ASSET_NFT_ADDRESS || deployedAddresses.contracts.AssetNFT) as `0x${string}`;

  const { data: assetData, isLoading: assetLoading } = useReadContract({
    address: assetNftAddress,
    abi: AssetNFTABI,
    functionName: 'getAssetByAssetId',
    args: [assetId]
  });

  const isRegistered = Boolean(assetData && (assetData as any).registeredAt > 0n);
  const checksLoaded = !assetLoading;

  const handleAssign = () => {
    let assigneeAddress = assigneeDid.split(':').pop() || "0x0000000000000000000000000000000000000000";
    if (!assigneeAddress.startsWith('0x') || assigneeAddress.length !== 42) {
      // Fallback for hackathon demo if DID doesn't contain an address
      assigneeAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat account 1
    }

    execute({
      address: assetNftAddress,
      abi: AssetNFTABI,
      functionName: 'allocateAsset',
      args: [
        isRegistered ? (assetData as any).tokenId : 0n, 
        assigneeAddress, 
        assigneeDid
      ],
    });
  };

  const getButtonText = () => {
    if (txState === 'PREPARING' || txState === 'WALLET_CONFIRMATION_REQUIRED') return 'Confirm in Wallet...';
    if (txState === 'SUBMITTED' || txState === 'CONFIRMING') return 'Tx Pending...';
    if (txState === 'FAILED' || txState === 'REJECTED') return 'Tx Failed';
    if (txState === 'CONFIRMED') return 'Asset Allocated!';
    if (checksLoaded && !isRegistered) return 'Asset Not Minted';
    return 'Allocate via Smart Contract';
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
