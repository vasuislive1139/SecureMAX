export interface OffChainKYCRecord {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  documentType: string;
  documentNumber: string;
  kycStatus: "Pending" | "Verified" | "Rejected";
  createdAt: number;
}

export interface UserAccount {
  userId: string;
  did: string;
  publicKey: string;
  controllerAddress: string;
  role: "ADMIN" | "MANAGER" | "AUDITOR" | "USER";
  identityStatus: "Active" | "Suspended" | "Revoked";
  registeredAt: number;
}

export interface AuthChallengeRecord {
  challengeId: string;
  did: string;
  controllerAddress: string;
  challengeText: string;
  expiresAt: number;
  used: boolean;
}

// Secure off-chain database
class Database {
  private kycRecords: Map<string, OffChainKYCRecord> = new Map();
  private users: Map<string, UserAccount> = new Map();
  private challenges: Map<string, AuthChallengeRecord> = new Map();

  constructor() {
    // Seed default administrative demo accounts
    this.saveUser({
      userId: "usr-admin01",
      did: "did:assetchain:usr-admin01",
      publicKey: "0x04bfcad84f346b8d91024bc68840c4",
      controllerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      role: "ADMIN",
      identityStatus: "Active",
      registeredAt: Date.now() - 86400000,
    });

    this.saveKYC({
      userId: "usr-admin01",
      fullName: "Platform Administrator",
      email: "admin@securemax.org",
      documentType: "ADMIN_CREDENTIAL",
      documentNumber: "ADM-998811",
      kycStatus: "Verified",
      createdAt: Date.now() - 86400000,
    });
  }

  saveKYC(record: OffChainKYCRecord) {
    this.kycRecords.set(record.userId, record);
  }

  getKYC(userId: string): OffChainKYCRecord | undefined {
    return this.kycRecords.get(userId);
  }

  saveUser(user: UserAccount) {
    this.users.set(user.did, user);
  }

  getUserByDid(did: string): UserAccount | undefined {
    return this.users.get(did);
  }

  saveChallenge(challenge: AuthChallengeRecord) {
    this.challenges.set(challenge.challengeId, challenge);
  }

  getChallenge(challengeId: string): AuthChallengeRecord | undefined {
    return this.challenges.get(challengeId);
  }

  markChallengeUsed(challengeId: string) {
    const ch = this.challenges.get(challengeId);
    if (ch) {
      ch.used = true;
    }
  }

  getAllUsers(): UserAccount[] {
    return Array.from(this.users.values());
  }
}

export const db = new Database();
