import 'server-only';
import { deriveKEK, generateDEK, encryptData, decryptData } from '../crypto';
import { supabaseAdmin } from '../db/client';
import { SignJWT, jwtVerify } from 'jose';

function getMasterKeyHex(): string | undefined {
  return process.env.SECUREMAX_KMS_MASTER_KEY || (process.env.NODE_ENV === 'test' ? '0000000000000000000000000000000000000000000000000000000000000000' : undefined);
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');

// ==========================================
// KMS Envelope Encryption Lifecycle
// ==========================================

export async function createAssetKey(assetId: string): Promise<{ dekPlaintext: Buffer, keyId: string, versionId: string }> {
  const masterKey = getMasterKeyHex();
  if (!masterKey) throw new Error('KMS Master Key not configured');

  // 1. Generate new DEK
  const dek = generateDEK();

  // 2. Derive Asset-Specific KEK
  const kek = deriveKEK(masterKey, assetId);

  // 3. Encrypt DEK using KEK
  const aad = `key_wrapping:${assetId}`;
  const encryptedPayload = encryptData(dek, kek, aad);
  const packedDek = JSON.stringify({
    cipher: encryptedPayload.ciphertext,
    auth: encryptedPayload.authTag,
  });

  // 4. Store in Database via Admin Client (Bypassing RLS safely)
  const { data: keyRecord, error: keyErr } = await supabaseAdmin
    .from('encryption_keys')
    .insert({ asset_id: assetId, algorithm: 'aes-256-gcm' })
    .select('id')
    .single();
    
  if (keyErr || !keyRecord) throw new Error('Failed to create key record');

  const { data: versionRecord, error: verErr } = await supabaseAdmin
    .from('key_versions')
    .insert({
      key_id: keyRecord.id,
      version_number: 1,
      encrypted_dek: packedDek,
      dek_iv: encryptedPayload.iv,
      status: 'ACTIVE'
    })
    .select('id')
    .single();

  if (verErr || !versionRecord) throw new Error('Failed to create key version');

  return { dekPlaintext: dek, keyId: keyRecord.id, versionId: versionRecord.id };
}

export async function fetchAndDecryptDEK(assetId: string): Promise<Buffer> {
  const masterKey = getMasterKeyHex();
  if (!masterKey) throw new Error('KMS Master Key not configured');

  // Retrieve the ACTIVE key version
  const { data: keyRecord, error: keyErr } = await supabaseAdmin
    .from('encryption_keys')
    .select('id, key_versions(encrypted_dek, dek_iv, status)')
    .eq('asset_id', assetId)
    .single();

  if (keyErr || !keyRecord || !keyRecord.key_versions) throw new Error('Key not found');

  // Safely find active version
  const activeVersion = Array.isArray(keyRecord.key_versions) 
    ? keyRecord.key_versions.find((v: any) => v.status === 'ACTIVE')
    : (keyRecord.key_versions as any).status === 'ACTIVE' ? keyRecord.key_versions : null;

  if (!activeVersion) throw new Error('No ACTIVE key version found for asset');

  const packedDek = JSON.parse(activeVersion.encrypted_dek);
  const kek = deriveKEK(masterKey, assetId);
  const aad = `key_wrapping:${assetId}`;

  // Decrypt DEK
  return decryptData(packedDek.cipher, kek, activeVersion.dek_iv, packedDek.auth, aad);
}

// ==========================================
// KMS Temporary Authorization
// ==========================================

export interface TempAuthPayload {
  userId: string;
  assetId: string;
  sessionId: string;
  permissions: string[];
}

export async function issueTemporaryDecryptionToken(payload: TempAuthPayload): Promise<string> {
  // 30 minute time limit per strict architectural constraints
  const token = await new SignJWT({ 
    userId: payload.userId,
    assetId: payload.assetId,
    sessionId: payload.sessionId,
    permissions: payload.permissions
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(JWT_SECRET);

  return token;
}

export async function validateTemporaryDecryptionToken(token: string, expectedSessionId: string, expectedAssetId: string): Promise<TempAuthPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (payload.sessionId !== expectedSessionId) {
      throw new Error('Session binding mismatch: Token was hijacked or replayed in a different context.');
    }
    if (payload.assetId !== expectedAssetId) {
      throw new Error('Asset binding mismatch: Token attempting to decrypt unauthorized asset.');
    }
    if (!(payload.permissions as string[])?.includes('can_decrypt')) {
      throw new Error('Permission mismatch: Token lacks decrypt authority.');
    }

    return payload as unknown as TempAuthPayload;
  } catch (error: any) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
}
