import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("====================================================");
  console.log("🚀 Deploying AccessControlManager Contract (Person 3)");
  console.log("====================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address: ${deployer.address}`);

  const AccessControlFactory = await ethers.getContractFactory("AccessControlManager");
  const accessControlManager = await AccessControlFactory.deploy(deployer.address);

  await accessControlManager.waitForDeployment();
  const contractAddress = await accessControlManager.getAddress();

  console.log(`✅ AccessControlManager deployed at: ${contractAddress}`);

  const deploymentInfo = {
    contractName: "AccessControlManager",
    address: contractAddress,
    deployer: deployer.address,
    roles: {
      ADMIN_ROLE: await accessControlManager.ADMIN_ROLE(),
      MANAGER_ROLE: await accessControlManager.MANAGER_ROLE(),
      AUDITOR_ROLE: await accessControlManager.AUDITOR_ROLE(),
      USER_ROLE: await accessControlManager.USER_ROLE(),
    },
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "rbac-deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`📄 Deployment info saved to: blockchain/deployments/rbac-deployment.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
