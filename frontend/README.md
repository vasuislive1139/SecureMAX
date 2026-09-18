# SecureMAX Frontend & System Integration (Person 5)

React 18 + Vite + TypeScript + Tailwind CSS single-page application implementing the cryptographic identity, role-based dashboards, and NFT asset custody interface.

---

## Key Highlights & Security Rules

1. **NO MetaMask**: Implements client-side cryptographic authentication using Web Crypto API and local ECDSA keypair signing.
2. **Private Key Protection**: Private keys are generated and held strictly in client-side memory. Raw private keys are **NEVER** sent to the backend.
3. **Zero-Trust Frontend**: Frontend checks are for UI/UX flow only. Actual authorization is strictly enforced by Person 1's backend and Person 2, 3, 4's smart contracts.

---

## Pages Implemented

| Page | Path / State | Description |
| :--- | :--- | :--- |
| **Registration / KYC** | `register` | Off-chain KYC registration form and client-side cryptographic keypair generator. |
| **Crypto Login** | `login` | Ephemeral challenge request, local private-key signature, and authentication submission. |
| **User Dashboard** | `dashboard` | View DID, identity status, and allocated NFT assets with metadata. |
| **Admin Dashboard** | `admin-dashboard` | Manage registered identities, assign RBAC roles, mint organizational NFTs, and allocate custody. |
| **Manager Dashboard** | `manager-dashboard` | Manage organizational inventory, transfer custody, and toggle maintenance states. |
| **Auditor Dashboard** | `auditor-dashboard` | Read-only timeline and search for all identity, RBAC, and NFT blockchain events. |

---

## Running the Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit and UI tests
npm test

# Build for production
npm run build
```
