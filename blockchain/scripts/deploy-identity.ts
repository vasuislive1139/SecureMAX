import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("====================================================");
  console.log("🚀 Deploying IdentityRegistry Contract (Person 2)");
  console.log("====================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);

  // Deploy IdentityRegistry with deployer as initial Admin and Registrar
  const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistryFactory.deploy(deployer.address);

  await identityRegistry.waitForDeployment();
  const contractAddress = await identityRegistry.getAddress();

  console.log(`✅ IdentityRegistry deployed at: ${contractAddress}`);

  // Export deployment info and ABI for integration (Person 1, 3, 4, 5)
  const deploymentInfo = {
    contractName: "IdentityRegistry",
    address: contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "identity-registry-deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`📄 Deployment info saved to: blockchain/deployments/identity-registry-deployment.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
