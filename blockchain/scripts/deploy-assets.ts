import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("====================================================");
  console.log("🚀 Deploying AssetNFT Contract (Person 4)");
  console.log("====================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address: ${deployer.address}`);

  // In local test / dev environment, deploy MockRBACRegistry or use existing RBAC address
  let rbacAddress = process.env.RBAC_REGISTRY_ADDRESS;

  if (!rbacAddress || rbacAddress === "") {
    console.log("ℹ️ No RBAC_REGISTRY_ADDRESS in env; deploying MockRBACRegistry for local deployment...");
    const MockRBAC = await ethers.getContractFactory("MockRBACRegistry");
    const mockRbac = await MockRBAC.deploy();
    await mockRbac.waitForDeployment();
    rbacAddress = await mockRbac.getAddress();
    console.log(`✅ MockRBACRegistry deployed at: ${rbacAddress}`);

    // Grant deployer Admin and Manager roles on mock RBAC
    const ADMIN_ROLE = await mockRbac.ADMIN_ROLE();
    const MANAGER_ROLE = await mockRbac.MANAGER_ROLE();
    await mockRbac.grantRole(ADMIN_ROLE, deployer.address);
    await mockRbac.grantRole(MANAGER_ROLE, deployer.address);
  }

  // Deploy AssetNFT
  const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFTFactory.deploy(
    "SecureMAX Organizational Asset",
    "SMX-AST",
    rbacAddress
  );

  await assetNFT.waitForDeployment();
  const contractAddress = await assetNFT.getAddress();

  console.log(`✅ AssetNFT deployed at: ${contractAddress}`);

  // Export deployment info
  const deploymentInfo = {
    contractName: "AssetNFT",
    address: contractAddress,
    deployer: deployer.address,
    rbacRegistry: rbacAddress,
    tokenName: "SecureMAX Organizational Asset",
    tokenSymbol: "SMX-AST",
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "asset-nft-deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`📄 Deployment info saved to: blockchain/deployments/asset-nft-deployment.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
