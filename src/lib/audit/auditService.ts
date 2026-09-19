import crypto from 'crypto';

export type AuditLayer = 'Application' | 'Blockchain' | 'Security' | 'KMS';
export type AuditResult = 'ALLOWED' | 'DENIED' | 'FAILED';

export interface CanonicalAuditActor {
  user_id: string;
  did: string;
  role: string;
  user_name?: string;
  user_email?: string;
}

export interface CanonicalAuditDevice {
  device_id: string;
  device_type: string;
  ip_hash: string;
  user_agent_hash: string;
}

export interface CanonicalAuditResource {
  resource_type: 'ASSET' | 'IDENTITY' | 'ROLE' | 'DEVICE' | 'POLICY' | 'KMS_KEY' | 'SESSION';
  resource_id: string;
  asset_id?: string;
  asset_name?: string;
  asset_version?: number;
}

export interface CanonicalAuditAction {
  operation: string; // DECRYPT, VIEW, DOWNLOAD, LOGIN, DEVICE_ENROLL, ROLE_ASSIGN, KEY_ROTATE, etc.
  permission?: string;
}

export interface CanonicalAuditAuthorization {
  result: AuditResult;
  policy?: string;
  reason_code: string;
}

export interface CanonicalAuditCryptography {
  encryption: string; // 'AES-256-GCM'
  key_version: number;
}

export interface CanonicalAuditBlockchain {
  network: string; // 'sepolia'
  contract: string;
  transaction_hash: string;
  block_number: number;
}

export interface CanonicalAuditRequest {
  request_id: string;
  session_id: string;
}

export interface CanonicalAuditIntegrity {
  event_hash: string;
  previous_event_hash: string;
}

export interface CanonicalAuditEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  layer: AuditLayer;
  actor: CanonicalAuditActor;
  device: CanonicalAuditDevice;
  resource: CanonicalAuditResource;
  action: CanonicalAuditAction;
  authorization: CanonicalAuditAuthorization;
  cryptography?: CanonicalAuditCryptography;
  blockchain?: CanonicalAuditBlockchain;
  request: CanonicalAuditRequest;
  integrity: CanonicalAuditIntegrity;
  metadata?: Record<string, any>;

  // Backward compatibility fields for legacy UI and unit tests
  id: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  target_id?: string;
  user_email?: string;
  user_name?: string;
  event_hash: string;
  prev_hash?: string;
  block_number?: number;
  created_at: string;
}

export interface RecordAuditParams {
  eventType: string;
  layer: AuditLayer;
  actor: {
    userId: string;
    did: string;
    role: string;
    userName?: string;
    userEmail?: string;
  };
  device?: {
    deviceId?: string;
    deviceType?: string;
    rawIp?: string;
    rawUserAgent?: string;
  };
  resource: {
    resourceType: 'ASSET' | 'IDENTITY' | 'ROLE' | 'DEVICE' | 'POLICY' | 'KMS_KEY' | 'SESSION';
    resourceId: string;
    assetName?: string;
    assetVersion?: number;
  };
  action: {
    operation: string;
    permission?: string;
  };
  authorization: {
    result: AuditResult;
    policy?: string;
    reasonCode: string;
  };
  cryptography?: {
    encryption?: string;
    keyVersion?: number;
  };
  blockchain?: {
    network?: string;
    contract?: string;
    transactionHash?: string;
    blockNumber?: number;
  };
  request?: {
    requestId?: string;
    sessionId?: string;
  };
  description?: string;
  metadata?: Record<string, any>;
}

// Helper to create SHA-256 hex string
export function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Compute deterministic hash for audit integrity
export function computeCanonicalHash(
  eventId: string,
  eventType: string,
  occurredAt: string,
  userId: string,
  resourceId: string,
  operation: string,
  result: string,
  previousHash: string
): string {
  const payload = `${eventId}|${eventType}|${occurredAt}|${userId}|${resourceId}|${operation}|${result}|${previousHash}`;
  return '0x' + sha256Hex(payload);
}

class AuditService {
  private chain: CanonicalAuditEvent[] = [];

  constructor() {
    this.seedCanonicalAuditChain();
  }

