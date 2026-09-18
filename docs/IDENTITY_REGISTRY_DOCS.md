# Identity Registry Smart Contract Documentation

**Contract Name**: `IdentityRegistry`  
**Solidity Version**: `0.8.20`  
**License**: `MIT`  
**File Location**: `blockchain/contracts/identity/IdentityRegistry.sol` (and `blockchain/identity/IdentityRegistry.sol`)

---

## 1. Roles & Permissions

| Role | Identifier | Purpose |
| :--- | :--- | :--- |
| `DEFAULT_ADMIN_ROLE` | `0x00...00` | Contract governance, emergency pause/unpause, registrar management |
| `REGISTRAR_ROLE` | `keccak256("REGISTRAR_ROLE")` | Authorized to register new verified identities on-chain after off-chain KYC |
| `Controller` (Address) | Address in `IdentityRecord` | Authorized to self-suspend, self-revoke, rotate own public key, and transfer controller |

---

## 2. Functions Reference

### 2.1 State-Changing Functions

#### `registerIdentity(string calldata did, bytes calldata publicKey, address controller)`
- **Access**: `REGISTRAR_ROLE` only.
- **Description**: Registers a new DID, associates it with a public key and controller address, sets status to `Active`.
- **Requirements**:
  - `did` must start with `did:assetchain:` and have length between 16 and 128 characters.
  - `publicKey` must be non-empty (max 512 bytes).
  - `controller` must not be `address(0)`.
  - `did` must not already be registered.
  - `controller` must not already be bound to an existing DID.
- **Emits**: `IdentityRegistered`

#### `updateIdentityStatus(string calldata did, IdentityStatus newStatus)`
- **Access**: `REGISTRAR_ROLE`, `DEFAULT_ADMIN_ROLE`, or the identity's `controller`.
- **Description**: Transitions identity status between `Active`, `Suspended`, and `Revoked`.
- **Restrictions**:
  - `Revoked` is a terminal state (cannot transition away from Revoked).
  - Controller accounts can only suspend or revoke their own identity; they cannot self-reactivate without registrar verification.
- **Emits**: `IdentityStatusUpdated`

#### `updatePublicKey(string calldata did, bytes calldata newPublicKey)`
- **Access**: Identity `controller`, `REGISTRAR_ROLE`, or `DEFAULT_ADMIN_ROLE`.
- **Description**: Replaces the public key for an active identity.
- **Restrictions**: Identity status MUST be `Active`.
- **Emits**: `PublicKeyUpdated`

#### `updateController(string calldata did, address newController)`
- **Access**: Identity `controller` or `DEFAULT_ADMIN_ROLE`.
- **Description**: Migrates DID management to a new controller address. Updates 1-to-1 reverse mapping.
- **Restrictions**: `newController` must not be zero or already bound to another DID.
- **Emits**: `ControllerUpdated`

#### `pause()` / `unpause()`
- **Access**: `DEFAULT_ADMIN_ROLE` only.
- **Description**: Circuit breaker to halt/resume state-modifying operations during maintenance or incident response.

---

### 2.2 View / Query Functions

#### `getIdentity(string calldata did)`
- **Returns**: `IdentityRecord(did, publicKey, controller, status, registeredAt, updatedAt)`
- **Reverts**: `IdentityNotFound` if identity does not exist.

#### `getDidByController(address controller)`
- **Returns**: `string memory did`
- **Reverts**: `IdentityNotFound` if address is not registered.

#### `getPublicKey(string calldata did)`
- **Returns**: `bytes memory publicKey`
- **Reverts**: `IdentityNotFound` if identity does not exist.

#### `getIdentityStatus(string calldata did)`
- **Returns**: `IdentityStatus` (0 = None, 1 = Active, 2 = Suspended, 3 = Revoked)

#### `isIdentityRegistered(string calldata did)`
- **Returns**: `bool` (true if status != None)

#### `isIdentityActive(string calldata did)`
- **Returns**: `bool` (true if status == Active)

---

## 3. Events

```solidity
event IdentityRegistered(
    string indexed didIndex,
    string did,
    address indexed controller,
    bytes publicKey,
    uint256 timestamp
);

event IdentityStatusUpdated(
    string indexed didIndex,
    string did,
    IdentityStatus previousStatus,
    IdentityStatus newStatus,
    address indexed updatedBy,
    uint256 timestamp
);

event PublicKeyUpdated(
    string indexed didIndex,
    string did,
    bytes oldPublicKey,
    bytes newPublicKey,
    address indexed updatedBy,
    uint256 timestamp
);

event ControllerUpdated(
    string indexed didIndex,
    string did,
    address indexed previousController,
    address indexed newController,
    uint256 timestamp
);
```

---

## 4. Custom Errors

- `InvalidDID(string reason)`: Invalid DID syntax, prefix, or length.
- `InvalidPublicKey()`: Empty or oversized public key buffer.
- `InvalidControllerAddress()`: Zero address or redundant assignment.
- `IdentityAlreadyExists(string did)`: Duplicate DID registration attempt.
- `ControllerAlreadyBound(address controller, string existingDid)`: Controller already represents another DID.
- `IdentityNotFound(string did)`: Queried DID does not exist on-chain.
- `IdentityIsRevoked(string did)`: Attempted modification on a permanently revoked identity.
- `IdentityNotActive(string did)`: Action requires `Active` status, but identity is Suspended/Revoked.
- `UnauthorizedCaller(address caller)`: Caller lacks required controller or admin permissions.
- `InvalidStatusTransition(IdentityStatus currentStatus, IdentityStatus newStatus)`: Forbidden status state transition.
