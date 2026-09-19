# AccessControlManager Smart Contract Documentation

**Contract Name**: `AccessControlManager`  
**Base**: OpenZeppelin `AccessControlEnumerable`, `Pausable`  
**Interface Implemented**: `IRBACRegistry`  
**Solidity Version**: `^0.8.20`  
**License**: `MIT`  
**File Location**: `blockchain/contracts/access-control/AccessControlManager.sol` (and `blockchain/access-control/AccessControlManager.sol`)

---

## 1. Constants & Role Identifiers

```solidity
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
bytes32 public constant USER_ROLE = keccak256("USER_ROLE");
```

---

## 2. Functions Reference

### 2.1 State-Changing Functions

#### `assignRole(bytes32 role, address account)`
- **Access**: `ADMIN_ROLE` only.
- **Description**: Grants an approved system role to `account`.
- **Errors**: `UnauthorizedAdminAction`, `InvalidAccountAddress`, `InvalidRoleIdentifier`, `AccountAlreadyHasRole`.
- **Emits**: `RoleAssignmentLogged`

#### `revokeRole(bytes32 role, address account)`
- **Access**: `ADMIN_ROLE` only.
- **Description**: Removes an assigned role from `account`. Protects against revoking the last remaining Admin.
- **Errors**: `UnauthorizedAdminAction`, `InvalidAccountAddress`, `InvalidRoleIdentifier`, `AccountDoesNotHaveRole`, `CannotRevokeLastAdmin`.
- **Emits**: `RoleRevocationLogged`

#### `pause()` / `unpause()`
- **Access**: `ADMIN_ROLE` only.
- **Description**: Circuit breaker to pause/unpause role modifications.

---

### 2.2 View / Query Functions

#### `hasRole(bytes32 role, address account)` → `bool`
- Standard OpenZeppelin check returning true if account holds the role.

#### `isAdmin(address account)` → `bool`
- Returns true if account holds `ADMIN_ROLE` or `DEFAULT_ADMIN_ROLE`.

#### `isManager(address account)` → `bool`
- Returns true if account holds `MANAGER_ROLE`.

#### `isAuditor(address account)` → `bool`
- Returns true if account holds `AUDITOR_ROLE`.

#### `isUser(address account)` → `bool`
- Returns true if account holds `USER_ROLE`.

#### `getUserRoles(address account)` → `bytes32[]`
- Returns a list of all active roles held by `account`.

#### `isValidRole(bytes32 role)` → `bool`
- Validates if a hash is one of the four defined platform roles.

---

## 3. Events

```solidity
event RoleAssignmentLogged(
    bytes32 indexed role,
    address indexed account,
    address indexed sender,
    uint256 timestamp
);

event RoleRevocationLogged(
    bytes32 indexed role,
    address indexed account,
    address indexed sender,
    uint256 timestamp
);
```

---

## 4. Custom Errors

- `InvalidAccountAddress()`: Target address is `address(0)`.
- `InvalidRoleIdentifier(bytes32 role)`: Role identifier does not match approved platform roles.
- `AccountAlreadyHasRole(bytes32 role, address account)`: Account already possesses the specified role.
- `AccountDoesNotHaveRole(bytes32 role, address account)`: Attempting to revoke a role not currently held.
- `CannotRevokeLastAdmin()`: Prevents revoking the sole remaining administrator (lockout protection).
- `UnauthorizedAdminAction(address caller)`: Non-admin caller attempted role mutation.
