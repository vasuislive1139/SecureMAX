// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityRegistry {
    function isIdentityRegistered(address controller) external view returns (bool);
    function isIdentityActive(address controller) external view returns (bool);
    function getDidByController(address controller) external view returns (string memory);
}
