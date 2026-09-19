import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry, AccessControlManager, AssetNFT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Milestone V4: Full System Integration (Identity -> RBAC -> NFT -> Authorization -> Events)", function () {
  let identityRegistry: IdentityRegistry;
  let rbacManager: AccessControlManager;
  let assetNFT: AssetNFT;

  let admin: HardhatEthersSigner;
  let registrar: HardhatEthersSigner;
  let manager: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  // Constants
  const DID_USER_1 = "did:assetchain:usr-1001-alice-7f8a9b";
  const DID_USER_2 = "did:assetchain:usr-1002-bob-3c4d5e";
  const PUB_KEY_1 = ethers.toUtf8Bytes("0x04bfcad84f346b8d91024bc68840c4");
  const PUB_KEY_2 = ethers.toUtf8Bytes("0x04789abcefe123456789abcdef0123");

  const ASSET_ID = "AST-HW-2026-001";
  const ASSET_TYPE = "HARDWARE";
  const ASSET_REF = "doc_hash_12345";
  const METADATA_URI = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/asset.json";

  let MANAGER_ROLE: string;
  let USER_ROLE: string;

  before(async function () {
    [admin, registrar, manager, user1, user2, unauthorized] = await ethers.getSigners();

    // 1. Deploy IdentityRegistry
    const IdentityFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityFactory.deploy(admin.address);
    await identityRegistry.waitForDeployment();
    
    const REGISTRAR_ROLE = await identityRegistry.REGISTRAR_ROLE();
    await identityRegistry.grantRole(REGISTRAR_ROLE, registrar.address);

    // 2. Deploy AccessControlManager (RBAC)
    const RBACFactory = await ethers.getContractFactory("AccessControlManager");
    rbacManager = await RBACFactory.deploy(admin.address);
    await rbacManager.waitForDeployment();

    MANAGER_ROLE = await rbacManager.MANAGER_ROLE();
    USER_ROLE = await rbacManager.USER_ROLE();

    // 3. Deploy AssetNFT
    const AssetFactory = await ethers.getContractFactory("AssetNFT");
    assetNFT = await AssetFactory.deploy("SecureMAX Asset", "SMAX", await rbacManager.getAddress());
    await assetNFT.waitForDeployment();
  });

  it("Step 1 (Identity): Registrar creates verified DIDs for users", async function () {
    // Register user1
    const tx1 = await identityRegistry.connect(registrar).registerIdentity(DID_USER_1, PUB_KEY_1, user1.address);
    await expect(tx1).to.emit(identityRegistry, "IdentityRegistered").withArgs(DID_USER_1, DID_USER_1, user1.address, ethers.hexlify(PUB_KEY_1), await ethers.provider.getBlock("latest").then(b => b!.timestamp));

    // Register user2
    const tx2 = await identityRegistry.connect(registrar).registerIdentity(DID_USER_2, PUB_KEY_2, user2.address);
    await expect(tx2).to.emit(identityRegistry, "IdentityRegistered").withArgs(DID_USER_2, DID_USER_2, user2.address, ethers.hexlify(PUB_KEY_2), await ethers.provider.getBlock("latest").then(b => b!.timestamp));

    expect(await identityRegistry.isIdentityActive(DID_USER_1)).to.be.true;
    expect(await identityRegistry.isIdentityActive(DID_USER_2)).to.be.true;
  });

  it("Step 2 (RBAC): Admin assigns roles to users", async function () {
    const txManager = await rbacManager.connect(admin).assignRole(MANAGER_ROLE, manager.address);
    await expect(txManager).to.emit(rbacManager, "RoleAssignmentLogged");
    
    const txUser = await rbacManager.connect(admin).assignRole(USER_ROLE, user1.address);
    await expect(txUser).to.emit(rbacManager, "RoleAssignmentLogged");

    expect(await rbacManager.isManager(manager.address)).to.be.true;
    expect(await rbacManager.isUser(user1.address)).to.be.true;
  });

  it("Step 3 (NFT/Asset): Manager mints a new asset NFT", async function () {
    // Manager mints the NFT to themselves initially or to contract
    const txMint = await assetNFT.connect(manager).mintAsset(
      ASSET_ID,
      ASSET_TYPE,
      ASSET_REF,
      METADATA_URI,
      manager.address, // Initial recipient
      "did:assetchain:org-sec-c8d32e1"
    );

    await expect(txMint).to.emit(assetNFT, "AssetMinted");
    
    const asset = await assetNFT.getAssetByAssetId(ASSET_ID);
    expect(asset.currentOwner).to.equal(manager.address);
  });

  it("Step 4 (Authorization & Transfer): Manager allocates asset to verified User1", async function () {
    const asset = await assetNFT.getAssetByAssetId(ASSET_ID);
    
    // Allocate to User1
    const txAllocate = await assetNFT.connect(manager).allocateAsset(asset.tokenId, user1.address, DID_USER_1);
    await expect(txAllocate).to.emit(assetNFT, "AssetAllocated").withArgs(
      asset.tokenId,
      ASSET_ID,
      manager.address,
      user1.address,
      DID_USER_1,
      await ethers.provider.getBlock("latest").then(b => b!.timestamp)
    );

    // Verify ownership mapping
    const verify = await assetNFT.verifyOwnership(asset.tokenId, user1.address, DID_USER_1);
    expect(verify.isOwner).to.be.true;
    expect(verify.isDidMatch).to.be.true;
  });

  it("Step 5 (Events & Enforcement): User1 transfers asset to User2, Unauthorized fails", async function () {
    const asset = await assetNFT.getAssetByAssetId(ASSET_ID);

    // Unauthorized party attempts transfer -> fails
    await expect(
      assetNFT.connect(unauthorized).transferAsset(asset.tokenId, unauthorized.address, "did:assetchain:fake")
    ).to.be.revertedWithCustomError(assetNFT, "UnauthorizedAccess");

    // Owner (User1) transfers to User2
    const txTransfer = await assetNFT.connect(user1).transferAsset(asset.tokenId, user2.address, DID_USER_2);
    
    await expect(txTransfer).to.emit(assetNFT, "AssetTransferred").withArgs(
      asset.tokenId,
      ASSET_ID,
      user1.address,
      user2.address,
      DID_USER_2,
      user1.address,
      await ethers.provider.getBlock("latest").then(b => b!.timestamp)
    );

    // Verify final ownership
    const verify = await assetNFT.verifyOwnership(asset.tokenId, user2.address, DID_USER_2);
    expect(verify.isOwner).to.be.true;
    expect(verify.isDidMatch).to.be.true;
  });
});
