import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("IdentityRegistry (Person 2 - DID & Decentralized Identity)", function () {
  let identityRegistry: IdentityRegistry;
  let admin: HardhatEthersSigner;
  let registrar: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let unauthorizedUser: HardhatEthersSigner;

  // Test Fixtures & Constants
  const VALID_DID_1 = "did:assetchain:usr-1001-alice-7f8a9b";
  const VALID_DID_2 = "did:assetchain:usr-1002-bob-3c4d5e";
  const INVALID_DID_NO_PREFIX = "did:otherchain:usr-1001-alice";
  const INVALID_DID_EMPTY = "";
  
  // Example Cryptographic Public Keys (e.g. 65-byte uncompressed secp256k1 or Ed25519)
  const SAMPLE_PUBLIC_KEY_1 = ethers.toUtf8Bytes("0x04bfcad84f346b8d91024bc68840c4");
  const SAMPLE_PUBLIC_KEY_2 = ethers.toUtf8Bytes("0x04789abcefe123456789abcdef0123");
  const ROTATED_PUBLIC_KEY_1 = ethers.toUtf8Bytes("0x04112233445566778899aabbccddeeff");
  const EMPTY_KEY = new Uint8Array(0);

  // Status Enum
  enum IdentityStatus {
    None = 0,
    Active = 1,
    Suspended = 2,
    Revoked = 3,
  }

  beforeEach(async function () {
    [admin, registrar, user1, user2, unauthorizedUser] = await ethers.getSigners();

    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistryFactory.deploy(admin.address);
    await identityRegistry.waitForDeployment();

    // Grant REGISTRAR_ROLE to the registrar account
    const REGISTRAR_ROLE = await identityRegistry.REGISTRAR_ROLE();
    await identityRegistry.connect(admin).grantRole(REGISTRAR_ROLE, registrar.address);
  });

  // =========================================================================
  // 1. DEPLOYMENT & INITIAL STATE
  // =========================================================================
  describe("Deployment & Role Setup", function () {
    it("should correctly set admin and registrar roles", async function () {
      const DEFAULT_ADMIN_ROLE = await identityRegistry.DEFAULT_ADMIN_ROLE();
      const REGISTRAR_ROLE = await identityRegistry.REGISTRAR_ROLE();

      expect(await identityRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await identityRegistry.hasRole(REGISTRAR_ROLE, admin.address)).to.be.true;
      expect(await identityRegistry.hasRole(REGISTRAR_ROLE, registrar.address)).to.be.true;
      expect(await identityRegistry.hasRole(REGISTRAR_ROLE, unauthorizedUser.address)).to.be.false;
    });

    it("should revert if initialized with zero address admin", async function () {
      const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
      await expect(
        IdentityRegistryFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidControllerAddress");
    });

    it("should start with 0 total identities", async function () {
      expect(await identityRegistry.totalIdentitiesCount()).to.equal(0);
    });
  });

  // =========================================================================
  // 2. IDENTITY REGISTRATION (HAPPY PATH)
  // =========================================================================
  describe("Identity Registration", function () {
    it("should successfully register a new DID identity by registrar", async function () {
      const tx = await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);

      // Verify event emission
      await expect(tx)
        .to.emit(identityRegistry, "IdentityRegistered")
        .withArgs(
          VALID_DID_1,
          VALID_DID_1,
          user1.address,
          ethers.hexlify(SAMPLE_PUBLIC_KEY_1),
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await identityRegistry.totalIdentitiesCount()).to.equal(1);
      expect(await identityRegistry["isIdentityRegistered(string)"](VALID_DID_1)).to.be.true;
      expect(await identityRegistry["isIdentityActive(string)"](VALID_DID_1)).to.be.true;
    });

    it("should correctly record all identity fields", async function () {
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);

      const record = await identityRegistry.getIdentity(VALID_DID_1);
      expect(record.did).to.equal(VALID_DID_1);
      expect(record.publicKey).to.equal(ethers.hexlify(SAMPLE_PUBLIC_KEY_1));
      expect(record.controller).to.equal(user1.address);
      expect(record.status).to.equal(IdentityStatus.Active);
      expect(record.registeredAt).to.be.gt(0);
      expect(record.updatedAt).to.equal(record.registeredAt);

      // Verify reverse lookup
      expect(await identityRegistry.getDidByController(user1.address)).to.equal(VALID_DID_1);
      expect(await identityRegistry.getPublicKey(VALID_DID_1)).to.equal(ethers.hexlify(SAMPLE_PUBLIC_KEY_1));
      expect(await identityRegistry.getIdentityStatus(VALID_DID_1)).to.equal(IdentityStatus.Active);
    });

    it("should allow registering multiple distinct identities", async function () {
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_2, SAMPLE_PUBLIC_KEY_2, user2.address);

      expect(await identityRegistry.totalIdentitiesCount()).to.equal(2);
      expect(await identityRegistry["isIdentityRegistered(string)"](VALID_DID_1)).to.be.true;
      expect(await identityRegistry["isIdentityRegistered(string)"](VALID_DID_2)).to.be.true;
    });
  });

  // =========================================================================
  // 3. SECURITY & NEGATIVE TESTS: REGISTRATION
  // =========================================================================
  describe("Registration Security & Validation", function () {
    it("should reject registration by unauthorized caller", async function () {
      await expect(
        identityRegistry
          .connect(unauthorizedUser)
          .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "AccessControlUnauthorizedAccount");
    });

    it("should reject duplicate registration of the same DID", async function () {
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);

      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_2, user2.address)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityAlreadyExists")
        .withArgs(VALID_DID_1);
    });

    it("should reject binding the same controller address to multiple DIDs", async function () {
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);

      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(VALID_DID_2, SAMPLE_PUBLIC_KEY_2, user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "ControllerAlreadyBound")
        .withArgs(user1.address, VALID_DID_1);
    });

    it("should reject invalid DID format (missing prefix)", async function () {
      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(INVALID_DID_NO_PREFIX, SAMPLE_PUBLIC_KEY_1, user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidDID")
        .withArgs("DID must start with did:assetchain:");
    });

    it("should reject invalid DID format (empty string)", async function () {
      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(INVALID_DID_EMPTY, SAMPLE_PUBLIC_KEY_1, user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidDID")
        .withArgs("Invalid DID length");
    });

    it("should reject empty public key", async function () {
      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(VALID_DID_1, EMPTY_KEY, user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidPublicKey");
    });

    it("should reject zero address controller", async function () {
      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidControllerAddress");
    });
  });

  // =========================================================================
  // 4. RETRIEVAL & QUERIES
  // =========================================================================
  describe("Identity Retrieval & View Functions", function () {
    it("should revert getIdentity for non-existent DID", async function () {
      await expect(
        identityRegistry.getIdentity("did:assetchain:non-existent")
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityNotFound")
        .withArgs("did:assetchain:non-existent");
    });

    it("should revert getPublicKey for non-existent DID", async function () {
      await expect(
        identityRegistry.getPublicKey("did:assetchain:non-existent")
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityNotFound")
        .withArgs("did:assetchain:non-existent");
    });

    it("should revert getDidByController for unbound address", async function () {
      await expect(
        identityRegistry.getDidByController(unauthorizedUser.address)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityNotFound");
    });

    it("should return false for isIdentityRegistered and isIdentityActive on unregistered DID", async function () {
      expect(await identityRegistry["isIdentityRegistered(string)"]("did:assetchain:unregistered")).to.be.false;
      expect(await identityRegistry["isIdentityActive(string)"]("did:assetchain:unregistered")).to.be.false;
      expect(await identityRegistry.getIdentityStatus("did:assetchain:unregistered")).to.equal(IdentityStatus.None);
    });
  });

  // =========================================================================
  // 5. STATUS LIFECYCLE MANAGEMENT & ACCESS CONTROL
  // =========================================================================
  describe("Status Lifecycle & Authorization", function () {
    beforeEach(async function () {
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);
    });

    it("should allow registrar to suspend an active identity", async function () {
      const tx = await identityRegistry
        .connect(registrar)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Suspended);

      await expect(tx)
        .to.emit(identityRegistry, "IdentityStatusUpdated")
        .withArgs(
          VALID_DID_1,
          VALID_DID_1,
          IdentityStatus.Active,
          IdentityStatus.Suspended,
          registrar.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await identityRegistry["isIdentityRegistered(string)"](VALID_DID_1)).to.be.true;
      expect(await identityRegistry["isIdentityActive(string)"](VALID_DID_1)).to.be.false;
      expect(await identityRegistry.getIdentityStatus(VALID_DID_1)).to.equal(IdentityStatus.Suspended);
    });

    it("should allow registrar to reactivate a suspended identity", async function () {
      await identityRegistry
        .connect(registrar)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Suspended);

      await identityRegistry
        .connect(registrar)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Active);

      expect(await identityRegistry["isIdentityActive(string)"](VALID_DID_1)).to.be.true;
      expect(await identityRegistry.getIdentityStatus(VALID_DID_1)).to.equal(IdentityStatus.Active);
    });

    it("should allow user controller to self-suspend or self-revoke identity", async function () {
      // User self-suspends
      await identityRegistry
        .connect(user1)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Suspended);
      expect(await identityRegistry.getIdentityStatus(VALID_DID_1)).to.equal(IdentityStatus.Suspended);

      // User self-revokes
      await identityRegistry
        .connect(user1)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Revoked);
      expect(await identityRegistry.getIdentityStatus(VALID_DID_1)).to.equal(IdentityStatus.Revoked);
    });

    it("should prevent user controller from self-reactivating without registrar/admin", async function () {
      await identityRegistry
        .connect(registrar)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Suspended);

      await expect(
        identityRegistry
          .connect(user1)
          .updateIdentityStatus(VALID_DID_1, IdentityStatus.Active)
      ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedCaller")
        .withArgs(user1.address);
    });

    it("should permanently lock revoked identity (terminal state)", async function () {
      await identityRegistry
        .connect(registrar)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Revoked);

      // Attempting to reactivate or suspend a revoked identity must revert
      await expect(
        identityRegistry
          .connect(registrar)
          .updateIdentityStatus(VALID_DID_1, IdentityStatus.Active)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityIsRevoked")
        .withArgs(VALID_DID_1);

      await expect(
        identityRegistry
          .connect(registrar)
          .updateIdentityStatus(VALID_DID_1, IdentityStatus.Suspended)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityIsRevoked")
        .withArgs(VALID_DID_1);
    });

    it("should reject transition to None or to current status", async function () {
      await expect(
        identityRegistry
          .connect(registrar)
          .updateIdentityStatus(VALID_DID_1, IdentityStatus.None)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidStatusTransition")
        .withArgs(IdentityStatus.Active, IdentityStatus.None);

      await expect(
        identityRegistry
          .connect(registrar)
          .updateIdentityStatus(VALID_DID_1, IdentityStatus.Active)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidStatusTransition")
        .withArgs(IdentityStatus.Active, IdentityStatus.Active);
    });

    it("should reject status update by unauthorized caller", async function () {
      await expect(
        identityRegistry
          .connect(unauthorizedUser)
          .updateIdentityStatus(VALID_DID_1, IdentityStatus.Suspended)
      ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedCaller")
        .withArgs(unauthorizedUser.address);
    });
  });

  // =========================================================================
  // 6. PUBLIC KEY ROTATION & MANAGEMENT
  // =========================================================================
  describe("Public Key Rotation", function () {
    beforeEach(async function () {
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);
    });

    it("should allow identity controller to rotate public key", async function () {
      const tx = await identityRegistry
        .connect(user1)
        .updatePublicKey(VALID_DID_1, ROTATED_PUBLIC_KEY_1);

      await expect(tx)
        .to.emit(identityRegistry, "PublicKeyUpdated")
        .withArgs(
          VALID_DID_1,
          VALID_DID_1,
          ethers.hexlify(SAMPLE_PUBLIC_KEY_1),
          ethers.hexlify(ROTATED_PUBLIC_KEY_1),
          user1.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await identityRegistry.getPublicKey(VALID_DID_1)).to.equal(
        ethers.hexlify(ROTATED_PUBLIC_KEY_1)
      );
    });

    it("should allow registrar to update public key", async function () {
      await identityRegistry
        .connect(registrar)
        .updatePublicKey(VALID_DID_1, ROTATED_PUBLIC_KEY_1);

      expect(await identityRegistry.getPublicKey(VALID_DID_1)).to.equal(
        ethers.hexlify(ROTATED_PUBLIC_KEY_1)
      );
    });

    it("should reject public key update by unauthorized user", async function () {
      await expect(
        identityRegistry
          .connect(unauthorizedUser)
          .updatePublicKey(VALID_DID_1, ROTATED_PUBLIC_KEY_1)
      ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedCaller")
        .withArgs(unauthorizedUser.address);
    });

    it("should reject public key update if identity is Suspended", async function () {
      await identityRegistry
        .connect(registrar)
        .updateIdentityStatus(VALID_DID_1, IdentityStatus.Suspended);

      await expect(
        identityRegistry
          .connect(user1)
          .updatePublicKey(VALID_DID_1, ROTATED_PUBLIC_KEY_1)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityNotActive")
        .withArgs(VALID_DID_1);
    });

    it("should reject public key update with empty bytes", async function () {
      await expect(
        identityRegistry
          .connect(user1)
          .updatePublicKey(VALID_DID_1, EMPTY_KEY)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidPublicKey");
    });
  });

  // =========================================================================
  // 7. CONTROLLER ROTATION / WALLET MIGRATION
  // =========================================================================
  describe("Controller Address Rotation", function () {
    beforeEach(async function () {
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address);
    });

    it("should allow current controller to transfer control to a new address", async function () {
      const tx = await identityRegistry
        .connect(user1)
        .updateController(VALID_DID_1, user2.address);

      await expect(tx)
        .to.emit(identityRegistry, "ControllerUpdated")
        .withArgs(
          VALID_DID_1,
          VALID_DID_1,
          user1.address,
          user2.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      const record = await identityRegistry.getIdentity(VALID_DID_1);
      expect(record.controller).to.equal(user2.address);

      // Verify reverse lookups
      expect(await identityRegistry.getDidByController(user2.address)).to.equal(VALID_DID_1);
      await expect(
        identityRegistry.getDidByController(user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityNotFound");
    });

    it("should reject controller update to zero address", async function () {
      await expect(
        identityRegistry
          .connect(user1)
          .updateController(VALID_DID_1, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidControllerAddress");
    });

    it("should reject controller update to an address already bound to another DID", async function () {
      // Register user2 with DID 2
      await identityRegistry
        .connect(registrar)
        .registerIdentity(VALID_DID_2, SAMPLE_PUBLIC_KEY_2, user2.address);

      // Attempt to move DID 1 to user2
      await expect(
        identityRegistry
          .connect(user1)
          .updateController(VALID_DID_1, user2.address)
      ).to.be.revertedWithCustomError(identityRegistry, "ControllerAlreadyBound")
        .withArgs(user2.address, VALID_DID_2);
    });

    it("should reject controller update by unauthorized caller", async function () {
      await expect(
        identityRegistry
          .connect(unauthorizedUser)
          .updateController(VALID_DID_1, unauthorizedUser.address)
      ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedCaller")
        .withArgs(unauthorizedUser.address);
    });
  });

  // =========================================================================
  // 8. EMERGENCY PAUSE MECHANISM
  // =========================================================================
  describe("Emergency Pause Controls", function () {
    it("should allow admin to pause and block state modifications", async function () {
      await identityRegistry.connect(admin).pause();

      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "EnforcedPause");
    });

    it("should allow admin to unpause and resume operations", async function () {
      await identityRegistry.connect(admin).pause();
      await identityRegistry.connect(admin).unpause();

      await expect(
        identityRegistry
          .connect(registrar)
          .registerIdentity(VALID_DID_1, SAMPLE_PUBLIC_KEY_1, user1.address)
      ).to.not.be.reverted;
    });

    it("should reject non-admin calling pause/unpause", async function () {
      await expect(
        identityRegistry.connect(unauthorizedUser).pause()
      ).to.be.revertedWithCustomError(identityRegistry, "AccessControlUnauthorizedAccount");
    });
  });
});
