COMMON PROJECT SPECIFICATION
Blockchain-Based Decentralized Identity, RBAC, and NFT Asset Ownership Platform

PROJECT PURPOSE
Build a beginner-friendly but security-conscious blockchain platform that combines:
1. KYC-based real-world user verification
2. Custom cryptographic authentication/login
3. Decentralized Identity (DID)
4. Role-Based Access Control (RBAC)
5. NFT-based asset ownership
6. Smart-contract authorization
7. Blockchain-based audit/history

FINAL HIGH-LEVEL FLOW
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

IMPORTANT ARCHITECTURAL DECISIONS
- DO NOT use MetaMask.
- The application will implement its own cryptographic login mechanism.
- KYC/PII must remain off-chain.
- The user's raw private key must never be sent to or stored by the backend.
- Blockchain stores only data appropriate for public/persistent storage.
- Smart-contract authorization enforces blockchain security; frontend restrictions are NOT security.
- NFT is a blockchain representation of an organizational asset, not automatic proof that a physical object is genuine.
- This is an academic/student prototype, not a production KYC provider or production identity system unless explicitly upgraded later.

PRIVACY: NEVER PUT THESE DIRECTLY ON BLOCKCHAIN
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

POTENTIALLY ON-CHAIN
- DID
- Public key
- Appropriate identity status
- Role
- NFT token ID
- Ownership/state
- Permission state
- Smart-contract events and transaction history

TECHNOLOGY BASELINE
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

Do not introduce a different blockchain, framework, database, wallet provider, authentication provider, or major architecture without team approval.

ROLES
ADMIN
MANAGER
AUDITOR
USER

The exact permission matrix must be agreed upon and treated as a shared interface.

GLOBAL TEAM RULES
1. Stay strictly inside your assigned module.
2. Do not modify another person's module.
3. Do not silently change architecture.
4. Do not rename shared interfaces casually.
5. Do not duplicate functionality owned by another module.
6. If a cross-module change appears necessary:
   STOP.
   Report:
   - proposed change
   - reason
   - affected modules
   - security/technical impact
   Then wait for team approval.
7. Do not store secrets in source code.
8. Do not store private keys on the backend.
9. Do not put KYC/PII on-chain.
10. Never treat frontend checks as security enforcement.
11. Every module requires unit tests and negative/security tests.
12. Every module requires documentation.
13. Use feature branches and Pull Requests.
14. Never push feature work directly to main.
15. Recommended branches:
   feature/person-1-auth
   feature/person-2-did
   feature/person-3-rbac
   feature/person-4-assets
   feature/person-5-frontend
16. Merge feature branches into develop after review/tests.
17. main is reserved for stable releases.

REPOSITORY BASELINE
project/
├── backend/
├── blockchain/
├── frontend/
├── docs/
├── .env.example
├── README.md
└── PROJECT_SPEC.md

SHARED DATA CONCEPT
User:
- userId
- DID/reference
- publicKey/reference
- KYC status
- role

Asset:
- assetId
- assetType
- assetReference
- metadataReference
- nftTokenId
- ownerIdentityReference
- status

These are conceptual shared fields. Do not independently change them without team approval.

INTEGRATION PRINCIPLE
Person 1 owns KYC/authentication.
Person 2 owns DID/identity registry.
Person 3 owns RBAC/authorization.
Person 4 owns NFT/assets.
Person 5 owns frontend/integration.

All modules must expose documented interfaces so they can be integrated without inspecting or rewriting each other's implementation.

GIT WORKFLOW
- Pull latest develop before beginning work.
- Work only on your assigned feature branch.
- Make focused commits.
- Do not commit secrets or .env files containing real credentials.
- Before Pull Request: run tests, lint/build checks, and document changes.
- PR must state files changed, interfaces added/changed, tests run, and any integration dependencies.
- Never force-push or rewrite shared history without team agreement.

FINAL SYSTEM DEMONSTRATION
The integrated system should demonstrate:
1. User registration
2. KYC verification
3. Cryptographic identity creation/association
4. DID registration/verification
5. Cryptographic login
6. Role assignment
7. Authorized NFT minting
8. Asset allocation
9. Ownership verification
10. Authorized transfer
11. Unauthorized operations being rejected
12. Auditor viewing relevant history

SECURITY DEMONSTRATIONS
- Invalid login signature rejected
- Replayed/expired challenge rejected
- Unauthorized role assignment rejected
- Unauthorized NFT mint rejected
- Unauthorized asset allocation rejected
- Unauthorized NFT transfer rejected
- Sensitive KYC data never appears on-chain
- Private key never reaches backend
