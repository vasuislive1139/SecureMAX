// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRBACRegistry
 * @notice Standard interface consumed from Person 3 (RBAC Engineer).
 * @dev Person 4 consumes this interface to check role permissions on asset operations.
 */
interface IRBACRegistry {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function isAdmin(address account) external view returns (bool);
    function isManager(address account) external view returns (bool);
    function isAuditor(address account) external view returns (bool);
    function ADMIN_ROLE() external view returns (bytes32);
    function MANAGER_ROLE() external view returns (bytes32);
    function AUDITOR_ROLE() external view returns (bytes32);
    function USER_ROLE() external view returns (bytes32);
}
