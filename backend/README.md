# SecureMAX Backend: KYC & Cryptographic Authentication (Person 1)

Node.js + Express + TypeScript service handling off-chain KYC verification, client-side challenge generation, cryptographic signature validation, and session token issuance.

---

## Architecture & Zero-PII Enforcements

1. **Off-Chain KYC Storage**: Personal Identifiable Information (PII) such as full legal names, emails, phones, and government ID numbers remain strictly in the backend database. They are **never** put on-chain.
2. **No Private Keys Stored**: Private keys are generated and held on the client-side. The backend only stores public keys and verifies messages signed by client addresses.
3. **Replay & Expiry Protection**: Challenges are one-time-use nonces with a 5-minute expiration timestamp.

---

## API Endpoints

- `POST /api/kyc/register`: Register off-chain KYC details and bind DID / public key.
- `GET /api/kyc/status/:did`: Retrieve off-chain KYC verification status.
- `POST /api/auth/challenge`: Generate an ephemeral cryptographic challenge.
- `POST /api/auth/verify`: Verify ECDSA signature and issue JWT session token.
- `GET /api/auth/me`: Protected user profile endpoint.
