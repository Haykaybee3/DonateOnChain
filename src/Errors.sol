// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library Errors {
    error InvalidSplitRatio(uint256 total);
    error ZeroAmount();
    error CauseNotFound(bytes32 causeId);
    error InactiveCause(bytes32 causeId);
    error TransferFailed(address recipient, uint256 amount);
    error Unauthorized(address caller);
    error InvalidAddress(address addr);
    error HTSCallFailed();
    error HCSCallFailed();
    error NotAdmin(address caller);
    error NGONotFound(address ngo);
    error DesignerNotFound(address designer);
    error CampaignNotFound(uint256 campaignId);
    error InvalidBPSSplit(uint256 ngoBps, uint256 designerBps, uint256 platformBps);
    error FileNotStored(bytes32 fileHash);
    error EmptyCID();
    error NotDonationManager(address caller);
    error InvalidTokenId(address tokenId);
    error UnauthorizedMinter(address caller);
    error MintFailed(int64 responseCode);
    error EmptyMetadata();
    error InactiveCampaign(uint256 campaignId);
    error DesignNotFound(uint256 designId);
    error InsufficientPayment(uint256 required, uint256 provided);
    error DesignNotActive(uint256 designId);
    error NotDesignOwner(address caller);
    error NGOPending(address ngo);
    error DesignerPending(address designer);
    error InvalidPrice(uint256 price);
    error CampaignTargetReached(uint256 campaignId);
    error NGONotPending(address ngo);
    error DesignerNotPending(address designer);
    error NGOAlreadyRegistered(address ngo);
    error DesignerAlreadyRegistered(address designer);
    error NotVerifiedDesigner(address designer);
}
