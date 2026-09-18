import * as fs from "fs";
import * as path from "path";

async function exportAbi() {
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/identity/IdentityRegistry.sol/IdentityRegistry.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found! Run 'npx hardhat compile' first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const abiDir = path.join(__dirname, "../abi");
  
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(abiDir, "IdentityRegistry.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log("✅ IdentityRegistry ABI exported to blockchain/abi/IdentityRegistry.json");
}

exportAbi()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
