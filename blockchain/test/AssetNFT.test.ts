import { expect } from "chai";
import { ethers } from "hardhat";
import { AssetNFT, MockRBACRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AssetNFT (Person 4 - NFT + Asset Management)", function () {
  let assetNFT: AssetNFT;
  let mockRbac: MockRBACRegistry;
  let admin: HardhatEthersSigner;
  let manager: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let unauthorizedUser: HardhatEthersSigner;

  // Roles
  let ADMIN_ROLE: string;
  let MANAGER_ROLE: string;
  let USER_ROLE: string;

  // Test Asset Fixtures
  const ASSET_ID_1 = "AST-HW-2026-0001";
  const ASSET_ID_2 = "AST-LIC-2026-0002";
  const ASSET_TYPE_HW = "HARDWARE_DEVICE";
  const ASSET_TYPE_LIC = "ENTERPRISE_LICENSE";
  const ASSET_REF_DIGEST = "ipfs://QmZtmD2qt8fJpqBp36gZsuSZSZvN5jVw9JBC09128312";
  const METADATA_URI_1 = "https://assets.securemax.org/metadata/ast-0001.json";
  const METADATA_URI_2 = "https://assets.securemax.org/metadata/ast-0002.json";
  const UPDATED_METADATA_URI = "https://assets.securemax.org/metadata/ast-0001-v2.json";

  const DID_USER_1 = "did:assetchain:usr-1001-alice-7f8a9b";
  const DID_USER_2 = "did:assetchain:usr-1002-bob-3c4d5e";

  // Asset Status Enum
  enum AssetStatus {
    None = 0,
    Registered = 1,
    Allocated = 2,
    InMaintenance = 3,
    Decommissioned = 4,
  }

  beforeEach(async function () {
    [admin, manager, user1, user2, unauthorizedUser] = await ethers.getSigners();

    // Deploy Mock RBAC Registry
    const MockRBACFactory = await ethers.getContractFactory("MockRBACRegistry");
    mockRbac = await MockRBACFactory.deploy();
    await mockRbac.waitForDeployment();

    ADMIN_ROLE = await mockRbac.ADMIN_ROLE();
    MANAGER_ROLE = await mockRbac.MANAGER_ROLE();
    USER_ROLE = await mockRbac.USER_ROLE();

    // Assign roles in mock RBAC
    await mockRbac.grantRole(ADMIN_ROLE, admin.address);
    await mockRbac.grantRole(MANAGER_ROLE, manager.address);
    await mockRbac.grantRole(USER_ROLE, user1.address);
    await mockRbac.grantRole(USER_ROLE, user2.address);

    // Deploy AssetNFT
    const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
    assetNFT = await AssetNFTFactory.deploy(
      "SecureMAX Organizational Asset",
      "SMX-AST",
      await mockRbac.getAddress()
    );
    await assetNFT.waitForDeployment();
  });

  // =========================================================================
  // 1. DEPLOYMENT & INITIAL STATE
  // =========================================================================
  describe("Deployment & Initial State", function () {
    it("should initialize token metadata and RBAC registry correctly", async function () {
      expect(await assetNFT.name()).to.equal("SecureMAX Organizational Asset");
      expect(await assetNFT.symbol()).to.equal("SMX-AST");
      expect(await assetNFT.rbacRegistry()).to.equal(await mockRbac.getAddress());
      expect(await assetNFT.totalAssetsCount()).to.equal(0);
    });

    it("should revert if initialized with zero address RBAC registry", async function () {
      const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
      await expect(
        AssetNFTFactory.deploy("Name", "SYM", ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(assetNFT, "ZeroAddressNotAllowed");
    });
  });

  // =========================================================================
  // 2. ASSET MINTING (HAPPY PATH)
  // =========================================================================
  describe("Authorized Asset Minting", function () {
    it("should allow Admin to mint a new organizational asset NFT", async function () {
      const tx = await assetNFT
        .connect(admin)
        .mintAsset(
          ASSET_ID_1,
          ASSET_TYPE_HW,
          ASSET_REF_DIGEST,
          METADATA_URI_1,
          user1.address,
          DID_USER_1
        );

      const tokenId = 1n;

      // Event emission check
      await expect(tx)
        .to.emit(assetNFT, "AssetMinted")
        .withArgs(
          tokenId,
          ASSET_ID_1,
          ASSET_ID_1,
          ASSET_TYPE_HW,
          user1.address,
          DID_USER_1,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await assetNFT.ownerOf(tokenId)).to.equal(user1.address);
      expect(await assetNFT.tokenURI(tokenId)).to.equal(METADATA_URI_1);
      expect(await assetNFT.totalAssetsCount()).to.equal(1);

      // Verify record struct
      const record = await assetNFT.getAsset(tokenId);
      expect(record.tokenId).to.equal(tokenId);
      expect(record.assetId).to.equal(ASSET_ID_1);
      expect(record.assetType).to.equal(ASSET_TYPE_HW);
      expect(record.assetReference).to.equal(ASSET_REF_DIGEST);
      expect(record.metadataURI).to.equal(METADATA_URI_1);
      expect(record.currentOwner).to.equal(user1.address);
      expect(record.ownerDid).to.equal(DID_USER_1);
      expect(record.status).to.equal(AssetStatus.Registered);
      expect(record.createdAt).to.be.gt(0);
    });

    it("should allow Manager to mint a new organizational asset NFT", async function () {
      await assetNFT
        .connect(manager)
        .mintAsset(
          ASSET_ID_2,
          ASSET_TYPE_LIC,
          ASSET_REF_DIGEST,
          METADATA_URI_2,
          user2.address,
          DID_USER_2
        );

      expect(await assetNFT.ownerOf(1n)).to.equal(user2.address);
      const record = await assetNFT.getAssetByAssetId(ASSET_ID_2);
      expect(record.assetId).to.equal(ASSET_ID_2);
      expect(record.assetType).to.equal(ASSET_TYPE_LIC);
    });
  });

  // =========================================================================
  // 3. MINTING SECURITY & NEGATIVE TESTS
  // =========================================================================
  describe("Minting Security & Negative Tests", function () {
    it("should reject minting by unauthorized users", async function () {
      await expect(
        assetNFT
          .connect(unauthorizedUser)
          .mintAsset(
            ASSET_ID_1,
            ASSET_TYPE_HW,
            ASSET_REF_DIGEST,
            METADATA_URI_1,
            user1.address,
            DID_USER_1
          )
      ).to.be.revertedWithCustomError(assetNFT, "UnauthorizedAccess")
        .withArgs(unauthorizedUser.address);
    });

    it("should reject duplicate assetId registration", async function () {
      await assetNFT
        .connect(admin)
        .mintAsset(
          ASSET_ID_1,
          ASSET_TYPE_HW,
          ASSET_REF_DIGEST,
          METADATA_URI_1,
          user1.address,
          DID_USER_1
        );

      await expect(
        assetNFT
          .connect(admin)
          .mintAsset(
            ASSET_ID_1,
            ASSET_TYPE_HW,
            ASSET_REF_DIGEST,
            METADATA_URI_1,
            user2.address,
            DID_USER_2
          )
      ).to.be.revertedWithCustomError(assetNFT, "AssetAlreadyExists")
        .withArgs(ASSET_ID_1);
    });

    it("should reject minting to zero address recipient", async function () {
      await expect(
        assetNFT
          .connect(admin)
          .mintAsset(
            ASSET_ID_1,
            ASSET_TYPE_HW,
            ASSET_REF_DIGEST,
            METADATA_URI_1,
            ethers.ZeroAddress,
            DID_USER_1
          )
      ).to.be.revertedWithCustomError(assetNFT, "InvalidRecipientAddress");
    });

    it("should reject empty assetId string", async function () {
      await expect(
        assetNFT
          .connect(admin)
          .mintAsset(
            "",
            ASSET_TYPE_HW,
            ASSET_REF_DIGEST,
            METADATA_URI_1,
            user1.address,
            DID_USER_1
          )
      ).to.be.revertedWithCustomError(assetNFT, "InvalidAssetData")
        .withArgs("Invalid assetId length");
    });
  });

  // =========================================================================
  // 4. ASSET ALLOCATION
  // =========================================================================
  describe("Asset Allocation & Custody Transfer", function () {
    beforeEach(async function () {
      await assetNFT
        .connect(admin)
        .mintAsset(
          ASSET_ID_1,
          ASSET_TYPE_HW,
          ASSET_REF_DIGEST,
          METADATA_URI_1,
          admin.address,
          "did:assetchain:org-admin"
        );
    });

    it("should allow Manager to allocate an asset to user1", async function () {
      const tx = await assetNFT
        .connect(manager)
        .allocateAsset(1n, user1.address, DID_USER_1);

      await expect(tx)
        .to.emit(assetNFT, "AssetAllocated")
        .withArgs(
          1n,
          ASSET_ID_1,
          admin.address,
          user1.address,
          DID_USER_1,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await assetNFT.ownerOf(1n)).to.equal(user1.address);
      const record = await assetNFT.getAsset(1n);
      expect(record.status).to.equal(AssetStatus.Allocated);
      expect(record.currentOwner).to.equal(user1.address);
      expect(record.ownerDid).to.equal(DID_USER_1);
    });

    it("should reject allocation by unauthorized user", async function () {
      await expect(
        assetNFT
          .connect(unauthorizedUser)
          .allocateAsset(1n, user1.address, DID_USER_1)
      ).to.be.revertedWithCustomError(assetNFT, "UnauthorizedAccess");
    });

    it("should reject allocation of non-existent token", async function () {
      await expect(
        assetNFT
          .connect(manager)
          .allocateAsset(999n, user1.address, DID_USER_1)
      ).to.be.revertedWithCustomError(assetNFT, "AssetNotFound")
        .withArgs(999n);
    });

    it("should reject allocation to zero address", async function () {
      await expect(
        assetNFT
          .connect(manager)
          .allocateAsset(1n, ethers.ZeroAddress, DID_USER_1)
      ).to.be.revertedWithCustomError(assetNFT, "InvalidRecipientAddress");
    });
  });

  // =========================================================================
  // 5. ASSET TRANSFERS (AUTHORIZED & CONTROLLED)
  // =========================================================================
  describe("Authorized Asset Transfer", function () {
    beforeEach(async function () {
      await assetNFT
        .connect(admin)
        .mintAsset(
          ASSET_ID_1,
          ASSET_TYPE_HW,
          ASSET_REF_DIGEST,
          METADATA_URI_1,
          user1.address,
          DID_USER_1
        );
    });

    it("should allow current owner (user1) to transfer asset to user2", async function () {
      const tx = await assetNFT
        .connect(user1)
        .transferAsset(1n, user2.address, DID_USER_2);

      await expect(tx)
        .to.emit(assetNFT, "AssetTransferred")
        .withArgs(
          1n,
          ASSET_ID_1,
          user1.address,
          user2.address,
          DID_USER_2,
          user1.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await assetNFT.ownerOf(1n)).to.equal(user2.address);
      const record = await assetNFT.getAsset(1n);
      expect(record.currentOwner).to.equal(user2.address);
      expect(record.ownerDid).to.equal(DID_USER_2);
    });

    it("should allow Admin to override/execute transfer to user2", async function () {
      await assetNFT
        .connect(admin)
        .transferAsset(1n, user2.address, DID_USER_2);

      expect(await assetNFT.ownerOf(1n)).to.equal(user2.address);
    });

    it("should reject transfer by unauthorized third party", async function () {
      await expect(
        assetNFT
          .connect(unauthorizedUser)
          .transferAsset(1n, user2.address, DID_USER_2)
      ).to.be.revertedWithCustomError(assetNFT, "UnauthorizedAccess")
        .withArgs(unauthorizedUser.address);
    });

    it("should reject transfer to zero address", async function () {
      await expect(
        assetNFT
          .connect(user1)
          .transferAsset(1n, ethers.ZeroAddress, DID_USER_2)
      ).to.be.revertedWithCustomError(assetNFT, "InvalidRecipientAddress");
    });
  });

  // =========================================================================
  // 6. LIFECYCLE STATUS & DECOMMISSIONING
  // =========================================================================
  describe("Lifecycle Status Management", function () {
    beforeEach(async function () {
      await assetNFT
        .connect(admin)
        .mintAsset(
          ASSET_ID_1,
          ASSET_TYPE_HW,
          ASSET_REF_DIGEST,
          METADATA_URI_1,
          user1.address,
          DID_USER_1
        );
    });

    it("should allow Manager to set status to InMaintenance and block transfers", async function () {
      const tx = await assetNFT
        .connect(manager)
        .updateAssetStatus(1n, AssetStatus.InMaintenance);

      await expect(tx)
        .to.emit(assetNFT, "AssetStatusUpdated")
        .withArgs(
          1n,
          ASSET_ID_1,
          AssetStatus.Registered,
          AssetStatus.InMaintenance,
          manager.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      // Transfers should now be blocked
      await expect(
        assetNFT.connect(user1).transferAsset(1n, user2.address, DID_USER_2)
      ).to.be.revertedWithCustomError(assetNFT, "AssetInMaintenance")
        .withArgs(1n);
    });

    it("should allow Admin to decommission asset permanently", async function () {
      await assetNFT
        .connect(admin)
        .updateAssetStatus(1n, AssetStatus.Decommissioned);

      // Allocation and transfers must revert
      await expect(
        assetNFT.connect(manager).allocateAsset(1n, user2.address, DID_USER_2)
      ).to.be.revertedWithCustomError(assetNFT, "AssetDecommissioned")
        .withArgs(1n);

      await expect(
        assetNFT.connect(user1).transferAsset(1n, user2.address, DID_USER_2)
      ).to.be.revertedWithCustomError(assetNFT, "AssetDecommissioned")
        .withArgs(1n);

      // Cannot transition away from Decommissioned
      await expect(
        assetNFT.connect(admin).updateAssetStatus(1n, AssetStatus.Allocated)
      ).to.be.revertedWithCustomError(assetNFT, "AssetDecommissioned")
        .withArgs(1n);
    });

    it("should allow updating metadata URI", async function () {
      const tx = await assetNFT
        .connect(manager)
        .updateMetadataURI(1n, UPDATED_METADATA_URI);

      await expect(tx)
        .to.emit(assetNFT, "AssetMetadataUpdated")
        .withArgs(
          1n,
          METADATA_URI_1,
          UPDATED_METADATA_URI,
          manager.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await assetNFT.tokenURI(1n)).to.equal(UPDATED_METADATA_URI);
    });
  });

  // =========================================================================
  // 7. OWNERSHIP VERIFICATION & VIEW HELPERS
  // =========================================================================
  describe("Ownership & DID Verification", function () {
    beforeEach(async function () {
      await assetNFT
        .connect(admin)
        .mintAsset(
          ASSET_ID_1,
          ASSET_TYPE_HW,
          ASSET_REF_DIGEST,
          METADATA_URI_1,
          user1.address,
          DID_USER_1
        );
    });

    it("should verify ownership and DID accurately", async function () {
      const [isOwner, isDidMatch, status] = await assetNFT.verifyOwnership(
        1n,
        user1.address,
        DID_USER_1
      );

      expect(isOwner).to.be.true;
      expect(isDidMatch).to.be.true;
      expect(status).to.equal(AssetStatus.Registered);
    });

    it("should detect address mismatch in verification", async function () {
      const [isOwner, isDidMatch] = await assetNFT.verifyOwnership(
        1n,
        user2.address,
        DID_USER_1
      );

      expect(isOwner).to.be.false;
      expect(isDidMatch).to.be.true;
    });

    it("should detect DID mismatch in verification", async function () {
      const [isOwner, isDidMatch] = await assetNFT.verifyOwnership(
        1n,
        user1.address,
        DID_USER_2
      );

      expect(isOwner).to.be.true;
      expect(isDidMatch).to.be.false;
    });

    it("should return false for non-existent token", async function () {
      const [isOwner, isDidMatch, status] = await assetNFT.verifyOwnership(
        999n,
        user1.address,
        DID_USER_1
      );

      expect(isOwner).to.be.false;
      expect(isDidMatch).to.be.false;
      expect(status).to.equal(AssetStatus.None);
    });
  });

  // =========================================================================
  // 8. CONFIGURATION & EMERGENCY CONTROLS
  // =========================================================================
  describe("Configuration & Emergency Pause Controls", function () {
    it("should allow Admin to update RBAC Registry address", async function () {
      const newMockRbac = await (await ethers.getContractFactory("MockRBACRegistry")).deploy();
      await newMockRbac.waitForDeployment();

      const tx = await assetNFT.connect(admin).setRBACRegistry(await newMockRbac.getAddress());

      await expect(tx)
        .to.emit(assetNFT, "RBACRegistryUpdated")
        .withArgs(
          await mockRbac.getAddress(),
          await newMockRbac.getAddress(),
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp)
        );

      expect(await assetNFT.rbacRegistry()).to.equal(await newMockRbac.getAddress());
    });

    it("should allow Admin to pause and unpause contract operations", async function () {
      await assetNFT.connect(admin).pause();

      await expect(
        assetNFT
          .connect(admin)
          .mintAsset(
            ASSET_ID_1,
            ASSET_TYPE_HW,
            ASSET_REF_DIGEST,
            METADATA_URI_1,
            user1.address,
            DID_USER_1
          )
      ).to.be.revertedWithCustomError(assetNFT, "EnforcedPause");

      await assetNFT.connect(admin).unpause();

      await expect(
        assetNFT
          .connect(admin)
          .mintAsset(
            ASSET_ID_1,
            ASSET_TYPE_HW,
            ASSET_REF_DIGEST,
            METADATA_URI_1,
            user1.address,
            DID_USER_1
          )
      ).to.not.be.reverted;
    });
  });
});
