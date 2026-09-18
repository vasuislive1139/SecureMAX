// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRBACRegistry.sol";

/**
 * @title MockRBACRegistry
 * @dev Mock implementation of IRBACRegistry used exclusively for unit testing AssetNFT.
 */
contract MockRBACRegistry is IRBACRegistry {
    bytes32 public constant override ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant override MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant override AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant override USER_ROLE = keccak256("USER_ROLE");

    mapping(bytes32 => mapping(address => bool)) private _roles;

    function grantRole(bytes32 role, address account) external {
        _roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) external {
        _roles[role][account] = false;
    }

    function hasRole(bytes32 role, address account) external view override returns (bool) {
        return _roles[role][account];
    }

    function isAdmin(address account) external view override returns (bool) {
        return _roles[ADMIN_ROLE][account];
    }

    function isManager(address account) external view override returns (bool) {
        return _roles[MANAGER_ROLE][account];
    }

    function isAuditor(address account) external view override returns (bool) {
        return _roles[AUDITOR_ROLE][account];
    }
}