  /**
   * Seed realistic initial chain correlating identity, device, assets, and security
   */
  private seedCanonicalAuditChain() {
    const GENESIS_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
    let currentPrevHash = GENESIS_HASH;

    const baseSeeds: Array<{
      id: string;
      type: string;
      layer: AuditLayer;
      offsetMinutes: number;
      actor: { id: string; did: string; role: string; name: string; email: string };
      device: { id: string; type: string };
      resource: { type: 'ASSET' | 'IDENTITY' | 'ROLE' | 'DEVICE' | 'POLICY' | 'KMS_KEY' | 'SESSION'; id: string; name?: string; version?: number };
      action: { op: string; perm?: string };
      auth: { result: AuditResult; policy: string; reason: string };
      crypto?: { enc: string; ver: number };
      blockchain?: { net: string; contract: string; tx: string; block: number };
      desc: string;
    }> = [
      {
        id: 'AUD-01J8F90001',
        type: 'IDENTITY_REGISTERED',
        layer: 'Blockchain',
        offsetMinutes: 180,
        actor: { id: 'usr_admin_001', did: 'did:securemax:admin:001', role: 'ADMIN', name: 'Vasu (Administrator)', email: 'admin@securemax.mil' },
        device: { id: 'dev_admin_primary', type: 'macOS Workstation' },
        resource: { type: 'IDENTITY', id: 'did:securemax:user:002', name: 'Vasu (Field Operator)' },
        action: { op: 'REGISTER_IDENTITY', perm: 'ADMIN' },
        auth: { result: 'ALLOWED', policy: 'IDENTITY_REGISTRY_CONTROLLER', reason: 'ADMIN_ONBOARDING_INITIALIZED' },
        blockchain: {
          net: 'sepolia',
          contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
          tx: '0x3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef01',
          block: 6849180,
        },
        desc: 'Identity did:securemax:user:002 registered on Sepolia IdentityRegistry contract',
      },
      {
        id: 'AUD-01J8F90002',
        type: 'DEVICE_REGISTERED',
        layer: 'Application',
        offsetMinutes: 150,
        actor: { id: 'usr_vasu_002', did: 'did:securemax:user:002', role: 'USER', name: 'Vasu', email: 'vasu@securemax.mil' },
        device: { id: 'dev_vasu_laptop', type: 'Windows 11 Workstation' },
        resource: { type: 'DEVICE', id: 'dev_vasu_laptop', name: 'Workstation Laptop A' },
        action: { op: 'DEVICE_ENROLLMENT', perm: 'ENROLL_DEVICE' },
        auth: { result: 'ALLOWED', policy: 'DEVICE_ATTESTATION_POLICY', reason: 'ECDSA_P256_PUBLIC_KEY_VERIFIED' },
        desc: 'Device dev_vasu_laptop enrolled with hardware-backed ECDSA P-256 public key',
      },
      {
        id: 'AUD-01J8F90003',
        type: 'ROLE_ASSIGNED',
        layer: 'Blockchain',
        offsetMinutes: 120,
        actor: { id: 'usr_admin_001', did: 'did:securemax:admin:001', role: 'ADMIN', name: 'Vasu (Administrator)', email: 'admin@securemax.mil' },
        device: { id: 'dev_admin_primary', type: 'macOS Workstation' },
        resource: { type: 'ROLE', id: 'ROLE_OPERATOR', name: 'Operator Access Role' },
        action: { op: 'ASSIGN_ROLE', perm: 'ADMIN' },
        auth: { result: 'ALLOWED', policy: 'ACCESS_CONTROL_MANAGER_RBAC', reason: 'SEPOLIA_ROLE_COMMIT' },
        blockchain: {
          net: 'sepolia',
          contract: '0x8b31a0e83b4c9e83f01948ba938475c1284a1928',
          tx: '0x7e8f90123456789abcdef0123456789abcdef0123456789abcdef0123456789a',
          block: 6849205,
        },
        desc: 'Role OPERATOR assigned to did:securemax:user:002 on Sepolia AccessControlManager',
      },
      {
        id: 'AUD-01J8F90004',
        type: 'KEY_VERSION_CREATED',
        layer: 'KMS',
        offsetMinutes: 90,
        actor: { id: 'usr_admin_001', did: 'did:securemax:admin:001', role: 'ADMIN', name: 'Vasu (Administrator)', email: 'admin@securemax.mil' },
        device: { id: 'dev_admin_primary', type: 'macOS Workstation' },
        resource: { type: 'KMS_KEY', id: 'kms_root_vault_key', name: 'Vault Data Encryption Key (DEK)', version: 3 },
        action: { op: 'KEY_ROTATE', perm: 'KMS_ADMIN' },
        auth: { result: 'ALLOWED', policy: 'KMS_ROTATION_SCHEDULE', reason: 'SERVER_SIDE_KMS_ROTATION_COMPLETED' },
        crypto: { enc: 'AES-256-GCM', ver: 3 },
        desc: 'Server-Side KMS rotated master envelope encryption key to Version v3',
      },
      {
        id: 'AUD-01J8F90005',
        type: 'LOGIN_SUCCESS',
        layer: 'Application',
        offsetMinutes: 45,
        actor: { id: 'usr_vasu_002', did: 'did:securemax:user:002', role: 'USER', name: 'Vasu', email: 'vasu@securemax.mil' },
        device: { id: 'dev_vasu_laptop', type: 'Windows 11 Workstation' },
        resource: { type: 'SESSION', id: 'ses_vasu_live_01', name: 'Authenticated Web Session' },
        action: { op: 'AUTHENTICATE_CHALLENGE', perm: 'AUTHENTICATE' },
        auth: { result: 'ALLOWED', policy: 'CHALLENGE_RESPONSE_VALIDATION', reason: 'P256_SIGNATURE_VERIFIED' },
        desc: 'Vasu authenticated successfully via hardware-bound ECDSA P-256 challenge response',
      },
      {
        id: 'AUD-01J8F90006',
        type: 'DECRYPT_ALLOWED',
        layer: 'KMS',
        offsetMinutes: 20,
        actor: { id: 'usr_vasu_002', did: 'did:securemax:user:002', role: 'USER', name: 'Vasu', email: 'vasu@securemax.mil' },
        device: { id: 'dev_vasu_laptop', type: 'Windows 11 Workstation' },
        resource: { type: 'ASSET', id: 'ast_alpha', name: 'Project Alpha.pdf', version: 3 },
        action: { op: 'DECRYPT', perm: 'DECRYPT' },
        auth: { result: 'ALLOWED', policy: 'USER_ASSET_PERMISSION', reason: 'VALID_DECRYPTION_TOKEN_ISSUED' },
        crypto: { enc: 'AES-256-GCM', ver: 3 },
        blockchain: {
          net: 'sepolia',
          contract: '0x1034871239847120398471239847123984712093',
          tx: '0x4c6e8f0b1d3f5a7c9e1b3d5f7a9c0e2b4a6c8e1b3d5f7a9c0e2b4a6c8e1b3d5f',
          block: 6849240,
        },
        desc: 'Vasu decrypted Project Alpha.pdf: AES-256-GCM Server-Side KMS authorized session',
      },
      {
        id: 'AUD-01J8F90007',
        type: 'DECRYPT_DENIED',
        layer: 'Security',
        offsetMinutes: 15,
        actor: { id: 'usr_vasu_002', did: 'did:securemax:user:002', role: 'USER', name: 'Vasu', email: 'vasu@securemax.mil' },
        device: { id: 'dev_vasu_laptop', type: 'Windows 11 Workstation' },
        resource: { type: 'ASSET', id: 'ast_clearance', name: 'Personnel Security Clearances.pdf', version: 1 },
        action: { op: 'DECRYPT', perm: 'DECRYPT' },
        auth: { result: 'DENIED', policy: 'DATA_CLASSIFICATION_ENFORCEMENT', reason: 'CLEARANCE_RESTRICTED_NFT_PERMIT_REQUIRED' },
        crypto: { enc: 'AES-256-GCM', ver: 1 },
        desc: 'Unauthorized decryption blocked for Personnel Security Clearances.pdf (RESTRICTED)',
      },
      {
        id: 'AUD-01J8F90008',
        type: 'SECURITY_ALERT',
        layer: 'Security',
        offsetMinutes: 10,
        actor: { id: 'usr_external_attacker', did: 'did:external:unknown', role: 'UNKNOWN', name: 'Attacker Probe', email: 'probe@darknet.io' },
        device: { id: 'dev_unknown_ip', type: 'Tor Exit Node' },
        resource: { type: 'ASSET', id: 'ast_alpha', name: 'Project Alpha.pdf' },
        action: { op: 'REPLAY_DECRYPTION_TOKEN', perm: 'DECRYPT' },
        auth: { result: 'FAILED', policy: 'SENTINEL_DETERMINISTIC_ENGINE', reason: 'TOKEN_REPLAY_ATTEMPT_INTERCEPTED' },
        desc: 'Sentinel Security Engine intercepted and neutralized replayed cryptographic decryption token',
      },
      {
        id: 'AUD-01J8F90009',
        type: 'ACCESS_REQUESTED',
        layer: 'Application',
        offsetMinutes: 5,
        actor: { id: 'usr_vasu_002', did: 'did:securemax:user:002', role: 'USER', name: 'Vasu', email: 'vasu@securemax.mil' },
        device: { id: 'dev_vasu_laptop', type: 'Windows 11 Workstation' },
        resource: { type: 'ASSET', id: 'ast_radar', name: 'Avionics Radar Interface Specs.pdf', version: 2 },
        action: { op: 'REQUEST_ACCESS', perm: 'READ' },
        auth: { result: 'ALLOWED', policy: 'ACCESS_REQUEST_WORKFLOW', reason: 'PENDING_ADMIN_NFT_PERMIT' },
        desc: 'Access requested for Avionics Radar Interface Specs.pdf: awaiting Admin NFT Permit approval',
      },
    ];

    for (const seed of baseSeeds) {
      const occurredAt = new Date(Date.now() - seed.offsetMinutes * 60 * 1000).toISOString();
      const eventHash = computeCanonicalHash(
        seed.id,
        seed.type,
        occurredAt,
        seed.actor.id,
        seed.resource.id,
        seed.action.op,
        seed.auth.result,
        currentPrevHash
      );

      const event: CanonicalAuditEvent = {
        event_id: seed.id,
        event_type: seed.type,
        occurred_at: occurredAt,
        layer: seed.layer,
        actor: {
          user_id: seed.actor.id,
          did: seed.actor.did,
          role: seed.actor.role,
          user_name: seed.actor.name,
          user_email: seed.actor.email,
        },
        device: {
          device_id: seed.device.id,
          device_type: seed.device.type,
          ip_hash: sha256Hex(`ip:${seed.device.id}`),
          user_agent_hash: sha256Hex(`ua:${seed.device.type}`),
        },
        resource: {
          resource_type: seed.resource.type,
          resource_id: seed.resource.id,
          asset_id: seed.resource.type === 'ASSET' ? seed.resource.id : undefined,
          asset_name: seed.resource.name,
          asset_version: seed.resource.version || 1,
        },
        action: {
          operation: seed.action.op,
          permission: seed.action.perm,
        },
        authorization: {
          result: seed.auth.result,
          policy: seed.auth.policy,
          reason_code: seed.auth.reason,
        },
        cryptography: seed.crypto ? {
          encryption: seed.crypto.enc,
          key_version: seed.crypto.ver,
        } : undefined,
        blockchain: seed.blockchain ? {
          network: seed.blockchain.net,
          contract: seed.blockchain.contract,
          transaction_hash: seed.blockchain.tx,
          block_number: seed.blockchain.block,
        } : undefined,
        request: {
          request_id: 'REQ-' + seed.id.slice(-6),
          session_id: 'SES-' + seed.id.slice(-4),
        },
        integrity: {
          event_hash: eventHash,
          previous_event_hash: currentPrevHash,
        },
        // Backward compatibility properties
        id: seed.id,
        description: seed.desc,
        severity: seed.auth.result === 'ALLOWED' ? 'INFO' : seed.auth.result === 'DENIED' ? 'WARNING' : 'CRITICAL',
        target_id: seed.resource.id,
        user_email: seed.actor.email,
        user_name: seed.actor.name,
        event_hash: eventHash,
        prev_hash: currentPrevHash,
        block_number: seed.blockchain ? seed.blockchain.block : 6849200 + this.chain.length,
        created_at: occurredAt,
      };

      this.chain.push(event);
      currentPrevHash = eventHash;
    }
  }

