import 'server-only';
import crypto from 'crypto';
import { UserRole, UserStatus, UserDevice, DeviceEnrollment } from '@/types';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  kyc_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  status: UserStatus;
  did: string;
  created_at: string;
}

export interface AssetVersionRecord {
  version: string;
  uploaded_by: string;
  timestamp: string;
  key_version: string;
  note: string;
}

export interface AssetAccessLog {
  timestamp: string;
  user_name: string;
  action: string;
  status: 'SUCCESS' | 'DENIED' | 'PENDING';
}

export interface StoredAsset {
  id: string;
  asset_code: string;
  name: string;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'HIGH';
  status: string;
  description: string;
  encrypted_content: string; // Base64 AES-256-GCM ciphertext
  iv: string;
  auth_tag: string;
  aad: string;
  folder: 'Projects' | 'Finance' | 'HR' | 'Engineering' | 'Legal';
  category: 'Documents' | 'Images' | 'Videos' | 'Spreadsheets' | 'PDFs' | 'ZIP archives' | 'Other files';
  file_size: string;
  file_extension: string;
  owner_name: string;
  owner_address: string;
  did: string;
  token_id: string;
  encryption_algorithm: string;
  key_version: string;
  created_at: string;
  last_accessed_at: string;
  versions: AssetVersionRecord[];
  access_history: AssetAccessLog[];
  is_archived?: boolean;
}

export interface StoredAssignment {
  asset_id: string;
  user_id: string;
  can_read: boolean;
  can_decrypt: boolean;
  can_download?: boolean;
  can_edit?: boolean;
  can_share?: boolean;
  can_transfer?: boolean;
  can_delete?: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  assigned_at: string;
  expires_at?: string | null;
}

export interface StoredAccessRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role: string;
  request_type: 'HIGH_RISK_DATA' | 'AUDIT_UPDATE' | 'ASSET_ACCESS';
  asset_id?: string;
  asset_code?: string;
  asset_name?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  nft_token_id?: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
}

import { auditService, CanonicalAuditEvent, AuditLayer, AuditResult } from '@/lib/audit/auditService';

export type StoredAuditEvent = CanonicalAuditEvent;

export interface StoredNotification {
  id: string;
  type: 'ACCESS_REQUEST' | 'ACCESS_APPROVED' | 'ACCESS_REVOKED' | 'DEVICE_REGISTERED' | 'SECURITY_ALERT' | 'ASSET_SHARED' | 'KEY_ROTATED';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  target_id?: string;
}

