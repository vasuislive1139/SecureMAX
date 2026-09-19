const fs = require('fs');
let s = fs.readFileSync('src/app/(protected)/infrastructure/page.tsx', 'utf8');

const oldArray = s.substring(s.indexOf('const CONTRACTS = ['), s.indexOf('];', s.indexOf('const CONTRACTS = [')) + 2);

const newContracts = `const CONTRACTS = [
  { name: 'IdentityRegistry', address: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS || '0x...', domain: 'DOMAIN 1' },
  { name: 'AccessControlManager', address: process.env.NEXT_PUBLIC_ACCESS_CONTROL_MANAGER_ADDRESS || '0x...', domain: 'DOMAIN 1' },
  { name: 'AssetNFT', address: process.env.NEXT_PUBLIC_ASSET_NFT_ADDRESS || '0x...', domain: 'DOMAIN 1' }
];`;

s = s.replace(oldArray, newContracts);

fs.writeFileSync('src/app/(protected)/infrastructure/page.tsx', s);
