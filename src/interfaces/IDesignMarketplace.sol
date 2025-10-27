// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IDesignMarketplace {
    function getDesign(uint256 designId)
        external
        view
        returns (address designer, uint256 campaignId, string memory designName, uint256 price, bool active);
}
