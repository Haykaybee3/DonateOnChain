// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface INGORegistry {
    function isVerifiedNGO(address ngo) external view returns (bool);
    function getNGOWallet(address ngo) external view returns (address);
}

