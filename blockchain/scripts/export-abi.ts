import * as fs from "fs";
import * as path from "path";

async function exportAbi() {
  const abiDir = path.join(__dirname, "../abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const contracts = [
    {
      name: "IdentityRegistry",
      path: "../artifacts/contracts/identity/IdentityRegistry.sol/IdentityRegistry.json",
    },
    {
      name: "AssetNFT",
      path: "../artifacts/contracts/assets/AssetNFT.sol/AssetNFT.json",
    },
  ];

  for (const item of contracts) {
    const artifactPath = path.join(__dirname, item.path);
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      fs.writeFileSync(
        path.join(abiDir, `${item.name}.json`),
        JSON.stringify(artifact.abi, null, 2)
      );
      console.log(`✅ ${item.name} ABI exported to blockchain/abi/${item.name}.json`);
    } else {
      console.warn(`⚠️ Artifact not found for ${item.name} at ${artifactPath}`);
    }
  }
}

exportAbi()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
