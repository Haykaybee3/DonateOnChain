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

    /// @notice Emitted after a successful donation and fund split.
    /// @param donor Donor address
    /// @param campaignId Campaign ID
    /// @param totalAmount Amount donated
    /// @param ngoAmount NGO allocation
    /// @param designerAmount Designer allocation
    /// @param platformAmount Platform allocation
    /// @param ngoRecipient NGO recipient
    /// @param designerRecipient Designer recipient
    /// @param platformRecipient Platform wallet
    /// @param nftSerialNumber NFT proof
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

    /// @notice Constructor sets main immutable dependencies and platform wallet
    /// @param initialOwner Owner (admin) address
    /// @param _campaignRegistry Address of campaign registry contract
    /// @param _proofNFT Address of proof NFT contract
    /// @param _platformWallet Platform fee recipient address
    constructor(address initialOwner, address _campaignRegistry, address _proofNFT, address _platformWallet)
        Ownable(initialOwner)
    {
        if (_campaignRegistry == address(0)) revert Errors.InvalidAddress(_campaignRegistry);
        if (_proofNFT == address(0)) revert Errors.InvalidAddress(_proofNFT);
        if (_platformWallet == address(0)) revert Errors.InvalidAddress(_platformWallet);

        CAMPAIGN_REGISTRY = ICampaignRegistry(_campaignRegistry);
        PROOF_NFT = IProofNFT(_proofNFT);
        platformWallet = payable(_platformWallet);
    }

    /// @notice Donate HBAR to a campaign and receive NFT proof.
    /// @dev Emits DonationMade. Splits value among NGO, designer, platform. Reverts on inactive, missing, or zero donation.
    /// @param campaignId Target campaign
    /// @param metadataHash Off-chain (IPFS) metadata hash (string)
    /// @return nftSerialNumber Serial number of NFT proof minted
    function donate(uint256 campaignId, string calldata metadataHash) external payable nonReentrant returns (uint256) {
        uint256 value = msg.value;
        if (value == 0) revert Errors.ZeroAmount();

        (
            address ngo,
            address designer,
            uint256 ngoShareBps,
            uint256 designerShareBps,
            ,
            bool active
        ) = CAMPAIGN_REGISTRY.getCampaign(campaignId);
        if (ngo == address(0) || designer == address(0)) revert Errors.CampaignNotFound(campaignId);

        if (!active) revert Errors.InactiveCampaign(campaignId);

        uint256 ngoAmount = (value * ngoShareBps) / MAX_BPS;
        uint256 designerAmount = (value * designerShareBps) / MAX_BPS;
        uint256 platformAmount = value - ngoAmount - designerAmount;

        _transferHbar(payable(ngo), ngoAmount);
        _transferHbar(payable(designer), designerAmount);
        _transferHbar(payable(platformWallet), platformAmount);

        uint256 nftSerialNumber = PROOF_NFT.mintDonationNFT(msg.sender, campaignId, value, metadataHash);

        Donation memory donation = Donation({
            donor: msg.sender,
            campaignId: campaignId,
            amount: value,
            timestamp: block.timestamp,
            nftSerialNumber: nftSerialNumber
        });

        donations[donationCount] = donation;
        donationsByCampaign[campaignId].push(donationCount);
        donationsByDonor[msg.sender].push(donationCount);
        donationCount++;

        if (hcsTopicId != address(0)) {
            _logToHCS(msg.sender, campaignId, value, nftSerialNumber);
        }

        emit DonationMade(
            msg.sender,
            campaignId,
            value,
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

    /// @notice Change the wallet address that receives platform fees
    /// @param newWallet The new platform wallet address
    function updatePlatformWallet(address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert Errors.InvalidAddress(newWallet);
        address oldWallet = platformWallet;
        platformWallet = payable(newWallet);
        emit PlatformWalletUpdated(oldWallet, newWallet);
    }

    /// @notice Set Hedera Consensus Service topic id for logging donations
    /// @param topicId HCS topic (precompiled contract)
    function setHcsTopicId(address topicId) external onlyOwner {
        hcsTopicId = topicId;
        emit HCSTopicIdSet(topicId);
    }

    /// @notice Disable HCS logging entirely
    function disableHCSLogging() external onlyOwner {
        hcsTopicId = address(0);
        emit HCSLoggingDisabled();
    }

    function _transferHbar(address payable recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed(recipient, amount);
    }

    function _logToHCS(address donor, uint256 campaignId, uint256 amount, uint256 serialNumber) private {
        bytes memory logData =
            abi.encode(blockhash(block.number - 1), donor, campaignId, amount, block.timestamp, serialNumber);

        IHederaConsensusService hcs = IHederaConsensusService(HCS_PRECOMPILE);
        int64 responseCode = hcs.submitMessage(hcsTopicId, logData);
        if (responseCode != 22) revert HCSCallFailed(responseCode);
    }

    /// @notice Get all donations made to a given campaign
    /// @param campaignId The campaign id
    /// @return donors Donor addresses
    /// @return amounts Amount donated per donor
    /// @return timestamps When each donation occurred
    /// @return nftSerialNumbers NFT proof serial for each donation
    function getDonationsByCampaign(uint256 campaignId)
        external
        view
        returns (
            address[] memory donors,
            uint256[] memory amounts,
            uint256[] memory timestamps,
            uint256[] memory nftSerialNumbers
        )
    {
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

    /// @notice Get all donations made by a particular donor
    /// @param donor The donor address
    /// @return campaignIds Array of campaign ids
    /// @return amounts Array of amounts
    /// @return timestamps Donation times
    /// @return nftSerialNumbers NFT proof serials
    function getDonationsByDonor(address donor)
        external
        view
        returns (
            uint256[] memory campaignIds,
            uint256[] memory amounts,
            uint256[] memory timestamps,
            uint256[] memory nftSerialNumbers
        )
    {
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
