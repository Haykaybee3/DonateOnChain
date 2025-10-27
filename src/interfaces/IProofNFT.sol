// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IProofNFT {
    function mintDonationNFT(address donor, uint256 campaignId, uint256 amount, string memory metadataHash)
        external
        returns (uint256);
}
