import * as fs from "fs";
import * as path from "path";

async function exportAbi() {
  const abiDirs = [
    path.join(__dirname, "../abi"),
    path.join(__dirname, "../../frontend/src/abi"),
    path.join(__dirname, "../../backend/src/abi"),
  ];

  for (const dir of abiDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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
    {
      name: "AccessControlManager",
      path: "../artifacts/contracts/access-control/AccessControlManager.sol/AccessControlManager.json",
    },
  ];

  for (const item of contracts) {
    const artifactPath = path.join(__dirname, item.path);
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      for (const dir of abiDirs) {
        fs.writeFileSync(
          path.join(dir, `${item.name}.json`),
          JSON.stringify(artifact.abi, null, 2)
        );
      }
      console.log(`✅ ${item.name} ABI exported to abi directories (frontend + backend)`);
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
