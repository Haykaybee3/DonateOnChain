// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IAdminRegistry {
    function isAdmin(address user) external view returns (bool);
}
