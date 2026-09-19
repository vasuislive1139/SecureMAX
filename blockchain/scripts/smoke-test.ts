import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("========================================");
  console.log("       SECUREMAX SMOKE TEST");
  console.log("========================================\n");

  const [admin, manager, user1, user2] = await ethers.getSigners();

  // Load deployed addresses
  const deployFile = path.join(__dirname, "../deployments/master-deployment.json");
  if (!fs.existsSync(deployFile)) {
    throw new Error("Deployment file not found!");
  }
  const deployment = JSON.parse(fs.readFileSync(deployFile, "utf-8"));
  
  const identityRegistry = await ethers.getContractAt("IdentityRegistry", deployment.contracts.IdentityRegistry);
  const rbacManager = await ethers.getContractAt("AccessControlManager", deployment.contracts.AccessControlManager);
  const assetNFT = await ethers.getContractAt("AssetNFT", deployment.contracts.AssetNFT);

  const MANAGER_ROLE = await rbacManager.MANAGER_ROLE();

  try {
    // [1/7] Identity registration
    const DID_MANAGER = "did:assetchain:smk-mgr-22890";
    const DID_USER1 = "did:assetchain:smk-u1-22890";
    const DID_USER2 = "did:assetchain:smk-u2-22890";
    
    // Register Manager
    await (await identityRegistry.connect(admin).registerIdentity(DID_MANAGER, ethers.randomBytes(32), manager.address)).wait();
    // Register User1
    await (await identityRegistry.connect(admin).registerIdentity(DID_USER1, ethers.randomBytes(32), user1.address)).wait();
    // Register User2
    await (await identityRegistry.connect(admin).registerIdentity(DID_USER2, ethers.randomBytes(32), user2.address)).wait();

    console.log("[1/7] Identity registration       PASS");

    // [2/7] Identity active
    const isManagerActive = await identityRegistry["isIdentityActive(address)"](manager.address);
    const isUser1Active = await identityRegistry["isIdentityActive(address)"](user1.address);
    if (!isManagerActive || !isUser1Active) throw new Error("Identities not active");
    
    console.log("[2/7] Identity active             PASS");

    // [3/7] Manager role assignment
    await (await rbacManager.connect(admin).assignRole(MANAGER_ROLE, manager.address)).wait();
    const isManager = await rbacManager.isManager(manager.address);
    if (!isManager) throw new Error("Role assignment failed");

    console.log("[3/7] Manager role assignment     PASS");

    // [4/7] Asset mint/allocation
    // Mint to organization first (admin)
    const DID_ADMIN = "did:assetchain:org-admin";
    // Admin needs to be registered so they can interact as initialRecipient if needed, but minting doesn't strictly check identity, we will just pass empty or random DID.
    const txMint = await assetNFT.connect(manager).mintAsset(
      "SMK-AST-22890",
      "HARDWARE",
      "hash123",
      "ipfs://test",
      admin.address,
      DID_ADMIN
    );
    const receiptMint = await txMint.wait();
    
    // Allocate to User1
    const txAlloc = await assetNFT.connect(manager).allocateAsset(1, user1.address, DID_USER1);
    await txAlloc.wait();

    console.log("[4/7] Asset mint/allocation       PASS");

    // [5/7] Ownership verification
    const [isOwner, isDidMatch, status] = await assetNFT.verifyOwnership(1, user1.address, DID_USER1);
    if (!isOwner || !isDidMatch || status !== 2n) throw new Error("Ownership verification failed");

    console.log("[5/7] Ownership verification      PASS");

    // [6/7] Authorized transfer
    const txTransfer = await assetNFT.connect(user1).transferAsset(1, user2.address, DID_USER2);
    const receiptTransfer = await txTransfer.wait();

    const [isOwner2] = await assetNFT.verifyOwnership(1, user2.address, DID_USER2);
    if (!isOwner2) throw new Error("Transfer failed");

    console.log("[6/7] Authorized transfer         PASS");

    // [7/7] Event verification
    // We check if Transfer event is present in the receipt
    let foundTransfer = false;
    for (const log of receiptTransfer!.logs) {
      try {
        const parsed = assetNFT.interface.parseLog({ topics: log.topics.slice(), data: log.data });
        if (parsed && parsed.name === "AssetTransferred") foundTransfer = true;
      } catch (e) {}
    }
    if (!foundTransfer) throw new Error("Event missing");

    console.log("[7/7] Event verification          PASS");

    // [8/8] Deliberate security failure check
    // Suspend user2
    await (await identityRegistry.connect(admin)["updateIdentityStatus(string,uint8)"](DID_USER2, 2)).wait(); // 2 = Suspended
    
    // Attempt to transfer back to user1
    let failed = false;
    try {
      await assetNFT.connect(user2).transferAsset(1, user1.address, DID_USER1);
    } catch (error: any) {
      if (error.message.includes("IdentityNotActive")) {
        failed = true;
      }
    }

    if (!failed) throw new Error("Protected operation should have reverted for suspended identity");
    
    console.log("[8/8] Suspended security check    PASS\n");
    console.log("========================================");
    console.log("       SMOKE TEST PASSED");
    console.log("========================================");

  } catch (error) {
    console.error("SMOKE TEST FAILED:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
