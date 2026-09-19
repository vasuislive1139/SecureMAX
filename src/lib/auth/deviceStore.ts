import 'server-only';
import crypto from 'crypto';
import { UserRole, UserStatus, UserDevice, DeviceEnrollment } from '@/types';
import { deriveKEK, generateDEK, encryptData } from '../crypto';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  kyc_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  status: UserStatus;
  did: string;
  default_access_policy?: 'PRIVATE' | 'ORGANIZATION';
  created_at: string;
}

export interface AssetVersion {
  version: string;
  uploaded_by: string;
  created_at: string;
  size: string;
  notes?: string;
}

export interface AssetAccessLog {
  id: string;
  action: string;
  user_name: string;
  timestamp: string;
  status: 'SUCCESS' | 'DENIED' | 'PENDING';
  details?: string;
}

export interface StoredAsset {
  id: string;
  asset_code: string;
  name: string;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | string;
  status: string;
  description: string;
  encrypted_content: string; // Base64 AES-256-GCM ciphertext
  iv: string;
  auth_tag: string;
  aad: string;
  folder: 'Projects' | 'Finance' | 'HR' | 'Engineering' | 'Legal' | string;
  file_type: 'PDF' | 'XLSX' | 'ZIP' | 'PNG' | 'DOC' | 'JSON' | 'TXT' | string;
  mime_type: string;
  file_size_bytes: number;
  owner_id?: string;
  owner_name: string;
  shared_with_all?: boolean;
  default_access_policy?: 'PRIVATE' | 'ORGANIZATION';
  created_at: string;
  last_accessed_at?: string;
  key_version: string;
  versions: AssetVersion[];
  access_history: AssetAccessLog[];
  blockchain_token_id: string;
  blockchain_contract: string;
  did: string;
}

export interface StoredAssignment {
  asset_id: string;
  user_id: string; // specific user ID or 'ALL'
  can_read: boolean;
  can_decrypt: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_delete: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  assigned_at: string;
  expires_at: string | null;
  shared_by?: string;
  shared_with_name?: string;
}

export interface StoredAccessRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role: string;
  request_type: 'HIGH_RISK_DATA' | 'AUDIT_UPDATE';
  asset_id?: string;
  asset_code?: string;
  asset_name?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  nft_token_id?: string;
  created_at: string;
  approved_at?: string;
}

export interface StoredAuditEvent {
  id: string;
  event_type: string;
  description: string;
  target_id?: string;
  user_email?: string;
  user_name?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  event_hash: string;
  block_number?: number;
  created_at: string;
}

// In-memory persistent state (persists across hot-reloads within the server instance)
class SecureMaxStore {
  public users: Map<string, StoredUser> = new Map();
  public devices: Map<string, UserDevice> = new Map();
  public enrollments: Map<string, DeviceEnrollment> = new Map();
  public assets: Map<string, StoredAsset> = new Map();
  public assignments: StoredAssignment[] = [];
  public accessRequests: StoredAccessRequest[] = [];
  public auditEvents: StoredAuditEvent[] = [];
  public wrappedDEKs: Map<string, { cipher: string; iv: string; authTag: string }> = new Map();
  public challengeCache: Map<string, { challengeId: string; identifier: string; nonce: string; message: string; expiresAt: string }> = new Map();

  constructor() {
    // Zero demo data: all users, devices, assets, and audit logs are entered manually at runtime.
    // For automated test suites, use seedTestDataForTesting().
  }

  public getWrappedDEK(assetId: string) {
    return this.wrappedDEKs.get(assetId);
  }

