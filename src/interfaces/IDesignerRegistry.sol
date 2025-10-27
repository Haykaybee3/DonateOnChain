// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IDesignerRegistry {
    function isVerifiedDesigner(address designer) external view returns (bool);
    function getDesignerWallet(address designer) external view returns (address);
}
