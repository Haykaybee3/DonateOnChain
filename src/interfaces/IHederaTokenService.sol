// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IHederaTokenService {
    struct KeyValue {
        string key;
        bytes value;
    }

    struct TokenCustomFees {
        int64[] fixedFees;
        int64[] fractionalFees;
        bytes[] royaltyFees;
    }

    function mintToken(
        address token,
        uint64 amount,
        bytes[] calldata metadata
    ) external returns (int64 responseCode, uint64 newTotalSupply, int64[] memory serialNumbers);
}

