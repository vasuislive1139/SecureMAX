// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IRBACRegistry.sol";

/**
 * @title AccessControlManager
 * @author Person 3 (RBAC & Smart-Contract Authorization Engineer)
 * @notice Central on-chain Role-Based Access Control (RBAC) registry.
 * @dev Enforces role verification on-chain for the SecureMAX decentralized platform.
 * 
 * FRONTEND CHECKS ARE NOT SECURITY.
 * Blockchain authorization is strictly enforced by smart contract state and function modifiers.
 * 
 * ROLES SUPPORTED:
 * 1. ADMIN   - Full governance, role assignment/revocation, emergency controls.
 * 2. MANAGER - Authorized asset minting, inventory allocation, and status management.
 * 3. AUDITOR - Read-only compliance inspection, event verification, and audit trail analysis.
 * 4. USER    - Verified individual custodian authorized for personal asset interactions.
 */
contract AccessControlManager is AccessControlEnumerable, Pausable, IRBACRegistry {
    // -------------------------------------------------------------------------
    // ROLE IDENTIFIERS
    // -------------------------------------------------------------------------
    bytes32 public constant override ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant override MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant override AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant override USER_ROLE = keccak256("USER_ROLE");

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------------------

    error InvalidAccountAddress();
    error InvalidRoleIdentifier(bytes32 role);
    error AccountAlreadyHasRole(bytes32 role, address account);
    error AccountDoesNotHaveRole(bytes32 role, address account);
    error CannotRevokeLastAdmin();
    error UnauthorizedAdminAction(address caller);

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    /**
     * @notice Initializes the Access Control Manager contract.
     * @param initialAdmin Address of the initial system administrator.
     */
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) {
            revert InvalidAccountAddress();
        }

        // Configure DEFAULT_ADMIN_ROLE as the admin for all defined roles
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(USER_ROLE, ADMIN_ROLE);

        // Grant initial administrator credentials
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ADMIN_ROLE, initialAdmin);
    }

    // -------------------------------------------------------------------------
    // ROLE MANAGEMENT (ADMIN ONLY)
    // -------------------------------------------------------------------------

    /**
     * @notice Assigns a specific role to an account.
     * @dev Restricted to ADMIN role.
     * @param role The role identifier (ADMIN_ROLE, MANAGER_ROLE, AUDITOR_ROLE, USER_ROLE)
     * @param account Target account address
     */
    function assignRole(bytes32 role, address account) external whenNotPaused {
        if (!_isAdmin(msg.sender)) {
            revert UnauthorizedAdminAction(msg.sender);
        }
        if (account == address(0)) {
            revert InvalidAccountAddress();
        }
        if (!_isValidRole(role)) {
            revert InvalidRoleIdentifier(role);
        }
        if (hasRole(role, account)) {
            revert AccountAlreadyHasRole(role, account);
        }

        _grantRole(role, account);

        if (role == ADMIN_ROLE && !hasRole(DEFAULT_ADMIN_ROLE, account)) {
            _grantRole(DEFAULT_ADMIN_ROLE, account);
        }

        emit RoleAssignmentLogged(role, account, msg.sender, block.timestamp);
    }

    /**
     * @notice Revokes a specific role from an account.
     * @dev Overrides OpenZeppelin revokeRole with admin lockout protection.
     * @param role The role identifier
     * @param account Target account address
     */
    function revokeRole(
        bytes32 role,
        address account
    ) public virtual override(AccessControl, IAccessControl) whenNotPaused {
        if (!_isAdmin(msg.sender)) {
            revert UnauthorizedAdminAction(msg.sender);
        }
        if (account == address(0)) {
            revert InvalidAccountAddress();
        }
        if (!_isValidRole(role)) {
            revert InvalidRoleIdentifier(role);
        }
        if (!hasRole(role, account)) {
            revert AccountDoesNotHaveRole(role, account);
        }

        // Admin lockout protection
        if (role == ADMIN_ROLE || role == DEFAULT_ADMIN_ROLE) {
            if (getRoleMemberCount(ADMIN_ROLE) <= 1) {
                revert CannotRevokeLastAdmin();
            }
        }

        _revokeRole(role, account);

        if (role == ADMIN_ROLE && hasRole(DEFAULT_ADMIN_ROLE, account)) {
            _revokeRole(DEFAULT_ADMIN_ROLE, account);
        }

        emit RoleRevocationLogged(role, account, msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // VIEW & ROLE CHECK INTERFACE (CONSUMED BY PERSON 4 & PERSON 5)
    // -------------------------------------------------------------------------

    /**
     * @notice Checks whether an account has a specific role.
     */
    function hasRole(
        bytes32 role,
        address account
    ) public view virtual override(AccessControl, IAccessControl, IRBACRegistry) returns (bool) {
        return super.hasRole(role, account);
    }

    /**
     * @notice Checks if an account has the ADMIN role.
     * @param account Address to inspect
     * @return bool True if account is an active administrator
     */
    function isAdmin(address account) public view override returns (bool) {
        return hasRole(ADMIN_ROLE, account) || hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /**
     * @notice Checks if an account has the MANAGER role.
     * @param account Address to inspect
     * @return bool True if account is an active manager
     */
    function isManager(address account) external view override returns (bool) {
        return hasRole(MANAGER_ROLE, account);
    }

    /**
     * @notice Checks if an account has the AUDITOR role.
     * @param account Address to inspect
     * @return bool True if account is an active auditor
     */
    function isAuditor(address account) external view override returns (bool) {
        return hasRole(AUDITOR_ROLE, account);
    }

    /**
     * @notice Checks if an account has the USER role.
     * @param account Address to inspect
     * @return bool True if account is an active registered user
     */
    function isUser(address account) external view returns (bool) {
        return hasRole(USER_ROLE, account);
    }

    /**
     * @notice Returns all active roles assigned to an account.
     * @param account Target account address
     * @return roles Array of bytes32 role identifiers held by account
     */
    function getUserRoles(address account) external view returns (bytes32[] memory roles) {
        bytes32[4] memory allRoles = [ADMIN_ROLE, MANAGER_ROLE, AUDITOR_ROLE, USER_ROLE];
        uint256 count = 0;

        for (uint256 i = 0; i < 4; i++) {
            if (hasRole(allRoles[i], account)) {
                count++;
            }
        }

        roles = new bytes32[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (hasRole(allRoles[i], account)) {
                roles[idx++] = allRoles[i];
            }
        }
    }

    /**
     * @notice Validates whether a bytes32 identifier is an official system role.
     * @param role The identifier to test
     * @return bool True if valid system role
     */
    function isValidRole(bytes32 role) external pure returns (bool) {
        return _isValidRole(role);
    }

    // -------------------------------------------------------------------------
    // EMERGENCY PAUSE CONTROLS
    // -------------------------------------------------------------------------

    /**
     * @notice Pauses role modifications during emergency or audit lock.
     * @dev Restricted to ADMIN role.
     */
    function pause() external {
        if (!_isAdmin(msg.sender)) {
            revert UnauthorizedAdminAction(msg.sender);
        }
        _pause();
    }

    /**
     * @notice Unpauses role modifications.
     * @dev Restricted to ADMIN role.
     */
    function unpause() external {
        if (!_isAdmin(msg.sender)) {
            revert UnauthorizedAdminAction(msg.sender);
        }
        _unpause();
    }

    // -------------------------------------------------------------------------
    // INTERNAL HELPERS
    // -------------------------------------------------------------------------

    function _isAdmin(address account) internal view returns (bool) {
        return hasRole(ADMIN_ROLE, account) || hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    function _isValidRole(bytes32 role) internal pure returns (bool) {
        return (role == ADMIN_ROLE ||
            role == MANAGER_ROLE ||
            role == AUDITOR_ROLE ||
            role == USER_ROLE ||
            role == DEFAULT_ADMIN_ROLE);
    }
}
