'use server';

import { executeSentinelScan } from '@/lib/sentinel/engine';
import { supabaseAdmin } from '@/lib/db/client';
import { getVerifiedSession } from '@/lib/auth/session';
import { UserRole } from '@/types';

export async function runSecurityScanAction(userId: string) {
  
  if (require('@/lib/auth/deviceStore').deviceStore) {
    await require('@/lib/auth/deviceStore').deviceStore.loadFromCloud();
  }
  try {
    const session = await getVerifiedSession();
    if (session.role !== UserRole.ADMIN && session.role !== UserRole.SECURITY_ANALYST) {
      throw new Error('Forbidden: Insufficient privileges');
    }

    const scanId = await executeSentinelScan(session.userId); // Use secure userId
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return { success: true, scanId };
  } catch (error: any) {
    console.error('Sentinel Scan Error:', error);
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return { success: false, error: error.message };
  }
}

export async function fetchSecurityPosture() {
  
  if (require('@/lib/auth/deviceStore').deviceStore) {
    await require('@/lib/auth/deviceStore').deviceStore.loadFromCloud();
  }
  try {
    const session = await getVerifiedSession();
    if (session.role !== UserRole.ADMIN && session.role !== UserRole.SECURITY_ANALYST) {
      throw new Error('Forbidden: Insufficient privileges');
    }

    const [scans, findings, incidents] = await Promise.all([
      supabaseAdmin.from('security_scans').select('*').order('started_at', { ascending: false }).limit(5),
      supabaseAdmin.from('security_findings').select('*').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('security_incidents').select('*').eq('status', 'OPEN')
    ]);

    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return {
      scans: scans.data || [],
      findings: findings.data || [],
      incidents: incidents.data || []
    };
  } catch (error) {
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return { scans: [], findings: [], incidents: [] };
  }
}
