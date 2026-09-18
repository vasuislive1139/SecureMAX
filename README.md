# SecureMax Platform

Blockchain-Based Decentralized Identity, RBAC, and NFT Asset Ownership Platform.

## Overview
This is a beginner-friendly but security-conscious blockchain platform that combines:
1. KYC-based real-world user verification
2. Custom cryptographic authentication/login
3. Decentralized Identity (DID)
4. Role-Based Access Control (RBAC)
5. NFT-based asset ownership
6. Smart-contract authorization
7. Blockchain-based audit/history

Please refer to `PROJECT_SPEC.md` for full project specifications, architecture rules, and team conventions.

## Project Structure
- `backend/` - Node.js + Express.js backend (handles KYC off-chain, interfaces with DB).
- `blockchain/` - Hardhat environment, Solidity smart contracts.
- `frontend/` - React frontend (handles cryptographic login, web crypto APIs).
- `docs/` - Documentation.
