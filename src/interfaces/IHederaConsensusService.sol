// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IHederaConsensusService {
    function submitMessage(address topicId, bytes calldata message) external returns (int64 responseCode);
}

