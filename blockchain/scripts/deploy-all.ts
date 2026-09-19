import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("====================================================");
  console.log("🚀 Deploying Full SecureMAX Blockchain Platform");
  console.log("====================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address: ${deployer.address}`);

  // 1. Deploy Identity Registry
  const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistryFactory.deploy(deployer.address);
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log(`✅ IdentityRegistry deployed at: ${identityAddress}`);

  // 2. Deploy AccessControlManager (RBAC)
  const AccessControlFactory = await ethers.getContractFactory("AccessControlManager");
  const rbacManager = await AccessControlFactory.deploy(deployer.address);
  await rbacManager.waitForDeployment();
  const rbacAddress = await rbacManager.getAddress();
  console.log(`✅ AccessControlManager deployed at: ${rbacAddress}`);

  // 3. Deploy AssetNFT
  const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFTFactory.deploy(
    "SecureMAX Organizational Asset",
    "SMX-AST",
    rbacAddress
  );
  await assetNFT.waitForDeployment();
  const assetAddress = await assetNFT.getAddress();
  console.log(`✅ AssetNFT deployed at: ${assetAddress}`);

  // 4. Export Addresses
  const addresses = {
    IdentityRegistry: identityAddress,
    AccessControlManager: rbacAddress,
    AssetNFT: assetAddress
  };

  const frontendContractsDir = path.join(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendContractsDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  const backendContractsDir = path.join(__dirname, "../../backend/src/contracts");
  if (!fs.existsSync(backendContractsDir)) {
    fs.mkdirSync(backendContractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(backendContractsDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log("✅ Contract addresses exported to frontend and backend for Ritik & Vaani integration.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