  public seedTestDataForTesting(): void {
    if (this.users.has('usr_admin_001')) return;
    // 1. ADMIN (Vasu Admin Laptop - Strictly Device Bound)
    const adminUser: StoredUser = {
      id: 'usr_admin_001',
      name: 'Vasu (Administrator)',
      email: 'admin@securemax.mil',
      role: UserRole.ADMIN,
      kyc_status: 'VERIFIED',
      status: UserStatus.ACTIVE,
      did: 'did:securemax:admin:001',
      created_at: '2026-09-01T00:00:00.000Z',
    };
    this.users.set(adminUser.id, adminUser);
    this.users.set(adminUser.email, adminUser);

    // Admin's single bound device
    const adminDevice: UserDevice = {
      id: 'dev_admin_primary',
      user_id: adminUser.id,
      device_name: "Admin Laptop (Hardware-Bound)",
      public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2Z37UoHq3y1V4XwH5K7oF9P9k3sZ0s7uVvWxX0y1A2bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4z5A6bC7w==', // standard P-256 SPKI
      algorithm: 'ECDSA_P256',
      status: 'ACTIVE',
      is_admin_device: true,
      created_at: '2026-09-01T00:00:00.000Z',
      last_used_at: new Date().toISOString(),
    };
    this.devices.set(adminDevice.id, adminDevice);

    // 2. USER (Vasu - Multi-Device Enabled)
    const standardUser: StoredUser = {
      id: 'usr_vasu_002',
      name: 'Vasu (Lead Engineer)',
      email: 'vasu@securemax.mil',
      role: UserRole.USER,
      kyc_status: 'VERIFIED',
      status: UserStatus.ACTIVE,
      did: 'did:securemax:user:002',
      created_at: '2026-09-02T00:00:00.000Z',
    };
    this.users.set(standardUser.id, standardUser);
    this.users.set(standardUser.email, standardUser);

    // User's primary Laptop
    const userDeviceLaptop: UserDevice = {
      id: 'dev_vasu_laptop',
      user_id: standardUser.id,
      device_name: 'Workstation Laptop A',
      public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEq9V1zK2Y7nL6X4eQ8jB2tF0mS3wZ5xY8vU1tP2rQ3sA4bC5dE6fG7hI8jK9lM0nO1pQ2rS3tU4vW5xY6z7A8bC==',
      algorithm: 'ECDSA_P256',
      status: 'ACTIVE',
      is_admin_device: false,
      created_at: '2026-09-02T00:00:00.000Z',
      last_used_at: new Date().toISOString(),
    };
    this.devices.set(userDeviceLaptop.id, userDeviceLaptop);

    // 3. AUDITOR (Compliance Auditor)
    const auditorUser: StoredUser = {
      id: 'usr_auditor_003',
      name: 'Compliance Auditor',
      email: 'auditor@securemax.mil',
      role: UserRole.AUDITOR,
      kyc_status: 'VERIFIED',
      status: UserStatus.ACTIVE,
      did: 'did:securemax:auditor:003',
      created_at: '2026-09-03T00:00:00.000Z',
    };
    this.users.set(auditorUser.id, auditorUser);
    this.users.set(auditorUser.email, auditorUser);

    const auditorDevice: UserDevice = {
      id: 'dev_auditor_terminal',
      user_id: auditorUser.id,
      device_name: 'Audit Secure Terminal',
      public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7p9X2mR5yT8vN1qW4sE7hK0bL3zC6xY9vU2tP3rQ4sA5bC6dE7fG8hI9jK0lM1nO2pQ3rS4tU5vW6xY7z8A9bC==',
      algorithm: 'ECDSA_P256',
      status: 'ACTIVE',
      is_admin_device: false,
      created_at: '2026-09-03T00:00:00.000Z',
      last_used_at: new Date().toISOString(),
    };
    this.devices.set(auditorDevice.id, auditorDevice);

    // 4. PRE-SEEDED ENCRYPTED ASSETS (AES-256-GCM)
    const masterKey = process.env.SECUREMAX_KMS_MASTER_KEY || '0000000000000000000000000000000000000000000000000000000000000000';

    const seedAssets: Array<{
      id: string;
      asset_code: string;
      name: string;
      classification: string;
      folder: string;
      file_type: string;
      mime_type: string;
      file_size_bytes: number;
      owner_id: string;
      owner_name: string;
      shared_with_all?: boolean;
      key_version: string;
      description: string;
      plaintext: string;
      blockchain_token_id: string;
      blockchain_contract: string;
      did: string;
      versions: AssetVersion[];
      access_history: AssetAccessLog[];
    }> = [
      {
        id: 'ast_alpha',
        asset_code: 'SMX-ALPHA-001',
        name: 'Project Alpha (Core Defense Spec)',
        classification: 'CONFIDENTIAL',
        folder: 'Projects',
        file_type: 'PDF',
        mime_type: 'application/pdf',
        file_size_bytes: 2516582,
        owner_id: standardUser.id,
        owner_name: standardUser.name,
        key_version: 'v2',
        description: 'Confidential design specifications for tactical communications and payload encapsulation.',
        plaintext: 'TOP SECRET // CONFIDENTIAL DEFENSE INTEL: Project Alpha utilizes multi-frequency hopping at 2.4GHz with AES-256-GCM authenticated payload encapsulation. Authorization strictly validated by SecureMAX on-chain registry.',
        blockchain_token_id: 'NFT-SEPOLIA-#8491',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_alpha',
        versions: [
          { version: 'v2.0', uploaded_by: 'Vasu (Lead Engineer)', created_at: '2026-09-15T10:30:00.000Z', size: '2.4 MB', notes: 'Upgraded payload encapsulation to AES-256-GCM' },
          { version: 'v1.0', uploaded_by: 'Vasu (Lead Engineer)', created_at: '2026-09-02T08:00:00.000Z', size: '2.1 MB', notes: 'Initial cryptographic architecture draft' }
        ],
        access_history: [
          { id: 'log_alpha_1', action: 'DECRYPT', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), status: 'SUCCESS', details: 'Authorized session decrypt via P-256' },
          { id: 'log_alpha_2', action: 'READ', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), status: 'SUCCESS' }
        ]
      },
      {
        id: 'ast_beta',
        asset_code: 'SMX-BETA-002',
        name: 'Project Beta Architecture Blueprints',
        classification: 'INTERNAL',
        folder: 'Projects',
        file_type: 'ZIP',
        mime_type: 'application/zip',
        file_size_bytes: 15518976,
        owner_id: standardUser.id,
        owner_name: standardUser.name,
        key_version: 'v1',
        description: 'Comprehensive architectural diagrams, CAD schematics, and microservice definitions for Project Beta.',
        plaintext: 'INTERNAL SYSTEM BLUEPRINTS: Distributed edge node architecture with zero-trust device binding. Mesh communication over authenticated TLS 1.3 channels with ECDSA P-256 peer attestation.',
        blockchain_token_id: 'NFT-SEPOLIA-#8492',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_beta',
        versions: [
          { version: 'v1.0', uploaded_by: 'Vasu (Lead Engineer)', created_at: '2026-09-10T14:00:00.000Z', size: '14.8 MB', notes: 'Initial schematics release' }
        ],
        access_history: [
          { id: 'log_beta_1', action: 'DOWNLOAD', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), status: 'SUCCESS' }
        ]
      },
      {
        id: 'ast_finance',
        asset_code: 'SMX-FIN-003',
        name: 'Financial Audit Report Q3',
        classification: 'CONFIDENTIAL',
        folder: 'Finance',
        file_type: 'XLSX',
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size_bytes: 1258291,
        owner_id: auditorUser.id,
        owner_name: auditorUser.name,
        key_version: 'v1',
        description: 'Quarterly financial compliance, hardware procurement, and cryptographic subsystem expenditures.',
        plaintext: 'FINANCIAL REPORT // Q3 FY26: Procurement expenditures: $4,200,000. Cryptographic hardware allocation: $850,000. All allocations compliant with statutory requirements.',
        blockchain_token_id: 'NFT-SEPOLIA-#8493',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_finance',
        versions: [
          { version: 'v1.0', uploaded_by: 'Compliance Auditor', created_at: '2026-09-08T09:15:00.000Z', size: '1.2 MB', notes: 'Signed Q3 audit statement' }
        ],
        access_history: [
          { id: 'log_fin_1', action: 'DECRYPT', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 3600 * 1000).toISOString(), status: 'SUCCESS' }
        ]
      },
      {
        id: 'ast_procure',
        asset_code: 'SMX-FIN-004',
        name: 'FY27 Defense Procurement Estimates',
        classification: 'INTERNAL',
        folder: 'Finance',
        file_type: 'XLSX',
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size_bytes: 3250585,
        owner_id: adminUser.id,
        owner_name: adminUser.name,
        key_version: 'v1',
        description: 'Forecast budget models and supplier bids for next-generation cryptographic hardware.',
        plaintext: 'FY27 ESTIMATES // Confidential forward projections: Hardware Security Modules (HSM): $1.2M. Secure Enclave deployment: $900k. Contract awards pending Q4 review.',
        blockchain_token_id: 'NFT-SEPOLIA-#8494',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_procure',
        versions: [
          { version: 'v1.0', uploaded_by: 'Vasu (Administrator)', created_at: '2026-09-12T11:20:00.000Z', size: '3.1 MB', notes: 'Initial budget projections' }
        ],
        access_history: [
          { id: 'log_proc_1', action: 'READ', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(), status: 'SUCCESS' }
        ]
      },
      {
        id: 'ast_hr_policy',
        asset_code: 'SMX-HR-005',
        name: 'Global Clearance & Personnel Policy',
        classification: 'PUBLIC',
        folder: 'HR',
        file_type: 'PDF',
        mime_type: 'application/pdf',
        file_size_bytes: 870400,
        owner_id: adminUser.id,
        owner_name: adminUser.name,
        shared_with_all: true,
        key_version: 'v1',
        description: 'Organizational guidelines on cryptographic key custody, zero-trust hygiene, and KYC verification.',
        plaintext: 'POLICY DOCUMENT 2026-A: All personnel must enroll hardware-bound ECDSA P-256 keys. Passwords alone are strictly prohibited. Multi-factor device attestation required for all asset access.',
        blockchain_token_id: 'NFT-SEPOLIA-#8495',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_hr_policy',
        versions: [
          { version: 'v1.0', uploaded_by: 'Vasu (Administrator)', created_at: '2026-09-01T09:00:00.000Z', size: '850 KB', notes: 'Standard policy baseline' }
        ],
        access_history: []
      },
      {
        id: 'ast_roster',
        asset_code: 'SMX-HR-006',
        name: 'Active Operatives Personnel Roster',
        classification: 'RESTRICTED',
        folder: 'HR',
        file_type: 'DOC',
        mime_type: 'application/msword',
        file_size_bytes: 1887436,
        owner_id: adminUser.id,
        owner_name: adminUser.name,
        key_version: 'v2',
        description: 'Field operative identity mappings, tactical assignments, and cryptographic public key fingerprints.',
        plaintext: 'RESTRICTED PERSONNEL ROSTER: Classified field operative roster and hardware token fingerprints. Unauthorized access will trigger immediate zero-trust lockout.',
        blockchain_token_id: 'NFT-SEPOLIA-#8496',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_roster',
        versions: [
          { version: 'v2.0', uploaded_by: 'Vasu (Administrator)', created_at: '2026-09-14T16:45:00.000Z', size: '1.8 MB', notes: 'Updated tactical assignments' }
        ],
        access_history: [
          { id: 'log_rost_1', action: 'DECRYPT_ATTEMPT', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), status: 'DENIED', details: 'Insufficient clearance level' }
        ]
      },
      {
        id: 'ast_avionics',
        asset_code: 'SMX-AVN-007',
        name: 'Avionics Radar Interface Specs',
        classification: 'RESTRICTED',
        folder: 'Engineering',
        file_type: 'PDF',
        mime_type: 'application/pdf',
        file_size_bytes: 5872025,
        owner_id: adminUser.id,
        owner_name: adminUser.name,
        key_version: 'v2',
        description: 'Hardware interface diagrams, bus timings, and electronic warfare countermeasure protocols.',
        plaintext: 'RESTRICTED HARDWARE SPEC: ARINC 429 high-speed bus pinout configuration with MIL-STD-1553 redundant multiplexing. Target acquisition frequencies calibrated.',
        blockchain_token_id: 'NFT-SEPOLIA-#8497',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_avionics',
        versions: [
          { version: 'v2.0', uploaded_by: 'Vasu (Administrator)', created_at: '2026-09-11T12:00:00.000Z', size: '5.6 MB', notes: 'Integrated MIL-STD-1553 specs' }
        ],
        access_history: [
          { id: 'log_avn_1', action: 'ACCESS_REQUEST', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'PENDING', details: 'Awaiting Admin NFT Permit' }
        ]
      },
      {
        id: 'ast_kms',
        asset_code: 'SMX-ENG-008',
        name: 'KMS Module Microcode v2.4',
        classification: 'CONFIDENTIAL',
        folder: 'Engineering',
        file_type: 'ZIP',
        mime_type: 'application/zip',
        file_size_bytes: 8598323,
        owner_id: adminUser.id,
        owner_name: adminUser.name,
        key_version: 'v2',
        description: 'Firmware binaries and zeroization routines for the cryptographic key storage layer.',
        plaintext: 'CONFIDENTIAL MICROCODE // Version 2.4.0-RC3: Anti-tamper envelope triggers active zeroization of master KEK upon enclosure breach detection.',
        blockchain_token_id: 'NFT-SEPOLIA-#8498',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_kms',
        versions: [
          { version: 'v2.4', uploaded_by: 'Vasu (Administrator)', created_at: '2026-09-13T15:30:00.000Z', size: '8.2 MB', notes: 'Patch for envelope tamper sensor' }
        ],
        access_history: [
          { id: 'log_kms_1', action: 'ACCESS_EXPIRED', user_name: 'Vasu (Lead Engineer)', timestamp: new Date(Date.now() - 86400 * 1000).toISOString(), status: 'DENIED', details: 'Temporary 24h clearance expired' }
        ]
      },
      {
        id: 'ast_compliance',
        asset_code: 'SMX-LEG-009',
        name: 'DoD Zero Trust Statutory Compliance Certificate',
        classification: 'PUBLIC',
        folder: 'Legal',
        file_type: 'PDF',
        mime_type: 'application/pdf',
        file_size_bytes: 430080,
        owner_id: auditorUser.id,
        owner_name: auditorUser.name,
        shared_with_all: true,
        key_version: 'v1',
        description: 'Statutory audit compliance certificate confirming adherence to NIST SP 800-207 standards.',
        plaintext: 'COMPLIANCE CERTIFICATE: SecureMAX meets or exceeds all DoD Zero Trust Strategy (2022-2027) requirements for device attestation and cryptographic micro-segmentation.',
        blockchain_token_id: 'NFT-SEPOLIA-#8499',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_compliance',
        versions: [
          { version: 'v1.0', uploaded_by: 'Compliance Auditor', created_at: '2026-09-05T10:00:00.000Z', size: '420 KB', notes: 'Annual compliance certification' }
        ],
        access_history: []
      },
      {
        id: 'ast_nda',
        asset_code: 'SMX-LEG-010',
        name: 'Classified Contractor NDA & Protocols',
        classification: 'CONFIDENTIAL',
        folder: 'Legal',
        file_type: 'DOC',
        mime_type: 'application/msword',
        file_size_bytes: 696320,
        owner_id: auditorUser.id,
        owner_name: auditorUser.name,
        key_version: 'v1',
        description: 'Standard nondisclosure agreements and operational security protocols for defense contractors.',
        plaintext: 'NON-DISCLOSURE AGREEMENT: All defense contractors handling SMX-series cryptographic materials are subject to severe federal penalties under 18 U.S.C. Section 793.',
        blockchain_token_id: 'NFT-SEPOLIA-#8500',
        blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        did: 'did:securemax:asset:ast_nda',
        versions: [
          { version: 'v1.0', uploaded_by: 'Compliance Auditor', created_at: '2026-09-04T11:00:00.000Z', size: '680 KB', notes: 'Master contractor legal framework' }
        ],
        access_history: []
      }
    ];

    for (const item of seedAssets) {
      const dek = generateDEK();
      const enc = encryptData(Buffer.from(item.plaintext, 'utf8'), dek, `asset_data:${item.id}`);

      const kek = deriveKEK(masterKey, item.id);
      const wrapped = encryptData(dek, kek, `key_wrapping:${item.id}`);
      this.wrappedDEKs.set(item.id, {
        cipher: wrapped.ciphertext,
        iv: wrapped.iv,
        authTag: wrapped.authTag,
      });

      this.assets.set(item.id, {
        id: item.id,
        asset_code: item.asset_code,
        name: item.name,
        classification: item.classification,
        status: 'ACTIVE',
        description: item.description,
        encrypted_content: enc.ciphertext,
        iv: enc.iv,
        auth_tag: enc.authTag,
        aad: `asset_data:${item.id}`,
        folder: item.folder,
        file_type: item.file_type,
        mime_type: item.mime_type,
        file_size_bytes: item.file_size_bytes,
        owner_id: item.owner_id,
        owner_name: item.owner_name,
        shared_with_all: item.shared_with_all || false,
        default_access_policy: item.shared_with_all ? 'ORGANIZATION' : 'PRIVATE',
        created_at: item.versions[0]?.created_at || '2026-09-01T00:00:00.000Z',
        last_accessed_at: item.access_history[0]?.timestamp,
        key_version: item.key_version,
        versions: item.versions,
        access_history: item.access_history,
        blockchain_token_id: item.blockchain_token_id,
        blockchain_contract: item.blockchain_contract,
        did: item.did,
      });
    }

    // 5. ASSET ASSIGNMENTS
    // Organization-wide (All People) Access
    this.assignments.push({
      asset_id: 'ast_hr_policy',
      user_id: 'ALL',
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: '2026-09-01T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Vasu (Administrator)',
      shared_with_name: 'All People (Organization-Wide)',
    });

    this.assignments.push({
      asset_id: 'ast_compliance',
      user_id: 'ALL',
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: '2026-09-05T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Compliance Auditor',
      shared_with_name: 'All People (Organization-Wide)',
    });

    // Assignments for Vasu (Lead Engineer)
    // Full owner access on Project Alpha & Beta
    this.assignments.push({
      asset_id: 'ast_alpha',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: true,
      can_delete: true,
      status: 'ACTIVE',
      assigned_at: '2026-09-02T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Self (Owner)',
      shared_with_name: standardUser.name,
    });

    this.assignments.push({
      asset_id: 'ast_beta',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: true,
      can_delete: true,
      status: 'ACTIVE',
      assigned_at: '2026-09-10T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Self (Owner)',
      shared_with_name: standardUser.name,
    });

    // Specific person-to-person shares with Vasu
    this.assignments.push({
      asset_id: 'ast_finance',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: '2026-09-08T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Compliance Auditor',
      shared_with_name: standardUser.name,
    });

    this.assignments.push({
      asset_id: 'ast_procure',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: false,
      can_edit: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: '2026-09-12T00:00:00.000Z',
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      shared_by: 'Vasu (Administrator)',
      shared_with_name: standardUser.name,
    });

    this.assignments.push({
      asset_id: 'ast_nda',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: '2026-09-04T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Compliance Auditor',
      shared_with_name: standardUser.name,
    });

    this.assignments.push({
      asset_id: 'ast_avionics',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: false,
      can_download: false,
      can_edit: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: '2026-09-11T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Vasu (Administrator)',
      shared_with_name: standardUser.name,
    });

    this.assignments.push({
      asset_id: 'ast_roster',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: false,
      can_download: false,
      can_edit: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: '2026-09-14T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Vasu (Administrator)',
      shared_with_name: standardUser.name,
    });

    this.assignments.push({
      asset_id: 'ast_kms',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: false,
      can_download: false,
      can_edit: false,
      can_delete: false,
      status: 'EXPIRED',
      assigned_at: '2026-09-13T00:00:00.000Z',
      expires_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      shared_by: 'Vasu (Administrator)',
      shared_with_name: standardUser.name,
    });

    // Assignments for Auditor
    this.assignments.push({
      asset_id: 'ast_finance',
      user_id: auditorUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: true,
      can_delete: true,
      status: 'ACTIVE',
      assigned_at: '2026-09-08T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Self (Owner)',
      shared_with_name: auditorUser.name,
    });

    this.assignments.push({
      asset_id: 'ast_nda',
      user_id: auditorUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: true,
      can_delete: true,
      status: 'ACTIVE',
      assigned_at: '2026-09-04T00:00:00.000Z',
      expires_at: null,
      shared_by: 'Self (Owner)',
      shared_with_name: auditorUser.name,
    });

    // Admin has global rights on all assets
    for (const item of seedAssets) {
      this.assignments.push({
        asset_id: item.id,
        user_id: adminUser.id,
        can_read: true,
        can_decrypt: true,
        can_download: true,
        can_edit: true,
        can_delete: true,
        status: 'ACTIVE',
        assigned_at: '2026-09-01T00:00:00.000Z',
        expires_at: null,
        shared_by: 'System Administrator',
        shared_with_name: adminUser.name,
      });
    }

    // 6. INITIAL ACCESS REQUESTS & AUDIT LOGS
    this.accessRequests.push({
      id: 'req_001',
      user_id: standardUser.id,
      user_email: standardUser.email,
      user_name: standardUser.name,
      role: 'USER',
      request_type: 'HIGH_RISK_DATA',
      asset_id: 'ast_avionics',
      asset_code: 'SMX-AVN-003',
      asset_name: 'Avionics Radar Interface Specs',
      reason: 'Tactical comms integration review on authorized workstation',
      status: 'PENDING',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });

    this.accessRequests.push({
      id: 'req_002',
      user_id: auditorUser.id,
      user_email: auditorUser.email,
      user_name: auditorUser.name,
      role: 'AUDITOR',
      request_type: 'AUDIT_UPDATE',
      asset_id: 'ast_finance',
      asset_code: 'SMX-AUDIT-Q3',
      asset_name: 'Financial Ledger & Statutory Audit Records',
      reason: 'Compliance review & permanent blockchain anchor verification',
      status: 'PENDING',
      created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    });

    // Seed permanent audit ledger
    this.auditEvents.push(
      {
        id: 'aud_seed_1',
        event_type: 'USER_IDENTITY_REGISTERED',
        description: 'DID generated for Vasu (Field Operator): did:securemax:user:002',
        target_id: standardUser.id,
        user_email: standardUser.email,
        user_name: standardUser.name,
        severity: 'INFO',
        event_hash: '0x3f4a9b2c8e1d5a7f9b0c2e4d6a8f1b3c5e7a9b0d2f4a6c8e1b3d5f7a9c0e2b4',
        block_number: 6849210,
        created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      },
      {
        id: 'aud_seed_2',
        event_type: 'HARDWARE_DEVICE_ENROLLED',
        description: 'New hardware device enrolled: Field Laptop (ECDSA P-256)',
        target_id: 'dev_user_primary',
        user_email: standardUser.email,
        user_name: standardUser.name,
        severity: 'INFO',
        event_hash: '0x8a1c3e5f7b9d2a4c6e8f0b1d3f5a7c9e1b3d5f7a9c0e2b4a6c8e1b3d5f7a9c0',
        block_number: 6849245,
        created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
      },
      {
        id: 'aud_seed_3',
        event_type: 'SEPOLIA_ANCHOR_VERIFIED',
        description: 'State root anchored to Sepolia Contract: 0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
        target_id: 'ETHEREUM_SEPOLIA',
        user_email: adminUser.email,
        user_name: adminUser.name,
        severity: 'INFO',
        event_hash: '0x7e9a1b3c5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9',
        block_number: 6849280,
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'aud_seed_4',
        event_type: 'ACCESS_REQUEST_SUBMITTED',
        description: 'High-risk access requested for Avionics Radar (SMX-AVN-003) awaiting Admin NFT Permit',
        target_id: 'ast_avionics',
        user_email: standardUser.email,
        user_name: standardUser.name,
        severity: 'WARNING',
        event_hash: '0x4c6e8f0b1d3f5a7c9e1b3d5f7a9c0e2b4a6c8e1b3d5f7a9c0e2b4a6c8e1b3d5',
        block_number: 6849310,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      }
    );
  }

  // --- USER LOOKUPS ---
  public getUserByEmail(email: string): StoredUser | null {
    const clean = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === clean) return u;
    }
    return null;
  }

  public getUserById(userId: string): StoredUser | null {
    return this.users.get(userId) || null;
  }

  // --- DEVICE MANAGEMENT ---
  public getDevicesForUser(userId: string): UserDevice[] {
    const list: UserDevice[] = [];
    for (const d of this.devices.values()) {
      if (d.user_id === userId) list.push(d);
    }
    return list;
  }

  public getDeviceById(deviceId: string): UserDevice | null {
    return this.devices.get(deviceId) || null;
  }

  public registerDevice(params: {
    userId: string;
    deviceName: string;
    publicKey: string;
    isAdminDevice?: boolean;
    customDeviceId?: string;
  }): UserDevice {
    const user = this.getUserById(params.userId);
    if (!user) throw new Error('User not found');

    // Admin device restriction rule
    if (user.role === UserRole.ADMIN && !params.isAdminDevice) {
      // Check if admin already has a device
      const existing = this.getDevicesForUser(user.id);
      if (existing.length > 0) {
        throw new Error('Admin account is strictly device-bound to the authorized terminal. Additional devices cannot be enrolled.');
      }
    }

    const deviceId = params.customDeviceId || 'dev_' + crypto.randomUUID().slice(0, 12);
    const device: UserDevice = {
      id: deviceId,
      user_id: params.userId,
      device_name: params.deviceName,
      public_key: params.publicKey,
      algorithm: 'ECDSA_P256',
      status: 'ACTIVE',
      is_admin_device: Boolean(params.isAdminDevice || user.role === UserRole.ADMIN),
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    };

    this.devices.set(device.id, device);

    this.recordAuditEvent({
      eventType: 'HARDWARE_DEVICE_ENROLLED',
      description: `New hardware device enrolled: ${params.deviceName} (ECDSA P-256) for ${user.name}`,
      targetId: deviceId,
      userEmail: user.email,
      userName: user.name,
      severity: 'INFO',
    });

    return device;
  }

  public getAllDevices(): Array<UserDevice & { userEmail?: string; userName?: string }> {
    const list: Array<UserDevice & { userEmail?: string; userName?: string }> = [];
    for (const d of this.devices.values()) {
      const user = this.getUserById(d.user_id);
      list.push({
        ...d,
        userEmail: user?.email,
        userName: user?.name,
      });
    }
    return list;
  }

  public revokeDevice(callerUserId: string, deviceId: string): void {
    const dev = this.devices.get(deviceId);
    if (!dev) throw new Error('Device not found');
    const caller = this.getUserById(callerUserId);
    const isCallerAdmin = caller?.role === UserRole.ADMIN;

    if (dev.user_id !== callerUserId && !isCallerAdmin) {
      throw new Error('Unauthorized to revoke this device');
    }
    if (dev.is_admin_device) {
      throw new Error('Cannot revoke primary Admin hardware device. Emergency break-glass required.');
    }

    dev.status = 'REVOKED';
    dev.revoked_at = new Date().toISOString();

    this.recordAuditEvent({
      eventType: 'HARDWARE_DEVICE_REVOKED',
      description: `Hardware device revoked: ${dev.device_name} (ID: ${dev.id})`,
      targetId: dev.id,
      severity: 'WARNING',
    });
  }

  public updateDeviceLastUsed(deviceId: string): void {
    const dev = this.devices.get(deviceId);
    if (dev) {
      dev.last_used_at = new Date().toISOString();
    }
  }

  // --- DEVICE ENROLLMENT (ONE-TIME CODES) ---
  public createEnrollment(userId: string, callerUserId?: string): DeviceEnrollment {
    const targetUser = this.getUserById(userId);
    if (!targetUser) throw new Error('User not found');

    // If caller is provided, verify permissions
    if (callerUserId) {
      const caller = this.getUserById(callerUserId);
      const isCallerAdmin = caller?.role === UserRole.ADMIN;
      if (callerUserId !== userId && !isCallerAdmin) {
        throw new Error('Unauthorized: only an Admin can issue device enrollment codes for other users');
      }
    }

    // Rule: Admin root accounts cannot have secondary devices
    if (targetUser.role === UserRole.ADMIN) {
      throw new Error('Admin account is strictly device-bound. Multi-device enrollment is disabled for root administrative security.');
    }

    // Generate human-friendly code: SMX-XXXX-XXXX
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `SMX-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;

    const enrollment: DeviceEnrollment = {
      code,
      user_id: targetUser.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      created_at: new Date().toISOString(),
    };

    this.enrollments.set(code, enrollment);
    return enrollment;
  }

  public consumeEnrollment(code: string): string {
    const cleanCode = code.toUpperCase().trim();
    const enrollment = this.enrollments.get(cleanCode);

    if (!enrollment) {
      throw new Error('Invalid or non-existent enrollment code');
    }

    if (new Date(enrollment.expires_at).getTime() < Date.now()) {
      this.enrollments.delete(cleanCode);
      throw new Error('Enrollment code has expired. Please generate a new code on your primary device.');
    }

    // One-time use: delete immediately
    this.enrollments.delete(cleanCode);
    return enrollment.user_id;
  }

  // --- ASSET ASSIGNMENTS & ACCESS ENFORCEMENT ---
  public getAssetsForUser(
    userId: string,
    options?: { scope?: 'MY_DATA' | 'ALL_DATA' }
  ): Array<{
    asset: StoredAsset;
    can_read: boolean;
    can_decrypt: boolean;
    can_download: boolean;
    can_edit: boolean;
    can_delete: boolean;
    status: string;
    expires_at: string | null;
    shared_by?: string;
    is_owner: boolean;
    sharing_scope: 'PRIVATE' | 'SPECIFIC_USERS' | 'ALL_PEOPLE';
    assigned_users_count: number;
    shares?: Array<{ user_id: string; user_name: string; permissions: string; expires_at: string | null }>;
  }> {
    const results: Array<{
      asset: StoredAsset;
      can_read: boolean;
      can_decrypt: boolean;
      can_download: boolean;
      can_edit: boolean;
      can_delete: boolean;
      status: string;
      expires_at: string | null;
      shared_by?: string;
      is_owner: boolean;
      sharing_scope: 'PRIVATE' | 'SPECIFIC_USERS' | 'ALL_PEOPLE';
      assigned_users_count: number;
      shares?: Array<{ user_id: string; user_name: string; permissions: string; expires_at: string | null }>;
    }> = [];
    const user = this.getUserById(userId);
    const isCallerAdmin = user?.role === UserRole.ADMIN;
    const showAllDataForAdmin = isCallerAdmin && options?.scope === 'ALL_DATA';

    for (const asset of this.assets.values()) {
      const isOwner = Boolean(asset.owner_id === userId || (user?.name && asset.owner_name === user.name));
      const userAssignment = this.assignments.find(a => a.asset_id === asset.id && a.user_id === userId);
      const allAssignment = this.assignments.find(a => a.asset_id === asset.id && a.user_id === 'ALL');
      const isSharedWithAll = Boolean(asset.shared_with_all || (allAssignment && allAssignment.status === 'ACTIVE'));

      // STRICT ACCESS ISOLATION:
      // Only data the user owns, has a specific assignment for, is shared with all people,
      // or admin in global organization overview mode will come to that user!
      const hasAccess = isOwner || Boolean(userAssignment) || isSharedWithAll || showAllDataForAdmin;
      if (!hasAccess) {
        continue;
      }

      let canRead = false;
      let canDecrypt = false;
      let canDownload = false;
      let canEdit = false;
      let canDelete = false;
      let effectiveStatus = 'ACTIVE';
      let expiresAt: string | null = null;
      let sharedBy: string | undefined = undefined;

      if (userAssignment) {
        const isExpired = userAssignment.expires_at ? (new Date(userAssignment.expires_at).getTime() < Date.now()) : false;
        effectiveStatus = isExpired ? 'EXPIRED' : userAssignment.status;
        canRead = userAssignment.can_read;
        canDecrypt = effectiveStatus === 'ACTIVE' && userAssignment.can_decrypt;
        canDownload = effectiveStatus === 'ACTIVE' && (userAssignment.can_download ?? canDecrypt);
        canEdit = effectiveStatus === 'ACTIVE' && Boolean(userAssignment.can_edit);
        canDelete = effectiveStatus === 'ACTIVE' && Boolean(userAssignment.can_delete);
        expiresAt = userAssignment.expires_at;
        sharedBy = userAssignment.shared_by;
      } else if (isOwner) {
        canRead = true;
        canDecrypt = true;
        canDownload = true;
        canEdit = true;
        canDelete = true;
        effectiveStatus = 'ACTIVE';
      } else if (isSharedWithAll && allAssignment) {
        const isExpired = allAssignment.expires_at ? (new Date(allAssignment.expires_at).getTime() < Date.now()) : false;
        effectiveStatus = isExpired ? 'EXPIRED' : allAssignment.status;
        canRead = allAssignment.can_read;
        canDecrypt = effectiveStatus === 'ACTIVE' && allAssignment.can_decrypt;
        canDownload = effectiveStatus === 'ACTIVE' && (allAssignment.can_download ?? canDecrypt);
        canEdit = effectiveStatus === 'ACTIVE' && Boolean(allAssignment.can_edit);
        canDelete = false;
        expiresAt = allAssignment.expires_at;
        sharedBy = allAssignment.shared_by;
      } else if (showAllDataForAdmin) {
        canRead = true;
        canDecrypt = true;
        canDownload = true;
        canEdit = true;
        canDelete = true;
        effectiveStatus = 'ACTIVE';
      }

      // Calculate active sharing scope
      const activeShares = this.assignments.filter(a => a.asset_id === asset.id && a.status === 'ACTIVE');
      let sharingScope: 'PRIVATE' | 'SPECIFIC_USERS' | 'ALL_PEOPLE' = 'PRIVATE';
      if (isSharedWithAll) {
        sharingScope = 'ALL_PEOPLE';
      } else if (activeShares.length > 1 || (activeShares.length === 1 && activeShares[0].user_id !== asset.owner_id)) {
        sharingScope = 'SPECIFIC_USERS';
      }

      const sharesSummary = activeShares.map(s => {
        const target = s.user_id === 'ALL' ? null : this.getUserById(s.user_id);
        const name = s.user_id === 'ALL' ? 'All People (Organization-Wide)' : (target?.name || s.shared_with_name || s.user_id);
        const perms = [
          s.can_read && 'Read',
          s.can_decrypt && 'Decrypt',
          s.can_download && 'Download',
          s.can_edit && 'Edit',
        ].filter(Boolean).join(', ');
        return {
          user_id: s.user_id,
          user_name: name,
          permissions: perms,
          expires_at: s.expires_at,
        };
      });

      results.push({
        asset,
        can_read: canRead,
        can_decrypt: canDecrypt,
        can_download: canDownload,
        can_edit: canEdit,
        can_delete: canDelete,
        status: effectiveStatus,
        expires_at: expiresAt,
        shared_by: sharedBy,
        is_owner: isOwner,
        sharing_scope: sharingScope,
        assigned_users_count: activeShares.length,
        shares: sharesSummary,
      });
    }

    return results;
  }

  public getAssignment(userId: string, assetId: string): StoredAssignment | null {
    const asset = this.assets.get(assetId);

    // 1. Direct assignment for user
    const match = this.assignments.find(a => a.asset_id === assetId && a.user_id === userId);
    if (match) {
      const isExpired = match.expires_at ? (new Date(match.expires_at).getTime() < Date.now()) : false;
      if (isExpired) {
        return {
          ...match,
          status: 'EXPIRED',
          can_decrypt: false,
          can_download: false,
          can_edit: false,
          can_delete: false,
        };
      }
      return match;
    }

    // 2. Owner has implicit full access
    if (asset && (asset.owner_id === userId || (userId && this.getUserById(userId)?.name === asset.owner_name))) {
      return {
        asset_id: assetId,
        user_id: userId,
        can_read: true,
        can_decrypt: true,
        can_download: true,
        can_edit: true,
        can_delete: true,
        status: 'ACTIVE',
        assigned_at: asset.created_at,
        expires_at: null,
      };
    }

    // 3. Organization-wide 'ALL' assignment
    const allMatch = this.assignments.find(a => a.asset_id === assetId && a.user_id === 'ALL');
    if (allMatch) {
      const isExpired = allMatch.expires_at ? (new Date(allMatch.expires_at).getTime() < Date.now()) : false;
      if (isExpired) {
        return {
          ...allMatch,
          status: 'EXPIRED',
          can_decrypt: false,
          can_download: false,
          can_edit: false,
          can_delete: false,
        };
      }
      return {
        ...allMatch,
        user_id: userId,
      };
    }

    // 4. Admin fallback
    const user = this.getUserById(userId);
    if (user?.role === UserRole.ADMIN) {
      return {
        asset_id: assetId,
        user_id: userId,
        can_read: true,
        can_decrypt: true,
        can_download: true,
        can_edit: true,
        can_delete: true,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
        expires_at: null,
      };
    }

    return null;
  }

  public setAssignment(
    assetId: string, 
    userId: string, 
    canRead: boolean, 
    canDecrypt: boolean,
    canDownload: boolean = true,
    canEdit: boolean = false,
    canDelete: boolean = false,
    expiresAt: string | null = null,
    sharedBy?: string,
    sharedWithName?: string
  ): StoredAssignment {
    const index = this.assignments.findIndex(a => a.asset_id === assetId && a.user_id === userId);
    const assignment: StoredAssignment = {
      asset_id: assetId,
      user_id: userId,
      can_read: canRead,
      can_decrypt: canDecrypt,
      can_download: canDownload,
      can_edit: canEdit,
      can_delete: canDelete,
      status: canDecrypt ? 'ACTIVE' : 'REVOKED',
      assigned_at: new Date().toISOString(),
      expires_at: expiresAt,
      shared_by: sharedBy,
      shared_with_name: sharedWithName,
    };

    if (index >= 0) {
      this.assignments[index] = assignment;
    } else {
      this.assignments.push(assignment);
    }

    this.recordAuditEvent({
      eventType: canDecrypt ? 'ASSET_ACCESS_GRANTED' : 'ASSET_ACCESS_REVOKED',
      description: `Cryptographic access ${canDecrypt ? 'granted' : 'restricted'} for asset ${assetId} (user: ${userId}).`,
      targetId: assetId,
      severity: 'INFO',
    });

    return assignment;
  }

  public revokeAssignment(assetId: string, userId: string): void {
    const index = this.assignments.findIndex(a => a.asset_id === assetId && a.user_id === userId);
    if (index >= 0) {
      this.assignments[index].status = 'REVOKED';
      this.assignments[index].can_decrypt = false;
      this.assignments[index].can_download = false;
    } else {
      this.assignments.push({
        asset_id: assetId,
        user_id: userId,
        can_read: true,
        can_decrypt: false,
        can_download: false,
        can_edit: false,
        can_delete: false,
        status: 'REVOKED',
        assigned_at: new Date().toISOString(),
        expires_at: null,
      });
    }

    this.recordAuditEvent({
      eventType: 'ASSET_ACCESS_REVOKED',
      description: `Cryptographic access revoked for asset ${assetId} (user: ${userId}).`,
      targetId: assetId,
      severity: 'WARNING',
    });
  }

  // --- VAULT ASSET MANAGEMENT (UPLOAD, SHARE, RENAME, MOVE, DELETE) ---
  public createAsset(params: {
    name: string;
    folder: 'Projects' | 'Finance' | 'HR' | 'Engineering' | 'Legal' | string;
    classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | string;
    description: string;
    plaintext: string;
    mimeType?: string;
    fileType?: string;
    ownerId: string;
    ownerName: string;
    sizeBytes?: number;
    shareScope?: 'PRIVATE' | 'SPECIFIC_USER' | 'ALL_PEOPLE';
    targetUserId?: string;
    canDecryptShared?: boolean;
    canDownloadShared?: boolean;
    expiresAt?: string | null;
  }): StoredAsset {
    const masterKey = process.env.SECUREMAX_KMS_MASTER_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
    const assetId = 'ast_' + crypto.randomUUID().slice(0, 8);
    const assetCode = `SMX-${(params.folder || 'GEN').slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const dek = generateDEK();
    const aad = `asset_data:${assetId}`;
    const enc = encryptData(Buffer.from(params.plaintext, 'utf8'), dek, aad);

    const kek = deriveKEK(masterKey, assetId);
    const wrapped = encryptData(dek, kek, `key_wrapping:${assetId}`);
    this.wrappedDEKs.set(assetId, {
      cipher: wrapped.ciphertext,
      iv: wrapped.iv,
      authTag: wrapped.authTag,
    });

    const fileSizeBytes = params.sizeBytes || Buffer.byteLength(params.plaintext, 'utf8');
    const fileType = params.fileType || (params.name.includes('.') ? params.name.split('.').pop()?.toUpperCase() || 'TXT' : 'TXT');
    const mimeType = params.mimeType || 'text/plain';

    const shareScope = params.shareScope || 'PRIVATE';
    const isSharedWithAll = shareScope === 'ALL_PEOPLE';

    const newAsset: StoredAsset = {
      id: assetId,
      asset_code: assetCode,
      name: params.name,
      classification: params.classification,
      status: 'ACTIVE',
      description: params.description || `Uploaded file ${params.name}`,
      encrypted_content: enc.ciphertext,
      iv: enc.iv,
      auth_tag: enc.authTag,
      aad,
      folder: params.folder || 'Projects',
      file_type: fileType,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      owner_id: params.ownerId,
      owner_name: params.ownerName,
      shared_with_all: isSharedWithAll,
      default_access_policy: isSharedWithAll ? 'ORGANIZATION' : 'PRIVATE',
      created_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
      key_version: 'v1',
      versions: [
        {
          version: 'v1.0',
          uploaded_by: params.ownerName,
          created_at: new Date().toISOString(),
          size: `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
          notes: 'Initial cryptographic commit via Secure Data Vault',
        },
      ],
      access_history: [
        {
          id: 'log_' + crypto.randomUUID().slice(0, 8),
          action: 'UPLOAD_ENCRYPT',
          user_name: params.ownerName,
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
          details: 'AES-256-GCM Envelope Encryption complete',
        },
      ],
      blockchain_token_id: `NFT-SEPOLIA-#${Math.floor(8000 + Math.random() * 1999)}`,
      blockchain_contract: '0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B',
      did: `did:securemax:asset:${assetId}`,
    };

    this.assets.set(assetId, newAsset);

    // 1. Grant owner full assignment (Private to creator by default)
    this.assignments.push({
      asset_id: assetId,
      user_id: params.ownerId,
      can_read: true,
      can_decrypt: true,
      can_download: true,
      can_edit: true,
      can_delete: true,
      status: 'ACTIVE',
      assigned_at: new Date().toISOString(),
      expires_at: null,
      shared_by: 'Self (Owner)',
      shared_with_name: params.ownerName,
    });

    // 2. If organization-wide sharing is selected:
    if (isSharedWithAll) {
      this.assignments.push({
        asset_id: assetId,
        user_id: 'ALL',
        can_read: true,
        can_decrypt: params.canDecryptShared !== false,
        can_download: params.canDownloadShared !== false,
        can_edit: false,
        can_delete: false,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
        expires_at: params.expiresAt || null,
        shared_by: params.ownerName,
        shared_with_name: 'All People (Organization-Wide)',
      });
    } 
    // 3. If specific person is selected:
    else if (shareScope === 'SPECIFIC_USER' && params.targetUserId) {
      const targetUser = this.getUserById(params.targetUserId);
      this.assignments.push({
        asset_id: assetId,
        user_id: params.targetUserId,
        can_read: true,
        can_decrypt: params.canDecryptShared !== false,
        can_download: params.canDownloadShared !== false,
        can_edit: false,
        can_delete: false,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
        expires_at: params.expiresAt || null,
        shared_by: params.ownerName,
        shared_with_name: targetUser?.name || params.targetUserId,
      });
    }

    this.recordAuditEvent({
      eventType: 'ASSET_ENCRYPTED_AND_STORED',
      description: `Asset registered and encrypted with AES-256-GCM: ${params.name} (${assetCode}) [Scope: ${shareScope}]`,
      targetId: assetId,
      userName: params.ownerName,
      severity: 'INFO',
    });

    return newAsset;
  }

  public shareAsset(params: {
    assetId: string;
    targetUserId: string; // specific userId or 'ALL'
    callerUserId: string;
    canRead?: boolean;
    canDecrypt?: boolean;
    canDownload?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    expiresAt?: string | null;
  }): StoredAssignment {
    const asset = this.assets.get(params.assetId);
    if (!asset) throw new Error('Asset not found');

    const caller = this.getUserById(params.callerUserId);
    const callerAssignment = this.getAssignment(params.callerUserId, params.assetId);
    const isCallerAdmin = caller?.role === UserRole.ADMIN;
    const isOwner = asset.owner_id === params.callerUserId || asset.owner_name === caller?.name;

    if (!isCallerAdmin && !isOwner && (!callerAssignment || !callerAssignment.can_edit)) {
      throw new Error('Unauthorized: You do not have permission to share or manage access to this asset.');
    }

    const isAll = params.targetUserId === 'ALL';
    if (isAll) {
      asset.shared_with_all = true;
    }

    const targetUser = isAll ? null : this.getUserById(params.targetUserId);
    const targetName = isAll ? 'All People (Organization-Wide)' : (targetUser?.name || params.targetUserId);

    const assignment = this.setAssignment(
      params.assetId,
      params.targetUserId,
      params.canRead !== false,
      params.canDecrypt !== false,
      params.canDownload !== false,
      Boolean(params.canEdit),
      Boolean(params.canDelete),
      params.expiresAt || null,
      caller?.name || 'Authorized User',
      targetName
    );

    this.recordAuditEvent({
      eventType: isAll ? 'ASSET_SHARED_ORGANIZATION_WIDE' : 'ASSET_ACCESS_SHARED',
      description: `Access to asset "${asset.name}" shared with ${targetName}${params.expiresAt ? ` (Expires: ${params.expiresAt})` : ''}`,
      targetId: params.assetId,
      userName: caller?.name,
      severity: 'INFO',
    });

    return assignment;
  }

  public revokeAssetShare(assetId: string, targetUserId: string, callerUserId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const caller = this.getUserById(callerUserId);
    const callerAssignment = this.getAssignment(callerUserId, assetId);
    const isCallerAdmin = caller?.role === UserRole.ADMIN;
    const isOwner = asset.owner_id === callerUserId || asset.owner_name === caller?.name;

    if (!isCallerAdmin && !isOwner && (!callerAssignment || !callerAssignment.can_edit)) {
      throw new Error('Unauthorized: You do not have permission to revoke access to this asset.');
    }

    if (targetUserId === 'ALL') {
      asset.shared_with_all = false;
      this.assignments = this.assignments.filter(a => !(a.asset_id === assetId && a.user_id === 'ALL'));
    } else {
      this.assignments = this.assignments.filter(a => !(a.asset_id === assetId && a.user_id === targetUserId));
    }

    this.recordAuditEvent({
      eventType: 'ASSET_ACCESS_REVOKED',
      description: `Access to asset "${asset.name}" revoked for ${targetUserId === 'ALL' ? 'All People' : targetUserId}`,
      targetId: assetId,
      userName: caller?.name,
      severity: 'WARNING',
    });
  }

  public getSharesForAsset(assetId: string): Array<{
    userId: string;
    userName: string;
    userEmail?: string;
    canRead: boolean;
    canDecrypt: boolean;
    canDownload: boolean;
    canEdit: boolean;
    canDelete: boolean;
    status: string;
    expiresAt: string | null;
    isAll: boolean;
  }> {
    return this.assignments
      .filter(a => a.asset_id === assetId && a.status === 'ACTIVE')
      .map(a => {
        const isAll = a.user_id === 'ALL';
        const user = isAll ? null : this.getUserById(a.user_id);
        return {
          userId: a.user_id,
          userName: isAll ? 'All People (Organization-Wide)' : (user?.name || a.shared_with_name || a.user_id),
          userEmail: isAll ? 'all@organization.mil' : user?.email,
          canRead: a.can_read,
          canDecrypt: a.can_decrypt,
          canDownload: a.can_download,
          canEdit: a.can_edit,
          canDelete: a.can_delete,
          status: a.status,
          expiresAt: a.expires_at,
          isAll,
        };
      });
  }

  public setUserDefaultAccessPolicy(userId: string, policy: 'PRIVATE' | 'ORGANIZATION'): void {
    const user = this.getUserById(userId);
    if (user) {
      user.default_access_policy = policy;
      this.recordAuditEvent({
        eventType: 'USER_POLICY_UPDATED',
        description: `Default access policy set to ${policy} for user ${user.name}`,
        targetId: userId,
        userName: user.name,
        severity: 'INFO',
      });
    }
  }

  public getUserDefaultAccessPolicy(userId: string): 'PRIVATE' | 'ORGANIZATION' {
    const user = this.getUserById(userId);
    return user?.default_access_policy || 'PRIVATE';
  }

  public deleteAsset(assetId: string, callerUserId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const caller = this.getUserById(callerUserId);
    const callerAssignment = this.getAssignment(callerUserId, assetId);
    const isCallerAdmin = caller?.role === UserRole.ADMIN;

    if (!isCallerAdmin && (!callerAssignment || !callerAssignment.can_delete)) {
      throw new Error('Unauthorized: You do not have permission to delete this asset.');
    }

    this.assets.delete(assetId);
    this.wrappedDEKs.delete(assetId);
    this.assignments = this.assignments.filter(a => a.asset_id !== assetId);

    this.recordAuditEvent({
      eventType: 'ASSET_PERMANENTLY_DELETED',
      description: `Asset permanently deleted from vault: ${asset.name} (${asset.asset_code})`,
      targetId: assetId,
      userName: caller?.name,
      severity: 'WARNING',
    });
  }

  public renameAsset(assetId: string, newName: string, callerUserId: string): StoredAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const caller = this.getUserById(callerUserId);
    const callerAssignment = this.getAssignment(callerUserId, assetId);
    const isCallerAdmin = caller?.role === UserRole.ADMIN;

    if (!isCallerAdmin && (!callerAssignment || !callerAssignment.can_edit)) {
      throw new Error('Unauthorized: You do not have permission to rename this asset.');
    }

    const oldName = asset.name;
    asset.name = newName.trim();
    
    // Add version bump
    const nextVerNum = asset.versions.length + 1;
    asset.versions.unshift({
      version: `v${nextVerNum}.0`,
      uploaded_by: caller?.name || 'Authorized User',
      created_at: new Date().toISOString(),
      size: `${(asset.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`,
      notes: `Renamed from "${oldName}" to "${newName}"`,
    });

    this.recordAuditEvent({
      eventType: 'ASSET_METADATA_UPDATED',
      description: `Asset renamed: "${oldName}" -> "${newName}"`,
      targetId: assetId,
      userName: caller?.name,
      severity: 'INFO',
    });

    return asset;
  }

  public moveAssetFolder(assetId: string, newFolder: string, callerUserId: string): StoredAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const caller = this.getUserById(callerUserId);
    const callerAssignment = this.getAssignment(callerUserId, assetId);
    const isCallerAdmin = caller?.role === UserRole.ADMIN;

    if (!isCallerAdmin && (!callerAssignment || !callerAssignment.can_edit)) {
      throw new Error('Unauthorized: You do not have permission to move this asset.');
    }

    const oldFolder = asset.folder;
    asset.folder = newFolder;

    this.recordAuditEvent({
      eventType: 'ASSET_FOLDER_MOVED',
      description: `Asset "${asset.name}" moved from folder "${oldFolder}" to "${newFolder}"`,
      targetId: assetId,
      userName: caller?.name,
      severity: 'INFO',
    });

    return asset;
  }

  public recordAssetAccess(
    assetId: string,
    userId: string,
    action: string,
    status: 'SUCCESS' | 'DENIED' | 'PENDING',
    details?: string
  ): void {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    const user = this.getUserById(userId);
    const logEntry: AssetAccessLog = {
      id: 'log_' + crypto.randomUUID().slice(0, 8),
      action,
      user_name: user?.name || userId,
      timestamp: new Date().toISOString(),
      status,
      details,
    };

    if (!asset.access_history) asset.access_history = [];
    asset.access_history.unshift(logEntry);
    asset.last_accessed_at = logEntry.timestamp;
  }

  // --- PERMANENT AUDIT TRAIL ---
  public recordAuditEvent(params: {
    eventType: string;
    description: string;
    targetId?: string;
    userEmail?: string;
    userName?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  }): StoredAuditEvent {
    const rawHash = crypto.createHash('sha256').update(`${Date.now()}:${params.eventType}:${params.description}`).digest('hex');
    const event: StoredAuditEvent = {
      id: 'aud_' + crypto.randomUUID().slice(0, 8),
      event_type: params.eventType,
      description: params.description,
      target_id: params.targetId,
      user_email: params.userEmail,
      user_name: params.userName,
      severity: params.severity || 'INFO',
      event_hash: '0x' + rawHash,
      block_number: 6849200 + Math.floor(Math.random() * 500),
      created_at: new Date().toISOString(),
    };
    this.auditEvents.unshift(event);
    return event;
  }

  public getAuditEvents(): StoredAuditEvent[] {
    return this.auditEvents;
  }

  // --- ACCESS REQUESTS (HIGH-RISK DATA & AUDITOR UPDATES) ---
  public createAccessRequest(params: {
    userId: string;
    requestType: 'HIGH_RISK_DATA' | 'AUDIT_UPDATE';
    assetId?: string;
    reason: string;
  }): StoredAccessRequest {
    const user = this.getUserById(params.userId);
    if (!user) throw new Error('User not found');

    let assetName = 'System Audit Ledger';
    let assetCode = 'SMX-AUDIT-ROOT';

    if (params.assetId) {
      const asset = this.assets.get(params.assetId);
      if (asset) {
        assetName = asset.name;
        assetCode = asset.asset_code;
      }
    }

    const reqId = 'req_' + crypto.randomUUID().slice(0, 8);
    const accessReq: StoredAccessRequest = {
      id: reqId,
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      role: user.role,
      request_type: params.requestType,
      asset_id: params.assetId,
      asset_code: assetCode,
      asset_name: assetName,
      reason: params.reason,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    this.accessRequests.unshift(accessReq);

    this.recordAuditEvent({
      eventType: 'ACCESS_REQUEST_SUBMITTED',
      description: `${user.name} requested clearance for ${assetName} (Pending Admin NFT Permit)`,
      targetId: params.assetId || 'AUDIT_LEDGER',
      userEmail: user.email,
      userName: user.name,
      severity: 'WARNING',
    });

    return accessReq;
  }

  public approveAccessRequest(requestId: string, adminUserId: string): StoredAccessRequest {
    const admin = this.getUserById(adminUserId);
    if (admin?.role !== UserRole.ADMIN) {
      throw new Error('Only Administrator can approve access and mint NFT permits');
    }

    const req = this.accessRequests.find(r => r.id === requestId);
    if (!req) throw new Error('Access request not found');

    req.status = 'APPROVED';
    req.approved_at = new Date().toISOString();
    req.nft_token_id = `NFT-SEPOLIA-#${Math.floor(1000 + Math.random() * 9000)}`;

    // If it was for an asset, grant decryption access in assignments
    if (req.asset_id && req.user_id) {
      this.setAssignment(req.asset_id, req.user_id, true, true);
    }

    this.recordAuditEvent({
      eventType: 'NFT_ACCESS_PERMIT_MINTED',
      description: `Admin approved access for ${req.user_name}. NFT Permit: ${req.nft_token_id}`,
      targetId: req.asset_id || req.nft_token_id,
      userEmail: req.user_email,
      userName: req.user_name,
      severity: 'INFO',
    });

    return req;
  }

  public getAccessRequests(): StoredAccessRequest[] {
    return this.accessRequests;
  }
}

// Global singleton
const globalForStore = global as unknown as { secureMaxStore?: SecureMaxStore };
export const deviceStore = globalForStore.secureMaxStore || new SecureMaxStore();
if (process.env.NODE_ENV !== 'production') globalForStore.secureMaxStore = deviceStore;
