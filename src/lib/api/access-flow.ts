import 'server-only';
import { supabaseAdmin, createAuthenticatedClient } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { issueTemporaryDecryptionToken, fetchAndDecryptDEK, validateTemporaryDecryptionToken } from '../kms';
import { decryptData } from '../crypto';
import { AuditEventType } from '../../types';
// In a real implementation we would import viem/ethers to verify on-chain states here.
// For the prototype's Node.js backend validation phase, we mock the blockchain RPC read.
import { verifyChain1Access, verifyChain2Policy } from '../blockchain/oracle';

export async function authorizeAssetAccess(userJwt: string, userId: string, assetId: string, sessionId: string) {
  // 1. Establish RLS client using the User's JWT (Prevent DB-level IDOR)
  const userClient = createAuthenticatedClient(userJwt);

  // 2. Database validation (Fastest path rejection)
  const { data: assignment, error: dbError } = await userClient
    .from('asset_assignments')
    .select('status, asset_permissions(can_decrypt)')
    .eq('asset_id', assetId)
    .eq('user_id', userId)
    .single();

  if (dbError || !assignment || assignment.status !== 'ACTIVE' || !assignment.asset_permissions?.[0]?.can_decrypt) {
    await logAuditEvent({
      eventType: AuditEventType.ACCESS_DENIED,
      actorId: userId,
      targetType: 'ASSET',
      targetId: assetId,
      details: { reason: 'Database RBAC/Assignment validation failed' }
    });
    throw new Error('Access Denied: You do not have active assignment to decrypt this asset.');
  }

  // 3. Chain-1 Identity & Access Validation (Source of Truth for Ownership)
  const chain1Result = await verifyChain1Access(userId, assetId);
  if (!chain1Result.allowed) {
    await logAuditEvent({
      eventType: AuditEventType.ACCESS_DENIED,
      actorId: userId,
      targetType: 'ASSET',
      targetId: assetId,
      details: { reason: `Blockchain-1 Assignment Validation Failed: ${chain1Result.reason}`, status: chain1Result.status }
    });
    throw new Error(`Access Denied: Blockchain Identity/Access layer rejected authorization. Reason: ${chain1Result.reason}`);
  }

  // 4. Chain-2 KMS Policy Validation (Source of Truth for Key Rules)
  const chain2Result = await verifyChain2Policy(assetId);
  if (!chain2Result.allowed) {
    await logAuditEvent({
      eventType: AuditEventType.KEY_ACCESS_DENIED,
      actorId: userId,
      targetType: 'KEY_POLICY',
      targetId: assetId,
      details: { reason: `Blockchain-2 Policy Validation Failed: ${chain2Result.reason}`, status: chain2Result.status }
    });
    throw new Error(`Access Denied: Key Management Policy rejected authorization. Reason: ${chain2Result.reason}`);
  }

  // 5. Issue Cryptographically Bound Temporary Token (30 min)
  const tempToken = await issueTemporaryDecryptionToken({
    userId,
    assetId,
    sessionId,
    permissions: ['can_decrypt']
  });

  await logAuditEvent({
    eventType: AuditEventType.TEMPORARY_KEY_AUTHORIZED,
    actorId: userId,
    targetType: 'ASSET',
    targetId: assetId,
    details: { sessionId, expires: '30m' }
  });

  return { tempToken };
}

export async function executeDecryption(
  assetId: string, 
  encryptedFileBuffer: Buffer, 
  encryptedFileIV: string, 
  encryptedFileAuthTag: string,
  tempToken: string,
  sessionId: string
) {
  // 1. Cryptographically validate the temporary token and bindings before touching KMS
  await validateTemporaryDecryptionToken(tempToken, sessionId, assetId);
  
  // 2. Check if the session is still active in the database (Revocation Check)
  const { data: sessionData, error: sessionErr } = await supabaseAdmin
    .from('access_sessions')
    .select('status')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !sessionData || sessionData.status !== 'ACTIVE') {
    throw new Error('Session Revoked: Access session has been administratively terminated.');
  }

  // 3. Fetch DEK securely inside the KMS boundary
  const dekPlaintext = await fetchAndDecryptDEK(assetId);

  // 4. Bind the AAD string (Must match the one used during encryption, typically the assetId)
  const aadString = `asset_data:${assetId}`;

  // 5. Execute Decryption
  try {
    const plaintext = decryptData(
      encryptedFileBuffer.toString('base64'),
      dekPlaintext,
      encryptedFileIV,
      encryptedFileAuthTag,
      aadString
    );
    
    // Explicitly wipe the DEK from memory after use (Best practice, though V8 GC manages it)
    dekPlaintext.fill(0);

    return plaintext;
  } catch (error) {
    throw new Error('Decryption Failed: Data tampering detected or incorrect key.');
  }
}

export async function revokeAssetAccess(adminId: string, targetUserId: string, assetId: string, sessionIdToInvalidate: string) {
  // 1. Update Database (Fast fail on next request)
  await supabaseAdmin
    .from('asset_assignments')
    .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
    .eq('user_id', targetUserId)
    .eq('asset_id', assetId);

  // 2. Invalidate Active Session Context
  await supabaseAdmin
    .from('access_sessions')
    .update({ status: 'REVOKED' })
    .eq('id', sessionIdToInvalidate);

  // 3. Write Revocation Event to Audit Log
  await logAuditEvent({
    eventType: AuditEventType.ROLE_REVOKED,
    actorId: adminId,
    targetType: 'USER_ASSET',
    targetId: targetUserId,
    details: { assetId, revokedSession: sessionIdToInvalidate }
  });

  // Note: Actual Blockchain 1/2 revocation requires a signed tx from the admin's wallet.
  // The API signals the frontend to prompt the admin's Metamask to execute:
  // AssetNFT.revokeAssignment(assetId, targetUserId) on Chain-1.
  return { 
    success: true, 
    blockchainActionRequired: true, 
    actionTarget: 'AssetNFT',
    method: 'revokeAssignment'
  };
}
