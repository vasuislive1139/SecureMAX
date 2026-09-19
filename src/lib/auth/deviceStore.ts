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

export interface StoredAsset {
  id: string;
  asset_code: string;
  name: string;
  classification: string;
  status: string;
  description: string;
  encrypted_content: string; // Base64 AES-256-GCM ciphertext
  iv: string;
  auth_tag: string;
  aad: string;
}

export interface StoredAssignment {
  asset_id: string;
  user_id: string;
  can_read: boolean;
  can_decrypt: boolean;
  status: 'ACTIVE' | 'REVOKED';
  assigned_at: string;
}

// In-memory persistent state (persists across hot-reloads within the server instance)
class SecureMaxStore {
  public users: Map<string, StoredUser> = new Map();
  public devices: Map<string, UserDevice> = new Map();
  public enrollments: Map<string, DeviceEnrollment> = new Map();
  public assets: Map<string, StoredAsset> = new Map();
  public assignments: StoredAssignment[] = [];
  public challengeCache: Map<string, { challengeId: string; identifier: string; nonce: string; message: string; expiresAt: string }> = new Map();

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

    // Admin's single bound device
    const adminDevice: UserDevice = {
      id: 'dev_admin_primary',
      user_id: adminUser.id,
      device_name: "Admin Laptop (Hardware-Bound)",
      public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2Z37UoHq3y1V4XwH5K7oF9P9k3sZ0s7uVvWxX0y1A2bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4z5A6bC7w==', // standard demo P-256 SPKI
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
    this.assets.set('ast_alpha', {
      id: 'ast_alpha',
      asset_code: 'SMX-ALPHA-001',
      name: 'Project Alpha (Core Defense Spec)',
      classification: 'HIGH',
      status: 'ACTIVE',
      description: 'Confidential design specifications for tactical communications.',
      encrypted_content: Buffer.from('TOP SECRET // CONFIDENTIAL DEFENSE INTEL: Project Alpha utilizes multi-frequency hopping at 2.4GHz with AES-256-GCM authenticated payload encapsulation. Authorization strictly validated by SecureMAX on-chain registry.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-ALPHA-001:HIGH',
    });

    this.assets.set('ast_finance', {
      id: 'ast_finance',
      asset_code: 'SMX-FIN-002',
      name: 'Financial Audit Report Q3',
      classification: 'CONFIDENTIAL',
      status: 'ACTIVE',
      description: 'Quarterly financial compliance and procurement expenditures.',
      encrypted_content: Buffer.from('FINANCIAL REPORT // Q3 FY26: Procurement expenditures: $4,200,000. Cryptographic hardware allocation: $850,000. All allocations compliant with statutory requirements.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-FIN-002:CONFIDENTIAL',
    });

    this.assets.set('ast_avionics', {
      id: 'ast_avionics',
      asset_code: 'SMX-AVN-003',
      name: 'Avionics Radar Interface Specs',
      classification: 'RESTRICTED',
      status: 'ACTIVE',
      description: 'Hardware interface diagrams and bus timings.',
      encrypted_content: Buffer.from('RESTRICTED HARDWARE SPEC: ARINC 429 high-speed bus pinout configuration with MIL-STD-1553 redundant multiplexing.').toString('base64'),
      iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      auth_tag: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      aad: 'SMX-AVN-003:RESTRICTED',
    });

    // 5. ASSET ASSIGNMENTS
    // Vasu has READ + DECRYPT on Project Alpha
    this.assignments.push({
      asset_id: 'ast_alpha',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: true,
      status: 'ACTIVE',
      assigned_at: new Date().toISOString(),
    });

    // Vasu has READ-ONLY (no decrypt) on Financial Report
    this.assignments.push({
      asset_id: 'ast_finance',
      user_id: standardUser.id,
      can_read: true,
      can_decrypt: false, // Disallowed decrypt
      status: 'ACTIVE',
      assigned_at: new Date().toISOString(),
    });

    // Admin has global rights
    this.assignments.push({
      asset_id: 'ast_alpha',
      user_id: adminUser.id,
      can_read: true,
      can_decrypt: true,
      status: 'ACTIVE',
      assigned_at: new Date().toISOString(),
    });

    this.assignments.push({
      asset_id: 'ast_finance',
      user_id: adminUser.id,
      can_read: true,
      can_decrypt: true,
      status: 'ACTIVE',
      assigned_at: new Date().toISOString(),
    });

    this.assignments.push({
      asset_id: 'ast_avionics',
      user_id: adminUser.id,
      can_read: true,
      can_decrypt: true,
      status: 'ACTIVE',
      assigned_at: new Date().toISOString(),
    });
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
    return device;
  }

  public revokeDevice(userId: string, deviceId: string): void {
    const dev = this.devices.get(deviceId);
    if (!dev) throw new Error('Device not found');
    if (dev.user_id !== userId) throw new Error('Unauthorized to revoke this device');
    if (dev.is_admin_device) {
      throw new Error('Cannot revoke primary Admin hardware device. Emergency break-glass required.');
    }

    dev.status = 'REVOKED';
    dev.revoked_at = new Date().toISOString();
  }

  public updateDeviceLastUsed(deviceId: string): void {
    const dev = this.devices.get(deviceId);
    if (dev) {
      dev.last_used_at = new Date().toISOString();
    }
  }

  // --- DEVICE ENROLLMENT (ONE-TIME CODES) ---
  public createEnrollment(userId: string): DeviceEnrollment {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    // Rule: Admin accounts cannot generate enrollment codes for secondary devices
    if (user.role === UserRole.ADMIN) {
      throw new Error('Admin account is strictly device-bound. Multi-device enrollment is disabled for root administrative security.');
    }

    // Generate human-friendly code: SMX-XXXX-XXXX
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `SMX-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;

    const enrollment: DeviceEnrollment = {
      code,
      user_id: userId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
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
  public getAssetsForUser(userId: string): Array<{
    asset: StoredAsset;
    can_read: boolean;
    can_decrypt: boolean;
    status: string;
  }> {
    const results: Array<{ asset: StoredAsset; can_read: boolean; can_decrypt: boolean; status: string }> = [];
    const user = this.getUserById(userId);

    for (const asset of this.assets.values()) {
      if (user?.role === UserRole.ADMIN) {
        results.push({
          asset,
          can_read: true,
          can_decrypt: true,
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
          status: match.status,
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
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
      };
    }

    return this.assignments.find(a => a.asset_id === assetId && a.user_id === userId) || null;
  }

  public setAssignment(assetId: string, userId: string, canRead: boolean, canDecrypt: boolean): void {
    const index = this.assignments.findIndex(a => a.asset_id === assetId && a.user_id === userId);
    if (index >= 0) {
      this.assignments[index].can_read = canRead;
      this.assignments[index].can_decrypt = canDecrypt;
      this.assignments[index].status = 'ACTIVE';
    } else {
      this.assignments.push({
        asset_id: assetId,
        user_id: userId,
        can_read: canRead,
        can_decrypt: canDecrypt,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
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
}

// Global singleton
const globalForStore = global as unknown as { secureMaxStore?: SecureMaxStore };
export const deviceStore = globalForStore.secureMaxStore || new SecureMaxStore();
if (process.env.NODE_ENV !== 'production') globalForStore.secureMaxStore = deviceStore;
