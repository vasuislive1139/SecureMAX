import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { AccessControlManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AccessControlManager (Person 3 - RBAC & Authorization)", function () {
  let rbacManager: AccessControlManager;
  let identityRegistry: any;
  let admin: HardhatEthersSigner;
  let admin2: HardhatEthersSigner;
  let manager: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let unauthorizedUser: HardhatEthersSigner;

  // Role Identifiers
  let ADMIN_ROLE: string;
  let MANAGER_ROLE: string;
  let AUDITOR_ROLE: string;
  let USER_ROLE: string;
  const INVALID_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SUPER_HACKER_ROLE"));

  beforeEach(async function () {
    [admin, admin2, manager, auditor, user1, unauthorizedUser] = await ethers.getSigners();

    const IdFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdFactory.deploy(admin.address);
    await identityRegistry.waitForDeployment();

    // Register all participants so they can receive roles
    const participants = [admin, admin2, manager, auditor, user1, unauthorizedUser];
    for (let i = 0; i < participants.length; i++) {
        await identityRegistry.connect(admin).registerIdentity(
            `did:assetchain:user${i}`,
            ethers.hexlify(ethers.randomBytes(32)),
            participants[i].address
        );
    }

    const Factory = await ethers.getContractFactory("AccessControlManager");
    rbacManager = await Factory.deploy(admin.address, await identityRegistry.getAddress());
    await rbacManager.waitForDeployment();

    ADMIN_ROLE = await rbacManager.ADMIN_ROLE();
    MANAGER_ROLE = await rbacManager.MANAGER_ROLE();
    AUDITOR_ROLE = await rbacManager.AUDITOR_ROLE();
    USER_ROLE = await rbacManager.USER_ROLE();
  });

  // =========================================================================
  // 1. DEPLOYMENT & INITIAL STATE
  // =========================================================================
  describe("Deployment & Initial Roles", function () {
    it("should grant initial deployer ADMIN_ROLE and DEFAULT_ADMIN_ROLE", async function () {
      expect(await rbacManager.isAdmin(admin.address)).to.be.true;
      expect(await rbacManager.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await rbacManager.isManager(admin.address)).to.be.false;
      expect(await rbacManager.isAuditor(admin.address)).to.be.false;
      expect(await rbacManager.isUser(admin.address)).to.be.false;
    });

    it("should revert if initialized with zero address admin", async function () {
      const Factory = await ethers.getContractFactory("AccessControlManager");
      await expect(
        Factory.deploy(ethers.ZeroAddress, await identityRegistry.getAddress())
      ).to.be.revertedWithCustomError(rbacManager, "InvalidAccountAddress");
    });
  });

  // =========================================================================
  // 2. AUTHORIZED ROLE ASSIGNMENT (HAPPY PATH)
  // =========================================================================
  describe("Authorized Role Assignment", function () {
    it("should allow Admin to assign MANAGER_ROLE", async function () {
      const tx = await rbacManager.connect(admin).assignRole(MANAGER_ROLE, manager.address);

      await expect(tx)
        .to.emit(rbacManager, "RoleAssignmentLogged")
        .withArgs(
          MANAGER_ROLE,
          manager.address,
          admin.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await rbacManager.isManager(manager.address)).to.be.true;
      expect(await rbacManager.hasRole(MANAGER_ROLE, manager.address)).to.be.true;
    });

    it("should allow Admin to assign AUDITOR_ROLE", async function () {
      await rbacManager.connect(admin).assignRole(AUDITOR_ROLE, auditor.address);
      expect(await rbacManager.isAuditor(auditor.address)).to.be.true;
    });

    it("should allow Admin to assign USER_ROLE", async function () {
      await rbacManager.connect(admin).assignRole(USER_ROLE, user1.address);
      expect(await rbacManager.isUser(user1.address)).to.be.true;
    });

    it("should allow Admin to assign another ADMIN_ROLE", async function () {
      await rbacManager.connect(admin).assignRole(ADMIN_ROLE, admin2.address);
      expect(await rbacManager.isAdmin(admin2.address)).to.be.true;
    });

    it("should correctly list user roles in getUserRoles", async function () {
      await rbacManager.connect(admin).assignRole(MANAGER_ROLE, manager.address);
      await rbacManager.connect(admin).assignRole(USER_ROLE, manager.address);

      const roles = await rbacManager.getUserRoles(manager.address);
      expect(roles.length).to.equal(2);
      expect(roles).to.include(MANAGER_ROLE);
      expect(roles).to.include(USER_ROLE);
    });
  });

  // =========================================================================
  // 3. SECURITY & NEGATIVE TESTS: ASSIGNMENT
  // =========================================================================
  describe("Identity Integration", function () {
    it("should reject role assignment to unregistered address", async function () {
      const [,,,,, , randomGuy] = await ethers.getSigners();
      await expect(
        rbacManager.connect(admin).assignRole(MANAGER_ROLE, randomGuy.address)
      ).to.be.revertedWithCustomError(rbacManager, "IdentityNotRegistered");
    });
    
    it("should reject role assignment to suspended identity", async function () {
      await identityRegistry.connect(admin).updateIdentityStatus("did:assetchain:user4", 2); // Suspended
      await expect(
        rbacManager.connect(admin).assignRole(MANAGER_ROLE, user1.address)
      ).to.be.revertedWithCustomError(rbacManager, "IdentityNotActive");
    });
  });

  describe("Role Assignment Security & Validations", function () {
    it("should reject role assignment by unauthorized User", async function () {
      await expect(
        rbacManager.connect(unauthorizedUser).assignRole(MANAGER_ROLE, user1.address)
      ).to.be.revertedWithCustomError(rbacManager, "UnauthorizedAdminAction")
        .withArgs(unauthorizedUser.address);
    });

    it("should reject Manager attempting to assign Admin privileges", async function () {
      await rbacManager.connect(admin).assignRole(MANAGER_ROLE, manager.address);

      await expect(
        rbacManager.connect(manager).assignRole(ADMIN_ROLE, manager.address)
      ).to.be.revertedWithCustomError(rbacManager, "UnauthorizedAdminAction")
        .withArgs(manager.address);
    });

    it("should reject assigning invalid / non-system role", async function () {
      await expect(
        rbacManager.connect(admin).assignRole(INVALID_ROLE, user1.address)
      ).to.be.revertedWithCustomError(rbacManager, "InvalidRoleIdentifier")
        .withArgs(INVALID_ROLE);
    });

    it("should reject assigning role to zero address", async function () {
      await expect(
        rbacManager.connect(admin).assignRole(USER_ROLE, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(rbacManager, "InvalidAccountAddress");
    });

    it("should reject duplicate role assignment", async function () {
      await rbacManager.connect(admin).assignRole(USER_ROLE, user1.address);

      await expect(
        rbacManager.connect(admin).assignRole(USER_ROLE, user1.address)
      ).to.be.revertedWithCustomError(rbacManager, "AccountAlreadyHasRole")
        .withArgs(USER_ROLE, user1.address);
    });
  });

  // =========================================================================
  // 4. ROLE REVOCATION & LOCKOUT PROTECTION
  // =========================================================================
  describe("Role Revocation & Admin Lockout Protection", function () {
    beforeEach(async function () {
      await rbacManager.connect(admin).assignRole(MANAGER_ROLE, manager.address);
    });

    it("should allow Admin to revoke an assigned role", async function () {
      const tx = await rbacManager.connect(admin).revokeRole(MANAGER_ROLE, manager.address);

      await expect(tx)
        .to.emit(rbacManager, "RoleRevocationLogged")
        .withArgs(
          MANAGER_ROLE,
          manager.address,
          admin.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await rbacManager.isManager(manager.address)).to.be.false;
    });

    it("should prevent revoking the last remaining Admin (Admin Lockout Protection)", async function () {
      await expect(
        rbacManager.connect(admin).revokeRole(ADMIN_ROLE, admin.address)
      ).to.be.revertedWithCustomError(rbacManager, "CannotRevokeLastAdmin");
    });

    it("should allow revoking an Admin when multiple Admins exist", async function () {
      await rbacManager.connect(admin).assignRole(ADMIN_ROLE, admin2.address);

      // Now revoking admin2 is safe
      await expect(
        rbacManager.connect(admin).revokeRole(ADMIN_ROLE, admin2.address)
      ).to.not.be.reverted;

      expect(await rbacManager.isAdmin(admin2.address)).to.be.false;
    });

    it("should reject revoking role from an account that does not possess it", async function () {
      await expect(
        rbacManager.connect(admin).revokeRole(AUDITOR_ROLE, user1.address)
      ).to.be.revertedWithCustomError(rbacManager, "AccountDoesNotHaveRole")
        .withArgs(AUDITOR_ROLE, user1.address);
    });

    it("should reject revocation by unauthorized caller", async function () {
      await expect(
        rbacManager.connect(unauthorizedUser).revokeRole(MANAGER_ROLE, manager.address)
      ).to.be.revertedWithCustomError(rbacManager, "UnauthorizedAdminAction")
        .withArgs(unauthorizedUser.address);
    });
  });

  // =========================================================================
  // 5. EMERGENCY PAUSE CONTROLS
  // =========================================================================
  describe("Emergency Pause Controls", function () {
    it("should allow Admin to pause and prevent role changes", async function () {
      await rbacManager.connect(admin).pause();

      await expect(
        rbacManager.connect(admin).assignRole(USER_ROLE, user1.address)
      ).to.be.revertedWithCustomError(rbacManager, "EnforcedPause");
    });

    it("should allow Admin to unpause and resume operations", async function () {
      await rbacManager.connect(admin).pause();
      await rbacManager.connect(admin).unpause();

      await expect(
        rbacManager.connect(admin).assignRole(USER_ROLE, user1.address)
      ).to.not.be.reverted;
    });

    it("should reject non-admin calling pause/unpause", async function () {
      await expect(
        rbacManager.connect(unauthorizedUser).pause()
      ).to.be.revertedWithCustomError(rbacManager, "UnauthorizedAdminAction");
    });
  });
});