  /**
   * Records a canonical audit event linked into the permanent SHA-256 hash chain
   */
  public record(params: RecordAuditParams): CanonicalAuditEvent {
    const lastEvent = this.chain[this.chain.length - 1];
    const prevHash = lastEvent ? lastEvent.integrity.event_hash : '0x0000000000000000000000000000000000000000000000000000000000000000';

    const eventId = 'AUD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const occurredAt = new Date().toISOString();

    const eventHash = computeCanonicalHash(
      eventId,
      params.eventType,
      occurredAt,
      params.actor.userId,
      params.resource.resourceId,
      params.action.operation,
      params.authorization.result,
      prevHash
    );

    const ipHash = params.device?.rawIp ? sha256Hex(params.device.rawIp) : sha256Hex(`ip:${params.device?.deviceId || '127.0.0.1'}`);
    const uaHash = params.device?.rawUserAgent ? sha256Hex(params.device.rawUserAgent) : sha256Hex(`ua:${params.device?.deviceType || 'standard'}`);

    const desc = params.description || `${params.actor.userName || params.actor.userId} executed ${params.action.operation} on ${params.resource.assetName || params.resource.resourceId} [${params.authorization.result}]`;

    const event: CanonicalAuditEvent = {
      event_id: eventId,
      event_type: params.eventType,
      occurred_at: occurredAt,
      layer: params.layer,
      actor: {
        user_id: params.actor.userId,
        did: params.actor.did,
        role: params.actor.role,
        user_name: params.actor.userName,
        user_email: params.actor.userEmail,
      },
      device: {
        device_id: params.device?.deviceId || 'dev_session_primary',
        device_type: params.device?.deviceType || 'Workstation',
        ip_hash: ipHash,
        user_agent_hash: uaHash,
      },
      resource: {
        resource_type: params.resource.resourceType,
        resource_id: params.resource.resourceId,
        asset_id: params.resource.resourceType === 'ASSET' ? params.resource.resourceId : undefined,
        asset_name: params.resource.assetName,
        asset_version: params.resource.assetVersion || 1,
      },
      action: {
        operation: params.action.operation,
        permission: params.action.permission,
      },
      authorization: {
        result: params.authorization.result,
        policy: params.authorization.policy || 'DEFAULT_RBAC_POLICY',
        reason_code: params.authorization.reasonCode,
      },
      cryptography: params.cryptography ? {
        encryption: params.cryptography.encryption || 'AES-256-GCM',
        key_version: params.cryptography.keyVersion || 1,
      } : undefined,
      blockchain: params.blockchain ? {
        network: params.blockchain.network || 'sepolia',
        contract: params.blockchain.contract || '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        transaction_hash: params.blockchain.transactionHash || '0x' + sha256Hex(eventId),
        block_number: params.blockchain.blockNumber || 6849300,
      } : undefined,
      request: {
        request_id: params.request?.requestId || 'REQ-' + eventId.slice(-6),
        session_id: params.request?.sessionId || 'SES-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      },
      integrity: {
        event_hash: eventHash,
        previous_event_hash: prevHash,
      },
      metadata: params.metadata,

      // Backward compatibility fields
      id: eventId,
      description: desc,
      severity: params.authorization.result === 'ALLOWED' ? 'INFO' : params.authorization.result === 'DENIED' ? 'WARNING' : 'CRITICAL',
      target_id: params.resource.resourceId,
      user_email: params.actor.userEmail,
      user_name: params.actor.userName,
      event_hash: eventHash,
      prev_hash: prevHash,
      block_number: params.blockchain?.blockNumber || 6849300,
      created_at: occurredAt,
    };

    this.chain.push(event);
    return event;
  }

