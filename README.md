# Blockchain-Based Decentralized Identity, RBAC, and NFT Asset Ownership Platform

## Project Overview
This repository contains the integrated prototype for the Smart India Hackathon (SIH) cybersecurity and blockchain platform combining:
1. Off-chain KYC registration & verification (Person 1)
2. Decentralized Identity (DID) & Public-Key Registry (Person 2)
3. Role-Based Access Control (RBAC) (Person 3)
4. NFT Asset Ownership & Smart Contract Authorization (Person 4)
5. Frontend & System Integration (Person 5)

---

## Directory Structure
```
sih/
├── backend/          # KYC & off-chain authentication backend (Person 1)
├── blockchain/       # Hardhat environment, smart contracts, tests, deployment scripts
│   ├── contracts/    # Solidity smart contracts
│   │   └── identity/ # IdentityRegistry.sol (Person 2)
│   ├── abi/          # Exported ABI JSON files
│   ├── scripts/      # Deployment & automation scripts
│   └── test/         # Unit and security test suites
├── frontend/         # React client application (Person 5)
├── docs/             # Specifications and integration guides
├── .env.example      # Environment variables template
├── PROJECT_SPEC.md   # Common project specifications
└── README.md
```

---

## Person 2 Module: DID & Identity Registry
- **Contract**: `blockchain/contracts/identity/IdentityRegistry.sol`
- **Specification**: `docs/DID_SPECIFICATION.md`
- **Contract Docs**: `docs/IDENTITY_REGISTRY_DOCS.md`
- **Integration Guide**: `docs/PERSON_2_INTEGRATION_README.md`

### Running Tests:
```bash
cd blockchain
npm install
npm test
```
