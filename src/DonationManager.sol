// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICampaignRegistry} from "./interfaces/ICampaignRegistry.sol";
import {IProofNFT} from "./interfaces/IProofNFT.sol";
import {IHederaConsensusService} from "./interfaces/IHederaConsensusService.sol";
import {Errors} from "./Errors.sol";

contract DonationManager is Ownable, ReentrancyGuard {
    uint256 private constant MAX_BPS = 10000;
    address public immutable HCS_PRECOMPILE = address(0x169);

    struct Donation {
        address donor;
        uint256 campaignId;
        uint256 amount;
        uint256 timestamp;
        uint256 nftSerialNumber;
    }

    mapping(uint256 => Donation) private donations;
    mapping(uint256 => uint256[]) private donationsByCampaign;
    mapping(address => uint256[]) private donationsByDonor;
    uint256 private donationCount;

    ICampaignRegistry public immutable CAMPAIGN_REGISTRY;
    IProofNFT public immutable PROOF_NFT;
    address public platformWallet;
    address public hcsTopicId;

    event DonationMade(
        address indexed donor,
        uint256 indexed campaignId,
        uint256 totalAmount,
        uint256 ngoAmount,
        uint256 designerAmount,
        uint256 platformAmount,
        address indexed ngoRecipient,
        address designerRecipient,
        address platformRecipient,
        uint256 nftSerialNumber
    );
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event HCSTopicIdSet(address indexed topicId);
    event HCSLoggingDisabled();

    error TransferFailed(address recipient, uint256 amount);
    error HCSCallFailed(int64 responseCode);

    constructor(
        address initialOwner,
        address _campaignRegistry,
        address _proofNFT,
        address _platformWallet
    ) Ownable(initialOwner) {
        if (_campaignRegistry == address(0)) revert Errors.InvalidAddress(_campaignRegistry);
        if (_proofNFT == address(0)) revert Errors.InvalidAddress(_proofNFT);
        if (_platformWallet == address(0)) revert Errors.InvalidAddress(_platformWallet);

        CAMPAIGN_REGISTRY = ICampaignRegistry(_campaignRegistry);
        PROOF_NFT = IProofNFT(_proofNFT);
        platformWallet = payable(_platformWallet);
    }

    function donate(uint256 campaignId, string calldata metadataHash) external payable nonReentrant returns (uint256) {
        if (msg.value == 0) revert Errors.ZeroAmount();

        (
            address ngo,
            address designer,
            uint256 ngoShareBps,
            uint256 designerShareBps,
            uint256 platformShareBps,
            bool active
        ) = CAMPAIGN_REGISTRY.getCampaign(campaignId);
        platformShareBps;

        if (!active) revert Errors.InactiveCampaign(campaignId);

        uint256 ngoAmount = (msg.value * ngoShareBps) / MAX_BPS;
        uint256 designerAmount = (msg.value * designerShareBps) / MAX_BPS;
        uint256 platformAmount = msg.value - ngoAmount - designerAmount;

        _transferHbar(payable(ngo), ngoAmount);
        _transferHbar(payable(designer), designerAmount);
        _transferHbar(payable(platformWallet), platformAmount);

        uint256 nftSerialNumber = PROOF_NFT.mintDonationNFT(
            msg.sender,
            campaignId,
            msg.value,
            metadataHash
        );

        Donation memory donation = Donation({
            donor: msg.sender,
            campaignId: campaignId,
            amount: msg.value,
            timestamp: block.timestamp,
            nftSerialNumber: nftSerialNumber
        });

        donations[donationCount] = donation;
        donationsByCampaign[campaignId].push(donationCount);
        donationsByDonor[msg.sender].push(donationCount);
        donationCount++;

        if (hcsTopicId != address(0)) {
            _logToHCS(msg.sender, campaignId, msg.value, nftSerialNumber);
        }

        emit DonationMade(
            msg.sender,
            campaignId,
            msg.value,
            ngoAmount,
            designerAmount,
            platformAmount,
            ngo,
            designer,
            platformWallet,
            nftSerialNumber
        );

        return nftSerialNumber;
    }

    function updatePlatformWallet(address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert Errors.InvalidAddress(newWallet);
        address oldWallet = platformWallet;
        platformWallet = payable(newWallet);
        emit PlatformWalletUpdated(oldWallet, newWallet);
    }

    function setHcsTopicId(address topicId) external onlyOwner {
        hcsTopicId = topicId;
        emit HCSTopicIdSet(topicId);
    }

    function disableHCSLogging() external onlyOwner {
        hcsTopicId = address(0);
        emit HCSLoggingDisabled();
    }

    function _transferHbar(address payable recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed(recipient, amount);
    }

    function _logToHCS(
        address donor,
        uint256 campaignId,
        uint256 amount,
        uint256 serialNumber
    ) private {
        bytes memory logData = abi.encode(
            blockhash(block.number - 1),
            donor,
            campaignId,
            amount,
            block.timestamp,
            serialNumber
        );

        IHederaConsensusService hcs = IHederaConsensusService(HCS_PRECOMPILE);
        int64 responseCode = hcs.submitMessage(hcsTopicId, logData);
        if (responseCode != 22) revert HCSCallFailed(responseCode);
    }

    function getDonationsByCampaign(uint256 campaignId) external view returns (
        address[] memory donors,
        uint256[] memory amounts,
        uint256[] memory timestamps,
        uint256[] memory nftSerialNumbers
    ) {
        uint256[] memory donationIds = donationsByCampaign[campaignId];
        uint256 length = donationIds.length;
        
        donors = new address[](length);
        amounts = new uint256[](length);
        timestamps = new uint256[](length);
        nftSerialNumbers = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            Donation memory donation = donations[donationIds[i]];
            donors[i] = donation.donor;
            amounts[i] = donation.amount;
            timestamps[i] = donation.timestamp;
            nftSerialNumbers[i] = donation.nftSerialNumber;
        }
    }

    function getDonationsByDonor(address donor) external view returns (
        uint256[] memory campaignIds,
        uint256[] memory amounts,
        uint256[] memory timestamps,
        uint256[] memory nftSerialNumbers
    ) {
        uint256[] memory donationIds = donationsByDonor[donor];
        uint256 length = donationIds.length;
        
        campaignIds = new uint256[](length);
        amounts = new uint256[](length);
        timestamps = new uint256[](length);
        nftSerialNumbers = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            Donation memory donation = donations[donationIds[i]];
            campaignIds[i] = donation.campaignId;
            amounts[i] = donation.amount;
            timestamps[i] = donation.timestamp;
            nftSerialNumbers[i] = donation.nftSerialNumber;
        }
    }
}

