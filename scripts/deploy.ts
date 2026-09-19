const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("====================================================");
  console.log("🚀 Deploying Full SecureMAX Blockchain Platform");
  console.log("====================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address: ${deployer.address}`);

  const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistryFactory.deploy(deployer.address);
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log(`✅ IdentityRegistry deployed at: ${identityAddress}`);

  const AccessControlFactory = await ethers.getContractFactory("AccessControlManager");
  const rbacManager = await AccessControlFactory.deploy(deployer.address, identityAddress);
  await rbacManager.waitForDeployment();
  const rbacAddress = await rbacManager.getAddress();
  console.log(`✅ AccessControlManager deployed at: ${rbacAddress}`);

  const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFTFactory.deploy("SecureMAX Organizational Asset", "SMX-AST", rbacAddress, identityAddress);
  await assetNFT.waitForDeployment();
  const assetAddress = await assetNFT.getAddress();
  console.log(`✅ AssetNFT deployed at: ${assetAddress}`);

  const addresses = {
    IdentityRegistry: identityAddress,
    AccessControlManager: rbacAddress,
    AssetNFT: assetAddress
  };

  const networkInfo = await ethers.provider.getNetwork();
  const chainId = networkInfo.chainId.toString();
  
  let networkName = networkInfo.name;
  if (chainId === "11155111") {
    networkName = "sepolia";
  }

  const finalOutput = {
    network: networkName,
    chainId: chainId,
    contracts: addresses
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployed-addresses.json"),
    JSON.stringify(finalOutput, null, 2)
  );

  console.log("✅ Contract addresses exported to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
