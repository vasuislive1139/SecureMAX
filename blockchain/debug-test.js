const { ethers } = require("hardhat");

async function main() {
  const [admin, user1] = await ethers.getSigners();
  
  const IdFactory = await ethers.getContractFactory("IdentityRegistry");
  const idRegistry = await IdFactory.deploy(admin.address);
  await idRegistry.waitForDeployment();
  console.log("ID Registry:", await idRegistry.getAddress());
  
  await idRegistry.connect(admin).registerIdentity("did:assetchain:user1", ethers.hexlify(ethers.randomBytes(32)), user1.address);
  console.log("Registered:", await idRegistry.isIdentityRegistered(user1.address));
  console.log("Active:", await idRegistry.isIdentityActive(user1.address));
  
  const RBACFactory = await ethers.getContractFactory("AccessControlManager");
  const rbac = await RBACFactory.deploy(admin.address, await idRegistry.getAddress());
  await rbac.waitForDeployment();
  console.log("RBAC:", await rbac.getAddress());
  
  const USER_ROLE = await rbac.USER_ROLE();
  try {
      await rbac.connect(admin).assignRole(USER_ROLE, user1.address);
      console.log("Assigned!");
  } catch (e) {
      console.log("Error assigning role:", e);
  }
}
main().catch(console.error);
