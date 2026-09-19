// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRBAC.sol";

contract MockRBAC is IRBAC {
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
}