// In-memory persistent state (persists across hot-reloads within the server instance)
class SecureMaxStore {
  public users: Map<string, StoredUser> = new Map();
  public devices: Map<string, UserDevice> = new Map();
  public enrollments: Map<string, DeviceEnrollment> = new Map();
  public assets: Map<string, StoredAsset> = new Map();
  public assignments: StoredAssignment[] = [];
  public challengeCache: Map<string, { challengeId: string; identifier: string; nonce: string; message: string; expiresAt: string }> = new Map();
  public accessRequests: StoredAccessRequest[] = [];
  public auditEvents: StoredAuditEvent[] = [];
  public notifications: StoredNotification[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
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

    const adminDevice: UserDevice = {
      id: 'dev_admin_primary',
      user_id: adminUser.id,
      device_name: "Admin Laptop (Hardware-Bound)",
      public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2Z37UoHq3y1V4XwH5K7oF9P9k3sZ0s7uVvWxX0y1A2bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4z5A6bC7w==',
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

    // 4. TEAM MEMBER: Ritik (Systems Architect)
    const ritikUser: StoredUser = {
      id: 'usr_ritik_004',
      name: 'Ritik (Systems Architect)',
      email: 'ritik@securemax.mil',
      role: UserRole.USER,
      kyc_status: 'VERIFIED',
      status: UserStatus.ACTIVE,
      did: 'did:securemax:user:004',
      created_at: '2026-09-04T00:00:00.000Z',
    };
    this.users.set(ritikUser.id, ritikUser);
    this.users.set(ritikUser.email, ritikUser);

    // 5. TEAM MEMBER: Vaani (Security Analyst)
    const vaaniUser: StoredUser = {
      id: 'usr_vaani_005',
      name: 'Vaani (Security Analyst)',
      email: 'vaani@securemax.mil',
      role: UserRole.USER,
      kyc_status: 'VERIFIED',
      status: UserStatus.ACTIVE,
      did: 'did:securemax:user:005',
      created_at: '2026-09-05T00:00:00.000Z',
    };
    this.users.set(vaaniUser.id, vaaniUser);
    this.users.set(vaaniUser.email, vaaniUser);

    // ----------------------------------------------------
    // 12 PRE-SEEDED ENCRYPTED VAULT ASSETS (AES-256-GCM)
    // Exactly 12 Assets: 8 Authorized, 2 Pending, 2 Restricted for Vasu
    // ----------------------------------------------------

    // 1. Projects - Project Alpha (PDF) - CONFIDENTIAL [Authorized]
    this.assets.set('ast_alpha', {
      id: 'ast_alpha',
      asset_code: 'SMX-AST-000124',
      name: 'Project Alpha.pdf',
      classification: 'CONFIDENTIAL',
      status: 'ACTIVE',
      description: 'Confidential defense design specifications and frequency hopping tactical comms.',
      encrypted_content: Buffer.from('TOP SECRET // CONFIDENTIAL DEFENSE INTEL:\nProject Alpha utilizes frequency hopping spread spectrum (FHSS) at 2.4-5.8 GHz with AES-256-GCM authenticated payload encapsulation.\nCryptographic authorization enforced via Server-Side KMS and Sepolia dual-chain registry.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000124:CONFIDENTIAL',
      folder: 'Projects',
      category: 'PDFs',
      file_size: '4.8 MB',
      file_extension: 'pdf',
      owner_name: 'Organization (Engineering Directorate)',
      owner_address: '0x71C8A3297bB2d0D3C9D55C8f6B429A6b2F2b3C18',
      did: 'did:assetchain:sep:ast-000124',
      token_id: '#1024',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v3',
      created_at: '2026-09-17T09:20:00.000Z',
      last_accessed_at: '2026-09-19T17:04:00.000Z',
      versions: [
        { version: 'v3', uploaded_by: 'Admin', timestamp: '2026-09-19T17:02:00.000Z', key_version: 'v3', note: 'Modulation frequency calibration update' },
        { version: 'v2', uploaded_by: 'Manager', timestamp: '2026-09-18T12:40:00.000Z', key_version: 'v2', note: 'Integration with tactical mesh relay' },
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-17T09:20:00.000Z', key_version: 'v1', note: 'Original baseline upload' },
      ],
      access_history: [
        { timestamp: '17:04', user_name: 'Vasu', action: 'Opened & Decrypted Document', status: 'SUCCESS' },
        { timestamp: '17:02', user_name: 'Admin', action: 'Granted Access & Rotated Key', status: 'SUCCESS' },
        { timestamp: '16:59', user_name: 'Admin', action: 'Uploaded Document Version v3', status: 'SUCCESS' },
        { timestamp: '16:40', user_name: 'Vaani', action: 'Requested Access Clearance', status: 'PENDING' },
      ],
    });

    // 2. Projects - Project Beta (ZIP) - CONFIDENTIAL [Authorized]
    this.assets.set('ast_beta', {
      id: 'ast_beta',
      asset_code: 'SMX-AST-000125',
      name: 'Project Beta Architecture.zip',
      classification: 'CONFIDENTIAL',
      status: 'ACTIVE',
      description: 'Source bundle of drone telemetry protocols, micro-service mesh, and PCB layouts.',
      encrypted_content: Buffer.from('PROJECT BETA SOURCE BUNDLE:\n- /src/telemetry/drone_protocol.c\n- /src/crypto/hardware_enclave.rs\n- /docs/pcb_layout_rev4.dxf\nAll files cryptographically verified with SHA-256 state anchors.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000125:CONFIDENTIAL',
      folder: 'Projects',
      category: 'ZIP archives',
      file_size: '18.4 MB',
      file_extension: 'zip',
      owner_name: 'Organization (R&D Division)',
      owner_address: '0x89B51E20A2744B9E38c64C2E9f72782A4C2aE942',
      did: 'did:assetchain:sep:ast-000125',
      token_id: '#1025',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v2',
      created_at: '2026-09-15T10:00:00.000Z',
      last_accessed_at: '2026-09-18T14:10:00.000Z',
      versions: [
        { version: 'v2', uploaded_by: 'Vasu', timestamp: '2026-09-18T14:10:00.000Z', key_version: 'v2', note: 'Telemetry compression algorithms added' },
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-15T10:00:00.000Z', key_version: 'v1', note: 'Initial schematics bundle upload' },
      ],
      access_history: [
        { timestamp: '14:10', user_name: 'Vasu', action: 'Uploaded Version v2', status: 'SUCCESS' },
        { timestamp: '11:20', user_name: 'Ritik', action: 'Downloaded Archive', status: 'SUCCESS' },
      ],
    });

    // 3. Projects - Project Gamma (DOCX) - INTERNAL [Authorized]
    this.assets.set('ast_gamma', {
      id: 'ast_gamma',
      asset_code: 'SMX-AST-000126',
      name: 'Project Gamma Node Topology.docx',
      classification: 'INTERNAL',
      status: 'ACTIVE',
      description: 'Decentralized node mesh routing specification and heartbeat transmission guidelines.',
      encrypted_content: Buffer.from('PROJECT GAMMA SPECIFICATION:\nDecentralized node mesh network operating over IEEE 802.15.4 with dynamic route calculation and zero-latency failover.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000126:INTERNAL',
      folder: 'Projects',
      category: 'Documents',
      file_size: '1.2 MB',
      file_extension: 'docx',
      owner_name: 'Vasu (Lead Engineer)',
      owner_address: '0x3a4B1d02847c9c0F0a8112001594916a0DbcA405',
      did: 'did:assetchain:sep:ast-000126',
      token_id: '#1026',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v1',
      created_at: '2026-09-16T11:45:00.000Z',
      last_accessed_at: '2026-09-19T11:00:00.000Z',
      versions: [
        { version: 'v1', uploaded_by: 'Vasu', timestamp: '2026-09-16T11:45:00.000Z', key_version: 'v1', note: 'Initial node topology document' },
      ],
      access_history: [
        { timestamp: '11:00', user_name: 'Vasu', action: 'Decrypted & Viewed', status: 'SUCCESS' },
      ],
    });

    // 4. Finance - Financial Report Q3 (XLSX) - CONFIDENTIAL [Authorized]
    this.assets.set('ast_finance', {
      id: 'ast_finance',
      asset_code: 'SMX-AST-000127',
      name: 'Financial Report Q3.xlsx',
      classification: 'CONFIDENTIAL',
      status: 'ACTIVE',
      description: 'Quarterly financial compliance, procurement expenditures, and Server-Side KMS key licenses.',
      encrypted_content: Buffer.from('FINANCIAL REPORT // Q3 FY26:\nProcurement expenditures: $4,200,000.\nCryptographic hardware enclaves: $850,000.\nDecentralized auditor retainers: $320,000.\nAll allocations fully audited and verified against smart contracts.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000127:CONFIDENTIAL',
      folder: 'Finance',
      category: 'Spreadsheets',
      file_size: '3.6 MB',
      file_extension: 'xlsx',
      owner_name: 'Finance Directorate',
      owner_address: '0x29Da4B75128D0179F9C623C5E37E03cA39352A9D',
      did: 'did:assetchain:sep:ast-000127',
      token_id: '#1027',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v2',
      created_at: '2026-09-14T08:30:00.000Z',
      last_accessed_at: '2026-09-19T16:15:00.000Z',
      versions: [
        { version: 'v2', uploaded_by: 'Manager', timestamp: '2026-09-17T15:00:00.000Z', key_version: 'v2', note: 'Audit ledger reconciliation' },
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-14T08:30:00.000Z', key_version: 'v1', note: 'Initial Q3 ledger export' },
      ],
      access_history: [
        { timestamp: '16:15', user_name: 'Vasu', action: 'Decrypted for Authorized Session', status: 'SUCCESS' },
        { timestamp: '14:00', user_name: 'Auditor', action: 'Audited Cryptographic Signature', status: 'SUCCESS' },
      ],
    });

    // 5. Finance - Annual Treasury Allocation (XLSX) - RESTRICTED [Restricted for Vasu]
    this.assets.set('ast_treasury', {
      id: 'ast_treasury',
      asset_code: 'SMX-AST-000128',
      name: 'Annual Treasury Allocation.xlsx',
      classification: 'RESTRICTED',
      status: 'ACTIVE',
      description: 'Executive level capital reserve allocations and defense ledger commitments.',
      encrypted_content: Buffer.from('TREASURY ALLOCATION CONFIDENTIAL:\nCapital reserves: $24,500,000.\nStrategic asset reserve commitments: $12,000,000.\nBreak-glass emergency keys assigned to dual-custody trustees.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000128:RESTRICTED',
      folder: 'Finance',
      category: 'Spreadsheets',
      file_size: '2.9 MB',
      file_extension: 'xlsx',
      owner_name: 'Chief Financial Officer',
      owner_address: '0x29Da4B75128D0179F9C623C5E37E03cA39352A9D',
      did: 'did:assetchain:sep:ast-000128',
      token_id: '#1028',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v1',
      created_at: '2026-09-10T14:00:00.000Z',
      last_accessed_at: '2026-09-19T17:06:00.000Z',
      versions: [
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-10T14:00:00.000Z', key_version: 'v1', note: 'Treasury reserve allocation model' },
      ],
      access_history: [
        { timestamp: '17:06', user_name: 'Vasu', action: 'Access Denied (Restricted Clearance)', status: 'DENIED' },
      ],
    });

    // 6. HR - HR Policy & Compliance 2026 (PDF) - INTERNAL [Authorized]
    this.assets.set('ast_hr_policy', {
      id: 'ast_hr_policy',
      asset_code: 'SMX-AST-000129',
      name: 'HR Policy & Compliance 2026.pdf',
      classification: 'INTERNAL',
      status: 'ACTIVE',
      description: 'Organizational security clearances, multi-device usage guidelines, and whistleblower procedures.',
      encrypted_content: Buffer.from('SECUREMAX HR & SECURITY COMPLIANCE 2026:\nAll staff must bind at least one cryptographic hardware device.\nSharing credentials violates zero-trust terms. Revocation takes effect instantly across all enclaves.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000129:INTERNAL',
      folder: 'HR',
      category: 'PDFs',
      file_size: '2.1 MB',
      file_extension: 'pdf',
      owner_name: 'HR Directorate',
      owner_address: '0x51E289C3A62846170A647890bCAe09315D3a2862',
      did: 'did:assetchain:sep:ast-000129',
      token_id: '#1029',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v1',
      created_at: '2026-09-08T09:00:00.000Z',
      last_accessed_at: '2026-09-19T13:40:00.000Z',
      versions: [
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-08T09:00:00.000Z', key_version: 'v1', note: 'Annual policy ratification' },
      ],
      access_history: [
        { timestamp: '13:40', user_name: 'Vasu', action: 'Decrypted & Viewed', status: 'SUCCESS' },
      ],
    });

    // 7. HR - Personnel Security Clearances (DOCX) - RESTRICTED [Restricted for Vasu]
    this.assets.set('ast_personnel', {
      id: 'ast_personnel',
      asset_code: 'SMX-AST-000130',
      name: 'Personnel Security Clearances.docx',
      classification: 'RESTRICTED',
      status: 'ACTIVE',
      description: 'National security vetting grades, biometric records, and active credential holders.',
      encrypted_content: Buffer.from('CONFIDENTIAL PERSONNEL VETTING:\nList of personnel cleared for Level-5 access.\nVetting performed according to defense-grade background checks.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000130:RESTRICTED',
      folder: 'HR',
      category: 'Documents',
      file_size: '1.8 MB',
      file_extension: 'docx',
      owner_name: 'Security Officer',
      owner_address: '0x51E289C3A62846170A647890bCAe09315D3a2862',
      did: 'did:assetchain:sep:ast-000130',
      token_id: '#1030',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v2',
      created_at: '2026-09-11T12:00:00.000Z',
      last_accessed_at: '2026-09-18T10:00:00.000Z',
      versions: [
        { version: 'v2', uploaded_by: 'Admin', timestamp: '2026-09-18T10:00:00.000Z', key_version: 'v2', note: 'Biometric credential update' },
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-11T12:00:00.000Z', key_version: 'v1', note: 'Initial clearance list' },
      ],
      access_history: [
        { timestamp: '10:00', user_name: 'Admin', action: 'Updated Personnel Records', status: 'SUCCESS' },
      ],
    });

    // 8. Engineering - Avionics Radar Interface Specs (PDF) - RESTRICTED [Pending for Vasu]
    this.assets.set('ast_avionics', {
      id: 'ast_avionics',
      asset_code: 'SMX-AST-000131',
      name: 'Avionics Radar Interface Specs.pdf',
      classification: 'RESTRICTED',
      status: 'ACTIVE',
      description: 'Hardware interface diagrams, pinouts, and bus timings for ARINC 429 tactical radar.',
      encrypted_content: Buffer.from('RESTRICTED RADAR SPEC:\nARINC 429 high-speed bus pinout configuration with MIL-STD-1553 redundant multiplexing.\nTransmission power: 450W pulse, pulse repetition frequency: 1200 Hz.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000131:RESTRICTED',
      folder: 'Engineering',
      category: 'PDFs',
      file_size: '6.4 MB',
      file_extension: 'pdf',
      owner_name: 'Lead Defense Architect',
      owner_address: '0x71C8A3297bB2d0D3C9D55C8f6B429A6b2F2b3C18',
      did: 'did:assetchain:sep:ast-000131',
      token_id: '#1031',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v3',
      created_at: '2026-09-12T16:00:00.000Z',
      last_accessed_at: '2026-09-19T17:07:00.000Z',
      versions: [
        { version: 'v3', uploaded_by: 'Admin', timestamp: '2026-09-18T16:00:00.000Z', key_version: 'v3', note: 'Radar bus timing calibration' },
        { version: 'v2', uploaded_by: 'Manager', timestamp: '2026-09-15T11:00:00.000Z', key_version: 'v2', note: 'Pinout diagram revision' },
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-12T16:00:00.000Z', key_version: 'v1', note: 'Initial radar engineering document' },
      ],
      access_history: [
        { timestamp: '17:07', user_name: 'Vasu', action: 'Access Request Submitted (Awaiting Admin Permit)', status: 'PENDING' },
      ],
    });

    // 9. Engineering - Firmware Kernel v4.2 (BIN) - CONFIDENTIAL [Authorized]
    this.assets.set('ast_kernel', {
      id: 'ast_kernel',
      asset_code: 'SMX-AST-000132',
      name: 'Firmware Kernel v4.2.bin',
      classification: 'CONFIDENTIAL',
      status: 'ACTIVE',
      description: 'Compiled embedded microkernel binary with hardware enclave memory isolation routines.',
      encrypted_content: Buffer.from('EMBEDDED MICROKERNEL v4.2 BINARY IMAGE:\nSHA256: 9b2d8f1e4a5c6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a\nKernel entrypoint: 0x08004000. Hardware memory protection unit active.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000132:CONFIDENTIAL',
      folder: 'Engineering',
      category: 'Other files',
      file_size: '3.1 MB',
      file_extension: 'bin',
      owner_name: 'Firmware Engineering Group',
      owner_address: '0x89B51E20A2744B9E38c64C2E9f72782A4C2aE942',
      did: 'did:assetchain:sep:ast-000132',
      token_id: '#1032',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v2',
      created_at: '2026-09-13T17:30:00.000Z',
      last_accessed_at: '2026-09-19T15:20:00.000Z',
      versions: [
        { version: 'v2', uploaded_by: 'Vasu', timestamp: '2026-09-17T11:00:00.000Z', key_version: 'v2', note: 'Hardware MPU driver integration' },
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-13T17:30:00.000Z', key_version: 'v1', note: 'Initial release build' },
      ],
      access_history: [
        { timestamp: '15:20', user_name: 'Vasu', action: 'Decrypted & Viewed', status: 'SUCCESS' },
      ],
    });

    // 10. Engineering - Defense Perimeter Blueprint (PNG) - CONFIDENTIAL [Authorized]
    this.assets.set('ast_perimeter', {
      id: 'ast_perimeter',
      asset_code: 'SMX-AST-000133',
      name: 'Defense Perimeter Blueprint.png',
      classification: 'CONFIDENTIAL',
      status: 'ACTIVE',
      description: 'Physical facility intrusion detection grid and perimeter sensor layout diagram.',
      encrypted_content: Buffer.from('PERIMETER BLUEPRINT MAP VECTOR DATA:\nSensors: S-01 to S-48. Infrared tripwires armed across Sector 4.\nCamera nodes synchronized with zero-trust video mesh relay.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000133:CONFIDENTIAL',
      folder: 'Engineering',
      category: 'Images',
      file_size: '8.5 MB',
      file_extension: 'png',
      owner_name: 'Physical Security Operations',
      owner_address: '0x3a4B1d02847c9c0F0a8112001594916a0DbcA405',
      did: 'did:assetchain:sep:ast-000133',
      token_id: '#1033',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v1',
      created_at: '2026-09-14T15:00:00.000Z',
      last_accessed_at: '2026-09-19T16:00:00.000Z',
      versions: [
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-14T15:00:00.000Z', key_version: 'v1', note: 'Initial perimeter sensor grid blueprint' },
      ],
      access_history: [
        { timestamp: '16:00', user_name: 'Vasu', action: 'Decrypted & Viewed Blueprint', status: 'SUCCESS' },
      ],
    });

    // 11. Legal - Patent Filing NDAs & Claims (PDF) - CONFIDENTIAL [Pending for Vasu]
    this.assets.set('ast_patent', {
      id: 'ast_patent',
      asset_code: 'SMX-AST-000134',
      name: 'Patent Filing NDAs & Claims.pdf',
      classification: 'CONFIDENTIAL',
      status: 'ACTIVE',
      description: 'Intellectual property claim drafts for dual-blockchain zero-knowledge audit verification.',
      encrypted_content: Buffer.from('PATENT APPLICATION CLAIMS (PROVISIONAL):\n1. A method for dual-chain cryptographic access control combining hardware-enclave identity with decentralized audit root anchoring.\n2. Envelope encryption pipeline with ephemeral session tokens.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000134:CONFIDENTIAL',
      folder: 'Legal',
      category: 'PDFs',
      file_size: '1.5 MB',
      file_extension: 'pdf',
      owner_name: 'Legal General Counsel',
      owner_address: '0x44B129c9eA6740bCb28198a0d922E2B06F2aA158',
      did: 'did:assetchain:sep:ast-000134',
      token_id: '#1034',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v1',
      created_at: '2026-09-15T09:30:00.000Z',
      last_accessed_at: '2026-09-19T16:45:00.000Z',
      versions: [
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-15T09:30:00.000Z', key_version: 'v1', note: 'Initial patent claims specification' },
      ],
      access_history: [
        { timestamp: '16:45', user_name: 'Vasu', action: 'Access Request Submitted (Pending Legal Approval)', status: 'PENDING' },
      ],
    });

    // 12. Legal - Global Compliance Charter (PDF) - PUBLIC [Authorized]
    this.assets.set('ast_compliance', {
      id: 'ast_compliance',
      asset_code: 'SMX-AST-000135',
      name: 'Global Compliance Charter.pdf',
      classification: 'PUBLIC',
      status: 'ACTIVE',
      description: 'Publicly auditable statutory governance statement and cryptographic transparency pledge.',
      encrypted_content: Buffer.from('SECUREMAX PUBLIC COMPLIANCE CHARTER:\nSecureMAX guarantees all data access events are cryptographically recorded into tamper-evident Merkle roots.\nPublic audit verification available 24/7 on Ethereum Sepolia Testnet.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AST-000135:PUBLIC',
      folder: 'Legal',
      category: 'PDFs',
      file_size: '980 KB',
      file_extension: 'pdf',
      owner_name: 'Compliance Office',
      owner_address: '0x44B129c9eA6740bCb28198a0d922E2B06F2aA158',
      did: 'did:assetchain:sep:ast-000135',
      token_id: '#1035',
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v1',
      created_at: '2026-09-01T08:00:00.000Z',
      last_accessed_at: '2026-09-19T12:30:00.000Z',
      versions: [
        { version: 'v1', uploaded_by: 'Admin', timestamp: '2026-09-01T08:00:00.000Z', key_version: 'v1', note: 'Charter inaugural publication' },
      ],
      access_history: [
        { timestamp: '12:30', user_name: 'Vasu', action: 'Viewed Document', status: 'SUCCESS' },
      ],
    });

    // ----------------------------------------------------
    // ASSET ASSIGNMENTS (Vasu has 8 Authorized, 2 Pending, 2 Restricted)
    // ----------------------------------------------------

    // 8 Authorized for Vasu:
    const authorizedForVasu = ['ast_alpha', 'ast_beta', 'ast_gamma', 'ast_finance', 'ast_hr_policy', 'ast_kernel', 'ast_perimeter', 'ast_compliance'];
    for (const astId of authorizedForVasu) {
      this.assignments.push({
        asset_id: astId,
        user_id: standardUser.id,
        can_read: true,
        can_decrypt: true,
        can_download: true,
        can_edit: ['ast_beta', 'ast_gamma'].includes(astId),
        can_share: ['ast_alpha', 'ast_gamma', 'ast_perimeter', 'ast_compliance'].includes(astId),
        can_transfer: false,
        can_delete: false,
        status: 'ACTIVE',
        assigned_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      });
    }

    // Pending for Vasu (Read-only or pending clearance):
    this.assignments.push({
      asset_id: 'ast_avionics',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: false,
      can_download: false,
      can_edit: false,
      can_share: false,
      can_transfer: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    });

    this.assignments.push({
      asset_id: 'ast_patent',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: false,
      can_download: false,
      can_edit: false,
      can_share: false,
      can_transfer: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    });

    // Team Member Ritik & Vaani assignments for demo scenarios
    this.assignments.push({
      asset_id: 'ast_alpha',
      user_id: ritikUser.id,
      can_read: true,
      can_decrypt: true,
      can_download: false,
      can_edit: true,
      can_share: false,
      can_transfer: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
    });

    this.assignments.push({
      asset_id: 'ast_alpha',
      user_id: vaaniUser.id,
      can_read: true,
      can_decrypt: false,
      can_download: false,
      can_edit: false,
      can_share: false,
      can_transfer: false,
      can_delete: false,
      status: 'ACTIVE',
      assigned_at: new Date(Date.now() - 3600 * 1000 * 10).toISOString(),
    });

    // Admin has global rights on all assets
    for (const astId of this.assets.keys()) {
      this.assignments.push({
        asset_id: astId,
        user_id: adminUser.id,
        can_read: true,
        can_decrypt: true,
        can_download: true,
        can_edit: true,
        can_share: true,
        can_transfer: true,
        can_delete: true,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
      });
    }

    // ----------------------------------------------------
    // INITIAL ACCESS REQUESTS
    // ----------------------------------------------------
    this.accessRequests.push({
      id: 'req_001',
      user_id: standardUser.id,
      user_email: standardUser.email,
      user_name: standardUser.name,
      role: 'USER',
      request_type: 'HIGH_RISK_DATA',
      asset_id: 'ast_avionics',
      asset_code: 'SMX-AST-000131',
      asset_name: 'Avionics Radar Interface Specs.pdf',
      reason: 'Tactical comms and high-speed bus integration review',
      status: 'PENDING',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });

    this.accessRequests.push({
      id: 'req_002',
      user_id: standardUser.id,
      user_email: standardUser.email,
      user_name: standardUser.name,
      role: 'USER',
      request_type: 'ASSET_ACCESS',
      asset_id: 'ast_patent',
      asset_code: 'SMX-AST-000134',
      asset_name: 'Patent Filing NDAs & Claims.pdf',
      reason: 'Dual-chain patent claims review for upcoming intellectual property filing',
      status: 'PENDING',
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    });

    this.accessRequests.push({
      id: 'req_003',
      user_id: auditorUser.id,
      user_email: auditorUser.email,
      user_name: auditorUser.name,
      role: 'AUDITOR',
      request_type: 'AUDIT_UPDATE',
      asset_id: 'ast_finance',
      asset_code: 'SMX-AST-000127',
      asset_name: 'Financial Report Q3.xlsx',
      reason: 'Compliance review & permanent blockchain anchor verification',
      status: 'PENDING',
      created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    });

    // ----------------------------------------------------
    // NOTIFICATIONS
    // ----------------------------------------------------
    this.notifications.push(
      {
        id: 'notif_1',
        type: 'ACCESS_REQUEST',
        title: 'New Access Request',
        message: 'Vaani requested clearance for Project Alpha.pdf',
        timestamp: '16:40 Today',
        read: false,
        target_id: 'ast_alpha',
      },
      {
        id: 'notif_2',
        type: 'ACCESS_APPROVED',
        title: 'Access Approved',
        message: 'Admin granted decryption permit for Project Alpha.pdf',
        timestamp: '17:02 Today',
        read: false,
        target_id: 'ast_alpha',
      },
      {
        id: 'notif_3',
        type: 'KEY_ROTATED',
        title: 'Encryption Key Rotated',
        message: 'Key version v3 active for SMX-AST-000124 (Project Alpha)',
        timestamp: '17:02 Today',
        read: false,
        target_id: 'ast_alpha',
      },
      {
        id: 'notif_4',
        type: 'ASSET_SHARED',
        title: 'Asset Shared With You',
        message: 'Financial Report Q3.xlsx was shared by Finance Directorate',
        timestamp: 'Yesterday',
        read: true,
        target_id: 'ast_finance',
      },
      {
        id: 'notif_5',
        type: 'DEVICE_REGISTERED',
        title: 'New Device Registered',
        message: 'Workstation Laptop A enrolled with ECDSA P-256 key',
        timestamp: '2 days ago',
        read: true,
        target_id: 'dev_vasu_laptop',
      }
    );

    // ----------------------------------------------------
    // PERMANENT AUDIT LEDGER (Canonical 4-Layer SHA-256 Hash Chain)
    // ----------------------------------------------------
    this.auditEvents = auditService.getEvents();
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

  public getAllShareableUsers(): Array<{ id: string; name: string; email: string; role: string }> {
    const list: Array<{ id: string; name: string; email: string; role: string }> = [];
    const seen = new Set<string>();
    for (const u of this.users.values()) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        list.push({ id: u.id, name: u.name, email: u.email, role: u.role });
      }
    }
    return list;
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

    if (user.role === UserRole.ADMIN && !params.isAdminDevice) {
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

    if (callerUserId) {
      const caller = this.getUserById(callerUserId);
      const isCallerAdmin = caller?.role === UserRole.ADMIN;
      if (callerUserId !== userId && !isCallerAdmin) {
        throw new Error('Unauthorized: only an Admin can issue device enrollment codes for other users');
      }
    }

    if (targetUser.role === UserRole.ADMIN) {
      throw new Error('Admin account is strictly device-bound. Multi-device enrollment is disabled for root administrative security.');
    }

    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `SMX-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;

    const enrollment: DeviceEnrollment = {
      code,
      user_id: targetUser.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
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

    this.enrollments.delete(cleanCode);
    return enrollment.user_id;
  }

  // --- ASSET ASSIGNMENTS & ACCESS ENFORCEMENT ---

  /**
   * Returns assets assigned to the user (maintains compatibility with existing callers)
   */
  public getAssetsForUser(userId: string): Array<{
    asset: StoredAsset;
    can_read: boolean;
    can_decrypt: boolean;
    can_download: boolean;
    can_edit: boolean;
    can_share: boolean;
    can_transfer: boolean;
    can_delete: boolean;
    status: string;
    expires_at?: string | null;
  }> {
    const results: Array<{
      asset: StoredAsset;
      can_read: boolean;
      can_decrypt: boolean;
      can_download: boolean;
      can_edit: boolean;
      can_share: boolean;
      can_transfer: boolean;
      can_delete: boolean;
      status: string;
      expires_at?: string | null;
    }> = [];
    const user = this.getUserById(userId);

    for (const asset of this.assets.values()) {
      if (user?.role === UserRole.ADMIN) {
        results.push({
          asset,
          can_read: true,
          can_decrypt: true,
          can_download: true,
          can_edit: true,
          can_share: true,
          can_transfer: true,
          can_delete: true,
          status: 'ACTIVE',
        });
        continue;
      }

      const match = this.assignments.find(a => a.asset_id === asset.id && a.user_id === userId && a.status === 'ACTIVE');
      if (match) {
        results.push({
          asset,
          can_read: match.can_read,
          can_decrypt: match.can_decrypt,
          can_download: match.can_download ?? true,
          can_edit: match.can_edit ?? false,
          can_share: match.can_share ?? false,
          can_transfer: match.can_transfer ?? false,
          can_delete: match.can_delete ?? false,
          status: match.status,
          expires_at: match.expires_at,
        });
      }
    }

    return results;
  }

  /**
   * Returns all assets in the vault with their user-specific authorization state:
   * - AUTHORIZED (Read & Decrypt permitted)
   * - PENDING (Requested, waiting for Admin NFT Permit)
   * - RESTRICTED (Locked, can request access)
   */
  public getAllVaultAssetsForUser(userId: string): Array<{
    asset: StoredAsset;
    status: 'AUTHORIZED' | 'PENDING' | 'RESTRICTED';
    can_read: boolean;
    can_decrypt: boolean;
    can_download: boolean;
    can_edit: boolean;
    can_share: boolean;
    can_transfer: boolean;
    can_delete: boolean;
    expires_at?: string | null;
  }> {
    const results: Array<{
      asset: StoredAsset;
      status: 'AUTHORIZED' | 'PENDING' | 'RESTRICTED';
      can_read: boolean;
      can_decrypt: boolean;
      can_download: boolean;
      can_edit: boolean;
      can_share: boolean;
      can_transfer: boolean;
      can_delete: boolean;
      expires_at?: string | null;
    }> = [];

    const user = this.getUserById(userId);
    const isAdmin = user?.role === UserRole.ADMIN;

    for (const asset of this.assets.values()) {
      if (isAdmin) {
        results.push({
          asset,
          status: 'AUTHORIZED',
          can_read: true,
          can_decrypt: true,
          can_download: true,
          can_edit: true,
          can_share: true,
          can_transfer: true,
          can_delete: true,
        });
        continue;
      }

      const match = this.assignments.find(a => a.asset_id === asset.id && a.user_id === userId);
      const pendingReq = this.accessRequests.find(r => r.asset_id === asset.id && r.user_id === userId && r.status === 'PENDING');

      if (match && match.status === 'ACTIVE' && match.can_decrypt) {
        results.push({
          asset,
          status: 'AUTHORIZED',
          can_read: match.can_read,
          can_decrypt: match.can_decrypt,
          can_download: match.can_download ?? true,
          can_edit: match.can_edit ?? false,
          can_share: match.can_share ?? false,
          can_transfer: match.can_transfer ?? false,
          can_delete: match.can_delete ?? false,
          expires_at: match.expires_at,
        });
      } else if (pendingReq || (match && match.can_read && !match.can_decrypt)) {
        results.push({
          asset,
          status: 'PENDING',
          can_read: match?.can_read ?? false,
          can_decrypt: false,
          can_download: false,
          can_edit: false,
          can_share: false,
          can_transfer: false,
          can_delete: false,
          expires_at: match?.expires_at,
        });
      } else {
        results.push({
          asset,
          status: 'RESTRICTED',
          can_read: false,
          can_decrypt: false,
          can_download: false,
          can_edit: false,
          can_share: false,
          can_transfer: false,
          can_delete: false,
        });
      }
    }

    return results;
  }

  public getAssignment(userId: string, assetId: string): StoredAssignment | null {
    const user = this.getUserById(userId);
    if (user?.role === UserRole.ADMIN) {
      return {
        asset_id: assetId,
        user_id: userId,
        can_read: true,
        can_decrypt: true,
        can_download: true,
        can_edit: true,
        can_share: true,
        can_transfer: true,
        can_delete: true,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
      };
    }

    return this.assignments.find(a => a.asset_id === assetId && a.user_id === userId) || null;
  }

  public setAssignment(
    assetId: string,
    userId: string,
    canRead: boolean,
    canDecrypt: boolean,
    canDownload: boolean = true,
    canEdit: boolean = false,
    canShare: boolean = false,
    canTransfer: boolean = false,
    canDelete: boolean = false,
    expiresAt?: string | null
  ): void {
    const index = this.assignments.findIndex(a => a.asset_id === assetId && a.user_id === userId);
    if (index >= 0) {
      this.assignments[index].can_read = canRead;
      this.assignments[index].can_decrypt = canDecrypt;
      this.assignments[index].can_download = canDownload;
      this.assignments[index].can_edit = canEdit;
      this.assignments[index].can_share = canShare;
      this.assignments[index].can_transfer = canTransfer;
      this.assignments[index].can_delete = canDelete;
      this.assignments[index].status = 'ACTIVE';
      if (expiresAt !== undefined) this.assignments[index].expires_at = expiresAt;
    } else {
      this.assignments.push({
        asset_id: assetId,
        user_id: userId,
        can_read: canRead,
        can_decrypt: canDecrypt,
        can_download: canDownload,
        can_edit: canEdit,
        can_share: canShare,
        can_transfer: canTransfer,
        can_delete: canDelete,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
        expires_at: expiresAt || null,
      });
    }
  }

  public revokeAssignment(assetId: string, userId: string): void {
    const assignment = this.assignments.find(a => a.asset_id === assetId && a.user_id === userId);
    if (assignment) {
      assignment.status = 'REVOKED';
      assignment.can_decrypt = false;
    }
  }

  public shareAsset(params: {
    assetId: string;
    fromUserId: string;
    toUserId: string;
    permissions: {
      canRead: boolean;
      canDecrypt: boolean;
      canDownload: boolean;
      canEdit: boolean;
      canShare: boolean;
      canTransfer: boolean;
      canDelete: boolean;
    };
    expiresAt?: string | null;
  }): void {
    const asset = this.assets.get(params.assetId);
    if (!asset) throw new Error('Asset not found');

    const fromUser = this.getUserById(params.fromUserId);
    const toUser = this.getUserById(params.toUserId);
    if (!toUser) throw new Error('Recipient user not found');

    this.setAssignment(
      params.assetId,
      params.toUserId,
      params.permissions.canRead,
      params.permissions.canDecrypt,
      params.permissions.canDownload,
      params.permissions.canEdit,
      params.permissions.canShare,
      params.permissions.canTransfer,
      params.permissions.canDelete,
      params.expiresAt
    );

    this.logAssetAccess(
      params.assetId,
      fromUser?.name || 'Authorized User',
      `Shared with ${toUser.name} (${params.permissions.canDecrypt ? 'READ+DECRYPT' : 'READ-ONLY'})`,
      'SUCCESS'
    );

    this.recordAuditEvent({
      eventType: 'ASSET_ACCESS_GRANTED',
      description: `Controlled access granted for ${asset.name} to ${toUser.name} (Expires: ${params.expiresAt || 'Never'})`,
      targetId: asset.id,
      userEmail: fromUser?.email,
      userName: fromUser?.name,
      severity: 'INFO',
    });

    this.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      type: 'ASSET_SHARED',
      title: 'Asset Shared',
      message: `${asset.name} was shared with ${toUser.name}`,
      timestamp: 'Just now',
      read: false,
      target_id: asset.id,
    });
  }

  public createAsset(params: {
    name: string;
    folder: 'Projects' | 'Finance' | 'HR' | 'Engineering' | 'Legal';
    category: 'Documents' | 'Images' | 'Videos' | 'Spreadsheets' | 'PDFs' | 'ZIP archives' | 'Other files';
    classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
    description: string;
    content: string;
    uploaderUserId: string;
  }): StoredAsset {
    const user = this.getUserById(params.uploaderUserId);
    const nextNum = this.assets.size + 125;
    const assetId = 'ast_' + crypto.randomUUID().slice(0, 8);
    const assetCode = `SMX-AST-${String(nextNum).padStart(6, '0')}`;
    const tokenId = `#${1000 + nextNum}`;
    const did = `did:assetchain:sep:ast-${String(nextNum).padStart(6, '0')}`;

    // AES-256-GCM authenticated payload encapsulation
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(`${assetCode}:${params.classification}`));
    let ciphertext = cipher.update(params.content, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    const extMatch = params.name.match(/\.([0-9a-z]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';

    const now = new Date().toISOString();
    const newAsset: StoredAsset = {
      id: assetId,
      asset_code: assetCode,
      name: params.name,
      classification: params.classification,
      status: 'ACTIVE',
      description: params.description,
      encrypted_content: Buffer.from(params.content).toString('base64'),
      iv: iv.toString('base64'),
      auth_tag: authTag,
      aad: `${assetCode}:${params.classification}`,
      folder: params.folder,
      category: params.category,
      file_size: `${(Buffer.byteLength(params.content, 'utf8') / 1024).toFixed(1)} KB`,
      file_extension: ext,
      owner_name: user?.name || 'Organization',
      owner_address: '0x' + crypto.randomBytes(20).toString('hex'),
      did,
      token_id: tokenId,
      encryption_algorithm: 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      key_version: 'v1',
      created_at: now,
      last_accessed_at: now,
      versions: [
        {
          version: 'v1',
          uploaded_by: user?.name || 'Authorized User',
          timestamp: now,
          key_version: 'v1',
          note: 'Initial encrypted upload & on-chain registration',
        }
      ],
      access_history: [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user_name: user?.name || 'Authorized User',
          action: 'Uploaded & Encrypted (AES-256-GCM)',
          status: 'SUCCESS',
        }
      ],
    };

    this.assets.set(newAsset.id, newAsset);

    // Grant creator and Admin active permissions
    if (params.uploaderUserId) {
      this.setAssignment(newAsset.id, params.uploaderUserId, true, true, true, true, true, true, true);
    }
    this.setAssignment(newAsset.id, 'usr_admin_001', true, true, true, true, true, true, true);

    this.recordAuditEvent({
      eventType: 'ASSET_REGISTERED',
      description: `New asset encrypted and registered: ${newAsset.name} (${newAsset.asset_code})`,
      targetId: newAsset.id,
      userEmail: user?.email,
      userName: user?.name,
      severity: 'INFO',
    });

    this.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      type: 'SECURITY_ALERT',
      title: 'Asset Registered',
      message: `${newAsset.name} registered on Sepolia (Token ${newAsset.token_id})`,
      timestamp: 'Just now',
      read: false,
      target_id: newAsset.id,
    });

    return newAsset;
  }

  public createNewAssetVersion(params: {
    assetId: string;
    userId: string;
    newContent: string;
    note: string;
  }): StoredAsset {
    const asset = this.assets.get(params.assetId);
    if (!asset) throw new Error('Asset not found');
    const user = this.getUserById(params.userId);

    const nextVerNum = (asset.versions?.length || 1) + 1;
    const verTag = `v${nextVerNum}`;
    const now = new Date().toISOString();

    asset.encrypted_content = Buffer.from(params.newContent).toString('base64');
    asset.key_version = verTag;
    asset.last_accessed_at = now;
    asset.versions.unshift({
      version: verTag,
      uploaded_by: user?.name || 'Authorized Engineer',
      timestamp: now,
      key_version: verTag,
      note: params.note || 'Encrypted version revision',
    });

    this.logAssetAccess(
      asset.id,
      user?.name || 'Authorized User',
      `Uploaded New Version ${verTag} (${params.note || 'Revision'})`,
      'SUCCESS'
    );

    this.recordAuditEvent({
      eventType: 'KEY_ROTATED',
      description: `New version ${verTag} uploaded for ${asset.name}. Encryption key rotated.`,
      targetId: asset.id,
      userEmail: user?.email,
      userName: user?.name,
      severity: 'INFO',
    });

    this.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      type: 'KEY_ROTATED',
      title: 'Version & Key Rotated',
      message: `${asset.name} updated to ${verTag}. New AES-256-GCM key derived.`,
      timestamp: 'Just now',
      read: false,
      target_id: asset.id,
    });

    return asset;
  }

  public renameAsset(assetId: string, newName: string, userId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');
    const user = this.getUserById(userId);
    const oldName = asset.name;
    asset.name = newName;

    this.logAssetAccess(assetId, user?.name || 'User', `Renamed asset from "${oldName}" to "${newName}"`, 'SUCCESS');
  }

  public moveAsset(assetId: string, targetFolder: any, userId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');
    const user = this.getUserById(userId);
    const oldFolder = asset.folder;
    asset.folder = targetFolder;

    this.logAssetAccess(assetId, user?.name || 'User', `Moved asset from ${oldFolder} to ${targetFolder}`, 'SUCCESS');
  }

  public archiveAsset(assetId: string, userId: string, archive = true): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');
    const user = this.getUserById(userId);
    asset.is_archived = archive;

    this.logAssetAccess(assetId, user?.name || 'User', archive ? 'Archived asset' : 'Restored asset from archive', 'SUCCESS');
  }

  public deleteAsset(assetId: string, userId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');
    const user = this.getUserById(userId);

    this.assets.delete(assetId);
    this.assignments = this.assignments.filter(a => a.asset_id !== assetId);

    this.recordAuditEvent({
      eventType: 'ROLE_REVOKED',
      description: `Asset deleted: ${asset.name} (${asset.asset_code}) by ${user?.name || 'Admin'}`,
      targetId: assetId,
      userEmail: user?.email,
      userName: user?.name,
      severity: 'WARNING',
    });
  }

  public logAssetAccess(assetId: string, userName: string, action: string, status: 'SUCCESS' | 'DENIED' | 'PENDING'): void {
    const asset = this.assets.get(assetId);
    if (asset) {
      if (!asset.access_history) asset.access_history = [];
      asset.access_history.unshift({
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user_name: userName,
        action,
        status,
      });
      asset.last_accessed_at = new Date().toISOString();
    }
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): StoredNotification[] {
    return this.notifications;
  }

  public markNotificationRead(id: string): void {
    const n = this.notifications.find(item => item.id === id);
    if (n) n.read = true;
  }

  // --- PERMANENT AUDIT TRAIL (Canonical 4-Layer SHA-256 Hash Chain) ---
  public recordAuditEvent(params: {
    eventType: string;
    description: string;
    targetId?: string;
    userEmail?: string;
    userName?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    layer?: AuditLayer;
    action?: string;
    result?: AuditResult;
    resourceType?: 'ASSET' | 'IDENTITY' | 'ROLE' | 'DEVICE' | 'POLICY' | 'KMS_KEY' | 'SESSION';
  }): StoredAuditEvent {
    const user = params.userEmail ? this.getUserByEmail(params.userEmail) : null;
    const userId = user?.id || 'usr_sys_operator';
    const did = user?.did || 'did:securemax:system';
    const role = user?.role || UserRole.USER;

    const layer: AuditLayer = params.layer || (
      params.eventType.includes('SEPOLIA') || params.eventType.includes('NFT') || params.eventType.includes('IDENTITY') || params.eventType.includes('ROLE')
        ? 'Blockchain'
        : params.eventType.includes('KEY') || params.eventType.includes('KMS') || params.eventType.includes('DECRYPT')
        ? 'KMS'
        : params.severity === 'CRITICAL' || params.eventType.includes('ALERT') || params.eventType.includes('DENIED')
        ? 'Security'
        : 'Application'
    );

    const result: AuditResult = params.result || (
      params.severity === 'CRITICAL' ? 'FAILED' : params.severity === 'WARNING' ? 'DENIED' : 'ALLOWED'
    );

    const event = auditService.record({
      eventType: params.eventType,
      layer,
      actor: {
        userId,
        did,
        role,
        userName: params.userName || user?.name || 'System Actor',
        userEmail: params.userEmail || user?.email || 'system@securemax.mil',
      },
      resource: {
        resourceType: params.resourceType || (params.targetId?.startsWith('ast_') ? 'ASSET' : params.targetId?.startsWith('dev_') ? 'DEVICE' : 'POLICY'),
        resourceId: params.targetId || 'SMX-SYS-RES',
        assetName: params.targetId ? this.assets.get(params.targetId)?.name : undefined,
      },
      action: {
        operation: params.action || params.eventType,
      },
      authorization: {
        result,
        reasonCode: params.severity === 'CRITICAL' ? 'SECURITY_POLICY_VIOLATION' : 'AUTHORIZATION_ACTIVE',
      },
      description: params.description,
    });

    this.auditEvents = auditService.getEvents();
    return event;
  }

  public getAuditEvents(): StoredAuditEvent[] {
    this.auditEvents = auditService.getEvents();
    return this.auditEvents;
  }

  // --- ACCESS REQUESTS (HIGH-RISK DATA & AUDITOR UPDATES) ---
  public createAccessRequest(params: {
    userId: string;
    requestType: 'HIGH_RISK_DATA' | 'AUDIT_UPDATE' | 'ASSET_ACCESS';
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

    if (params.assetId) {
      this.logAssetAccess(params.assetId, user.name, `Submitted access request (${params.reason})`, 'PENDING');
    }

    this.recordAuditEvent({
      eventType: 'ACCESS_REQUEST_SUBMITTED',
      description: `${user.name} requested clearance for ${assetName} (Pending Admin NFT Permit)`,
      targetId: params.assetId || 'AUDIT_LEDGER',
      userEmail: user.email,
      userName: user.name,
      severity: 'WARNING',
    });

    this.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      type: 'ACCESS_REQUEST',
      title: 'New Access Request',
      message: `${user.name} requested clearance for ${assetName}`,
      timestamp: 'Just now',
      read: false,
      target_id: params.assetId,
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
      this.setAssignment(req.asset_id, req.user_id, true, true, true, false, true, false, false);
      this.logAssetAccess(req.asset_id, req.user_name, `Admin approved access permit (${req.nft_token_id})`, 'SUCCESS');
    }

    this.recordAuditEvent({
      eventType: 'NFT_ACCESS_PERMIT_MINTED',
      description: `Admin approved access for ${req.user_name}. NFT Permit: ${req.nft_token_id}`,
      targetId: req.asset_id || req.nft_token_id,
      userEmail: req.user_email,
      userName: req.user_name,
      severity: 'INFO',
    });

    this.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      type: 'ACCESS_APPROVED',
      title: 'Access Request Approved',
      message: `Access granted for ${req.asset_name}. On-chain permit ${req.nft_token_id} minted.`,
      timestamp: 'Just now',
      read: false,
      target_id: req.asset_id,
    });

    return req;
  }

  public rejectAccessRequest(requestId: string, adminUserId: string, reason?: string): StoredAccessRequest {
    const admin = this.getUserById(adminUserId);
    if (admin?.role !== UserRole.ADMIN) {
      throw new Error('Only Administrator can reject access requests');
    }

    const req = this.accessRequests.find(r => r.id === requestId);
    if (!req) throw new Error('Access request not found');

    req.status = 'REJECTED';
    req.rejected_at = new Date().toISOString();

    if (req.asset_id) {
      this.logAssetAccess(req.asset_id, req.user_name, `Access request denied: ${reason || 'Security policy restriction'}`, 'DENIED');
    }

    this.recordAuditEvent({
      eventType: 'ACCESS_REQUEST_REJECTED',
      description: `Admin rejected clearance for ${req.user_name} on ${req.asset_name}`,
      targetId: req.asset_id || requestId,
      userEmail: req.user_email,
      userName: req.user_name,
      severity: 'WARNING',
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
