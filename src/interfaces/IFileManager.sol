// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IFileManager {
    function getIpfsCid(bytes32 fileHash) external view returns (string memory);
    function exists(bytes32 fileHash) external view returns (bool);
}
