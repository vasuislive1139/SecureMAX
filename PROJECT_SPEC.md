# COMMON PROJECT SPECIFICATION
Blockchain-Based Decentralized Identity, RBAC, and NFT Asset Ownership Platform

## PROJECT PURPOSE
Build a beginner-friendly but security-conscious blockchain platform that combines:
1. KYC-based real-world user verification
2. Custom cryptographic authentication/login
3. Decentralized Identity (DID)
4. Role-Based Access Control (RBAC)
5. NFT-based asset ownership
6. Smart-contract authorization
7. Blockchain-based audit/history

## FINAL HIGH-LEVEL FLOW
USER
  ↓
KYC / Registration
  ↓
KYC Verification (OFF-CHAIN)
  ↓
Cryptographic Identity
  ↓
Public Key + DID
  ↓
RBAC
  ↓
Smart Contracts
  ↓
NFT / Asset Ownership
  ↓
Blockchain Audit Trail

## IMPORTANT ARCHITECTURAL DECISIONS
- DO NOT use MetaMask.
- The application will implement its own cryptographic login mechanism.
- KYC/PII must remain off-chain.
- The user's raw private key must never be sent to or stored by the backend.
- Blockchain stores only data appropriate for public/persistent storage.
- Smart contracts enforce blockchain authorization; frontend restrictions are NOT security.
- NFT is a blockchain representation of an organizational asset, not automatic proof that a physical object is genuine.
- This is an academic/student prototype, not a production KYC provider or production identity system unless explicitly upgraded later.

## PRIVACY: NEVER PUT THESE DIRECTLY ON BLOCKCHAIN
- Name
- Email
- Phone
- Address
- Government ID number
- KYC documents
- Date of birth
- Passwords
- Raw private keys
- Other sensitive PII

## POTENTIALLY ON-CHAIN
- DID
- Public key
- Appropriate identity status
- Role
- NFT token ID
- Ownership/state
- Permission state
- Smart-contract events and transaction history

## TECHNOLOGY BASELINE
Frontend: React
Backend: Node.js + Express.js
Database: PostgreSQL
Blockchain: Ethereum-compatible blockchain
Smart contracts: Solidity
Development: Hardhat
NFT standard: ERC-721
Blockchain library: ethers.js
Cryptography: Web Crypto API and established cryptographic libraries
Smart-contract libraries: OpenZeppelin

## ROLES
ADMIN
MANAGER
AUDITOR
USER

## REPOSITORY BASELINE
project/
├── backend/
├── blockchain/
├── frontend/
├── docs/
├── .env.example
├── README.md
└── PROJECT_SPEC.md

## INTEGRATION PRINCIPLE
Person 1 owns KYC/authentication.
Person 2 owns DID/identity registry.
Person 3 owns RBAC/authorization.
Person 4 owns NFT/assets.
Person 5 owns frontend/integration.
