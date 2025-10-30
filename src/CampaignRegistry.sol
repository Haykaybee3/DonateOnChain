// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAdminRegistry} from "./interfaces/IAdminRegistry.sol";
import {IFileManager} from "./interfaces/IFileManager.sol";
import {INGORegistry} from "./interfaces/INGORegistry.sol";
import {Errors} from "./Errors.sol";

contract CampaignRegistry is Ownable {
    uint256 private constant MAX_BPS = 10000;

    struct Campaign {
        address ngo;
        address designer;
        string title;
        string description;
        string imageHash;
        bytes32 metadataFileHash;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 ngoShareBps;
        uint256 designerShareBps;
        uint256 platformShareBps;
        bool active;
        uint256 createdAt;
    }

    mapping(uint256 => Campaign) private campaigns;
    mapping(address => uint256[]) private campaignsByNGO;
    uint256 public campaignCount;

    IAdminRegistry public immutable ADMIN_REGISTRY;
    IFileManager public immutable FILE_MANAGER;
    INGORegistry public immutable NGO_REGISTRY;

    /// @notice Emitted when a campaign is created
    /// @param campaignId id
    /// @param ngo Who
    /// @param designer Who
    /// @param ngoShareBps Split
    /// @param designerShareBps Split
    /// @param platformShareBps Split
    /// @param metadataFileHash hash
    /// @param createdBy Operator
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed ngo,
        address indexed designer,
        uint256 ngoShareBps,
        uint256 designerShareBps,
        uint256 platformShareBps,
        bytes32 metadataFileHash,
        address createdBy
    );
    event CampaignDeactivated(uint256 indexed campaignId, address indexed deactivatedBy);
    event CampaignUpdated(
        uint256 indexed campaignId, string title, string description, string imageHash, address indexed updatedBy
    );

    modifier onlyAdmin() {
        if (!ADMIN_REGISTRY.isAdmin(msg.sender)) revert Errors.NotAdmin(msg.sender);
        _;
    }

    /// @notice Constructor sets core dependencies for registry and roles
    /// @param initialOwner The owner/admin address
    /// @param _adminRegistry AdminRegistry address
    /// @param _fileManager FileManager address
    /// @param _ngoRegistry NGORegistry address
    constructor(address initialOwner, address _adminRegistry, address _fileManager, address _ngoRegistry)
        Ownable(initialOwner)
    {
        if (_adminRegistry == address(0)) revert Errors.InvalidAddress(_adminRegistry);
        if (_fileManager == address(0)) revert Errors.InvalidAddress(_fileManager);
        if (_ngoRegistry == address(0)) revert Errors.InvalidAddress(_ngoRegistry);

        ADMIN_REGISTRY = IAdminRegistry(_adminRegistry);
        FILE_MANAGER = IFileManager(_fileManager);
        NGO_REGISTRY = INGORegistry(_ngoRegistry);
    }

    /// @notice Create a campaign (admin only)
    /// @dev Validates BPS, file, nonzero, emits CampaignCreated
    /// @param ngo NGO
    /// @param designer Designer
    /// @param ngoShareBps % bps
    /// @param designerShareBps % bps
    /// @param platformShareBps % bps
    /// @param metadataFileHash File hash (IPFS)
    /// @return campaignId New campaign id
    function createCampaign(
        address ngo,
        address designer,
        uint256 ngoShareBps,
        uint256 designerShareBps,
        uint256 platformShareBps,
        bytes32 metadataFileHash
    ) external onlyAdmin returns (uint256) {
        if (ngo == address(0)) revert Errors.InvalidAddress(ngo);
        if (designer == address(0)) revert Errors.InvalidAddress(designer);
        uint256 totalBps = ngoShareBps + designerShareBps + platformShareBps;
        if (totalBps != MAX_BPS) {
            revert Errors.InvalidBPSSplit(ngoShareBps, designerShareBps, platformShareBps);
        }
        if (!FILE_MANAGER.exists(metadataFileHash)) {
            revert Errors.FileNotStored(metadataFileHash);
        }
        uint256 campaignId = campaignCount;
        campaigns[campaignId] = Campaign({
            ngo: ngo,
            designer: designer,
            title: "",
            description: "",
            imageHash: "",
            metadataFileHash: metadataFileHash,
            targetAmount: 0,
            currentAmount: 0,
            ngoShareBps: ngoShareBps,
            designerShareBps: designerShareBps,
            platformShareBps: platformShareBps,
            active: true,
            createdAt: block.timestamp
        });
        campaignCount++;
        emit CampaignCreated(
            campaignId, ngo, designer, ngoShareBps, designerShareBps, platformShareBps, metadataFileHash, msg.sender
        );
        return campaignId;
    }

    /// @notice Deactivate a campaign (admin only)
    /// @param campaignId Campaign id
    function deactivateCampaign(uint256 campaignId) external onlyAdmin {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.ngo == address(0)) revert Errors.CampaignNotFound(campaignId);

        campaign.active = false;
        emit CampaignDeactivated(campaignId, msg.sender);
    }

    /// @notice Get campaign shares and status
    /// @param campaignId Campaign id
    /// @return ngo NGO
    /// @return designer Designer
    /// @return ngoShareBps BPS
    /// @return designerShareBps BPS
    /// @return platformShareBps BPS
    /// @return active (is active)
    function getCampaign(uint256 campaignId)
        external
        view
        returns (
            address ngo,
            address designer,
            uint256 ngoShareBps,
            uint256 designerShareBps,
            uint256 platformShareBps,
            bool active
        )
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.ngo == address(0)) revert Errors.CampaignNotFound(campaignId);

        return (
            campaign.ngo,
            campaign.designer,
            campaign.ngoShareBps,
            campaign.designerShareBps,
            campaign.platformShareBps,
            campaign.active
        );
    }

    /// @notice Get campaign metadata CID by id
    /// @param campaignId Campaign id
    /// @return IPFS CID string
    function getCampaignMetadataCid(uint256 campaignId) external view returns (string memory) {
        bytes32 fileHash = campaigns[campaignId].metadataFileHash;
        if (fileHash == bytes32(0)) revert Errors.CampaignNotFound(campaignId);
        return FILE_MANAGER.getIpfsCid(fileHash);
    }

    /// @notice Get campaign metadata file hash (bytes32)
    /// @param campaignId Campaign id
    /// @return File hash bytes32
    function getCampaignMetadataHash(uint256 campaignId) external view returns (bytes32) {
        bytes32 fileHash = campaigns[campaignId].metadataFileHash;
        if (fileHash == bytes32(0)) revert Errors.CampaignNotFound(campaignId);
        return fileHash;
    }

    /// @notice NGO creates a campaign with full info
    /// @dev NGO only; checks BPS, etc
    /// @param designer Designer
    /// @param title Title
    /// @param description Description
    /// @param imageHash Image IPFS
    /// @param metadataFileHash File hash
    /// @param targetAmount Target
    /// @param ngoShareBps BPS
    /// @param designerShareBps BPS
    /// @param platformShareBps BPS
    /// @return campaignId New campaign id
    function createCampaignByNGO(
        address designer,
        string calldata title,
        string calldata description,
        string calldata imageHash,
        bytes32 metadataFileHash,
        uint256 targetAmount,
        uint256 ngoShareBps,
        uint256 designerShareBps,
        uint256 platformShareBps
    ) external returns (uint256) {
        if (!NGO_REGISTRY.isVerifiedNGO(msg.sender)) revert Errors.NGONotFound(msg.sender);
        if (designer == address(0)) revert Errors.InvalidAddress(designer);
        if (bytes(title).length == 0) revert Errors.EmptyMetadata();
        if (bytes(description).length == 0) revert Errors.EmptyMetadata();
        uint256 totalBps = ngoShareBps + designerShareBps + platformShareBps;
        if (totalBps != MAX_BPS) {
            revert Errors.InvalidBPSSplit(ngoShareBps, designerShareBps, platformShareBps);
        }
        if (!FILE_MANAGER.exists(metadataFileHash)) {
            revert Errors.FileNotStored(metadataFileHash);
        }
        uint256 campaignId = campaignCount;
        campaigns[campaignId] = Campaign({
            ngo: msg.sender,
            designer: designer,
            title: title,
            description: description,
            imageHash: imageHash,
            metadataFileHash: metadataFileHash,
            targetAmount: targetAmount,
            currentAmount: 0,
            ngoShareBps: ngoShareBps,
            designerShareBps: designerShareBps,
            platformShareBps: platformShareBps,
            active: true,
            createdAt: block.timestamp
        });
        campaignsByNGO[msg.sender].push(campaignId);
        campaignCount++;
        emit CampaignCreated(
            campaignId,
            msg.sender,
            designer,
            ngoShareBps,
            designerShareBps,
            platformShareBps,
            metadataFileHash,
            msg.sender
        );
        return campaignId;
    }

    /// @notice Update metadata for an existing campaign
    /// @dev Only campaign's NGO or admin; emits CampaignUpdated
    /// @param campaignId Campaign id
    /// @param title Title
    /// @param description Description
    /// @param imageHash Image hash/IPFS
    function updateCampaign(
        uint256 campaignId,
        string calldata title,
        string calldata description,
        string calldata imageHash
    ) external {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.ngo == address(0)) revert Errors.CampaignNotFound(campaignId);
        if (campaign.ngo != msg.sender && !ADMIN_REGISTRY.isAdmin(msg.sender)) {
            revert Errors.NotAdmin(msg.sender);
        }

        if (bytes(title).length == 0) revert Errors.EmptyMetadata();
        if (bytes(description).length == 0) revert Errors.EmptyMetadata();
        campaign.title = title;
        campaign.description = description;
        campaign.imageHash = imageHash;
        emit CampaignUpdated(campaignId, title, description, imageHash, msg.sender);
    }

    /// @notice Get campaign ids for a given NGO
    /// @param ngo NGO address
    /// @return campaigns List of campaign ids
    function getCampaignsByNGO(address ngo) external view returns (uint256[] memory) {
        return campaignsByNGO[ngo];
    }

    /// @notice Get all active campaign ids
    /// @return List of campaign ids
    function getActiveCampaigns() external view returns (uint256[] memory) {
        uint256[] memory activeCampaigns = new uint256[](campaignCount);
        uint256 count = 0;

        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].active) {
                activeCampaigns[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeCampaigns[i];
        }

        return result;
    }
}
