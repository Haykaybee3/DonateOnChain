// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ICampaignRegistry {
    function getCampaign(uint256 campaignId) external view returns (
        address ngo,
        address designer,
        uint256 ngoShareBps,
        uint256 designerShareBps,
        uint256 platformShareBps,
        bool active
    );
}

