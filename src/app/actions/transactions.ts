'use server';

import { supabaseAdmin } from '@/lib/db/client';
import { ChainType } from '@/types';
import { getVerifiedSession } from '@/lib/auth/session';

export async function logTransaction(data: {
  tx_hash: string;
  chain_id: ChainType;
  entity_type: string;
  entity_id: string;
  status: string;
}) {
  if (require('@/lib/auth/deviceStore').deviceStore?.readyPromise) {
    await require('@/lib/auth/deviceStore').deviceStore.readyPromise;
  }
  try {
    await getVerifiedSession(); // Ensure user is authenticated

    const { error } = await supabaseAdmin
      .from('blockchain_transactions')
      .upsert({
        tx_hash: data.tx_hash,
        chain_id: data.chain_id,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        status: data.status,
      }, { onConflict: 'tx_hash' });

    if (error) throw error;
    
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to log blockchain transaction:', err);
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return { success: false, error: err.message };
  }
}
