# Backend Integration Guide (Person 1 — KYC & Authentication)

**Module**: Person 1 — KYC + Cryptographic Authentication Engineer  
**Framework**: Node.js, Express.js, TypeScript, ethers.js, jsonwebtoken, Zod  
**Status**: Implemented, Built, Tested, and Verified

---

## 1. Provided Endpoints

### 1.1 `POST /api/kyc/register`
**Request Body**:
```json
{
  "fullName": "Alice Smith",
  "email": "alice@securemax.org",
  "phone": "+919876543210",
  "documentType": "NATIONAL_ID",
  "documentNumber": "GOV-123456",
  "publicKey": "0x04bfcad8...",
  "controllerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "did": "did:assetchain:usr-alice"
}
```

### 1.2 `POST /api/auth/challenge`
**Request Body**: `{ "did": "did:assetchain:usr-alice" }`  
**Response**:
```json
{
  "success": true,
  "data": {
    "challengeId": "ch_7a8b9c...",
    "challengeText": "SecureMAX Cryptographic Login Challenge\nDID: did:assetchain:usr-alice\n...",
    "expiresAt": 1758213000000
  }
}
```

### 1.3 `POST /api/auth/verify`
**Request Body**:
```json
{
  "did": "did:assetchain:usr-alice",
  "challengeId": "ch_7a8b9c...",
  "signature": "0x4f8a..."
}
```
**Response**:
```json
{
  "success": true,
  "message": "Cryptographic authentication successful.",
  "data": {
    "user": { "did": "...", "role": "USER", "controllerAddress": "..." },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
