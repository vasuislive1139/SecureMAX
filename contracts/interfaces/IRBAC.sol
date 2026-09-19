// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRBAC
 * @dev Interface for the RBAC (Role-Based Access Control) system managed by Person 3.
 * Person 4 (Assets/NFT) consumes this interface to authorize sensitive operations.
 */
interface IRBAC {
    /**
     * @dev Checks if an account has a specific role.
     * @param role The bytes32 identifier of the role.
     * @param account The address to check.
     * @return bool True if the account has the role, false otherwise.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);
}
