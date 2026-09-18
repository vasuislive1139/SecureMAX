const hre = require("hardhat");

async function main() {
  console.log("Deploying AssetNFT...");

  // In a real environment, RBAC address will be provided by Person 3.
  // For deployment demonstration, we assume it's passed as an environment variable or we deploy a mock.
  const rbacAddress = process.env.RBAC_ADDRESS;

  let finalRbacAddress = rbacAddress;

  if (!finalRbacAddress) {
    console.log("No RBAC_ADDRESS provided, deploying MockRBAC for testing purposes...");
    const MockRBAC = await hre.ethers.getContractFactory("MockRBAC");
    const mockRBAC = await MockRBAC.deploy();
    await mockRBAC.waitForDeployment();
    finalRbacAddress = await mockRBAC.getAddress();
    console.log(`MockRBAC deployed to ${finalRbacAddress}`);
  }

  const AssetNFT = await hre.ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFT.deploy(finalRbacAddress);
  await assetNFT.waitForDeployment();

  console.log(`AssetNFT deployed to ${await assetNFT.getAddress()} with RBAC at ${finalRbacAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