  /**
   * Retrieves all canonical audit events in reverse chronological order (newest first)
   */
  public getEvents(options?: {
    layer?: AuditLayer;
    result?: AuditResult;
    search?: string;
  }): CanonicalAuditEvent[] {
    let filtered = [...this.chain].reverse();

    if (options?.layer) {
      filtered = filtered.filter(e => e.layer === options.layer);
    }
    if (options?.result) {
      filtered = filtered.filter(e => e.authorization.result === options.result);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.event_id.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.actor.user_name && e.actor.user_name.toLowerCase().includes(q)) ||
        (e.actor.user_email && e.actor.user_email.toLowerCase().includes(q)) ||
        (e.resource.asset_name && e.resource.asset_name.toLowerCase().includes(q)) ||
        e.integrity.event_hash.toLowerCase().includes(q)
      );
    }

    return filtered;
  }

  /**
   * Recomputes SHA-256 hashes across the full chain to verify 100% cryptographic integrity
   */
  public verifyIntegrity(): {
    isValid: boolean;
    totalEvents: number;
    verifiedEvents: number;
    genesisHash: string;
    latestHash: string;
    brokenAt?: string;
    chainChecks: Array<{
      eventId: string;
      expectedHash: string;
      actualHash: string;
      previousHash: string;
      matches: boolean;
    }>;
  } {
    let prevHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const chainChecks = [];

    for (let i = 0; i < this.chain.length; i++) {
      const e = this.chain[i];
      const computed = computeCanonicalHash(
        e.event_id,
        e.event_type,
        e.occurred_at,
        e.actor.user_id,
        e.resource.resource_id,
        e.action.operation,
        e.authorization.result,
        prevHash
      );

      const matches = computed === e.integrity.event_hash && e.integrity.previous_event_hash === prevHash;
      chainChecks.push({
        eventId: e.event_id,
        expectedHash: computed,
        actualHash: e.integrity.event_hash,
        previousHash: prevHash,
        matches,
      });

      if (!matches) {
        return {
          isValid: false,
          totalEvents: this.chain.length,
          verifiedEvents: i,
          genesisHash: this.chain[0]?.integrity.previous_event_hash || '0x0',
          latestHash: e.integrity.event_hash,
          brokenAt: e.event_id,
          chainChecks,
        };
      }

      prevHash = e.integrity.event_hash;
    }

    return {
      isValid: true,
      totalEvents: this.chain.length,
      verifiedEvents: this.chain.length,
      genesisHash: this.chain[0]?.integrity.previous_event_hash || '0x0',
      latestHash: this.chain[this.chain.length - 1]?.integrity.event_hash || '0x0',
      chainChecks,
    };
  }

  /**
   * Generates a tamper-evident export report with cryptographic proof signature
   */
  public generateExportReport(generatedBy = 'auditor@securemax.mil'): {
    reportId: string;
    generatedAt: string;
    generatedBy: string;
    ledgerIntegrityStatus: 'VERIFIED_VALID' | 'INTEGRITY_COMPROMISED';
    totalEvents: number;
    blockchainAnchoredCount: number;
    deniedAttemptsCount: number;
    securityIncidentsCount: number;
    reportHash: string;
    events: CanonicalAuditEvent[];
  } {
    const integrity = this.verifyIntegrity();
    const generatedAt = new Date().toISOString();
    const reportId = 'SMR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

    const bcCount = this.chain.filter(e => e.blockchain !== undefined).length;
    const deniedCount = this.chain.filter(e => e.authorization.result === 'DENIED' || e.authorization.result === 'FAILED').length;
    const secCount = this.chain.filter(e => e.layer === 'Security').length;

    const reportPayload = `${reportId}|${generatedAt}|${generatedBy}|${this.chain.length}|${integrity.latestHash}`;
    const reportHash = '0x' + sha256Hex(reportPayload);

    return {
      reportId,
      generatedAt,
      generatedBy,
      ledgerIntegrityStatus: integrity.isValid ? 'VERIFIED_VALID' : 'INTEGRITY_COMPROMISED',
      totalEvents: this.chain.length,
      blockchainAnchoredCount: bcCount,
      deniedAttemptsCount: deniedCount,
      securityIncidentsCount: secCount,
      reportHash,
      events: [...this.chain].reverse(),
    };
  }
}

export const auditService = new AuditService();
