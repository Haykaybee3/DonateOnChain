// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IDesignerRegistry} from "./interfaces/IDesignerRegistry.sol";
import {ICampaignRegistry} from "./interfaces/ICampaignRegistry.sol";
import {IProofNFT} from "./interfaces/IProofNFT.sol";
import {IFileManager} from "./interfaces/IFileManager.sol";
import {Errors} from "./Errors.sol";
import {IAdminRegistry} from "./interfaces/IAdminRegistry.sol";

contract DesignMarketplace is Ownable, ReentrancyGuard {
    struct Design {
        uint256 designId;
        address designer;
        uint256 campaignId;
        string designName;
        string description;
        string designFileHash;
        string previewImageHash;
        string metadataHash;
        uint256 price;
        uint256 salesCount;
        bool active;
        uint256 createdAt;
    }

    mapping(uint256 => Design) private designs;
    mapping(uint256 => uint256[]) private campaignDesigns;
    mapping(address => uint256[]) private designerDesigns;
    
    uint256 public designCount;
    
    IDesignerRegistry public immutable DESIGNER_REGISTRY;
    ICampaignRegistry public immutable CAMPAIGN_REGISTRY;
    IProofNFT public immutable PROOF_NFT;
    IFileManager public immutable FILE_MANAGER;
    IAdminRegistry public immutable ADMIN_REGISTRY;
    
    address public platformWallet;

    event DesignCreated(
        uint256 indexed designId,
        address indexed designer,
        uint256 indexed campaignId,
        string designName,
        uint256 price
    );
    event DesignPurchased(
        address indexed buyer,
        uint256 indexed designId,
        uint256 indexed campaignId,
        uint256 price,
        uint256 nftSerialNumber
    );
    event DesignDeactivated(uint256 indexed designId);
    event FundsDistributed(
        uint256 indexed designId,
        uint256 totalAmount,
        uint256 ngoAmount,
        uint256 designerAmount,
        uint256 platformAmount
    );

    constructor(
        address initialOwner,
        address _designerRegistry,
        address _campaignRegistry,
        address _proofNFT,
        address _fileManager,
        address _platformWallet,
        address _adminRegistry
    ) Ownable(initialOwner) {
        if (_designerRegistry == address(0)) revert Errors.InvalidAddress(_designerRegistry);
        if (_campaignRegistry == address(0)) revert Errors.InvalidAddress(_campaignRegistry);
        if (_proofNFT == address(0)) revert Errors.InvalidAddress(_proofNFT);
        if (_fileManager == address(0)) revert Errors.InvalidAddress(_fileManager);
        if (_platformWallet == address(0)) revert Errors.InvalidAddress(_platformWallet);
        if (_adminRegistry == address(0)) revert Errors.InvalidAddress(_adminRegistry);

        DESIGNER_REGISTRY = IDesignerRegistry(_designerRegistry);
        CAMPAIGN_REGISTRY = ICampaignRegistry(_campaignRegistry);
        PROOF_NFT = IProofNFT(_proofNFT);
        FILE_MANAGER = IFileManager(_fileManager);
        platformWallet = payable(_platformWallet);
        ADMIN_REGISTRY = IAdminRegistry(_adminRegistry);
    }

    function createDesign(
        uint256 campaignId,
        string calldata designName,
        string calldata description,
        string calldata designFileHash,
        string calldata previewImageHash,
        string calldata metadataHash,
        uint256 price
    ) external returns (uint256) {
        if (!DESIGNER_REGISTRY.isVerifiedDesigner(msg.sender)) revert Errors.NotVerifiedDesigner(msg.sender);
        if (price == 0) revert Errors.InvalidPrice(price);
        if (bytes(designName).length == 0 || bytes(description).length == 0) revert Errors.EmptyMetadata();
        if (bytes(designFileHash).length == 0 || bytes(metadataHash).length == 0) revert Errors.EmptyMetadata();
        
        (address ngo, , uint256 ngoShareBps, uint256 designerShareBps, uint256 platformShareBps, bool active) = 
            CAMPAIGN_REGISTRY.getCampaign(campaignId);
        
        if (!active) revert Errors.InactiveCampaign(campaignId);
        
        uint256 designId = designCount;
        designs[designId] = Design({
            designId: designId,
            designer: msg.sender,
            campaignId: campaignId,
            designName: designName,
            description: description,
            designFileHash: designFileHash,
            previewImageHash: previewImageHash,
            metadataHash: metadataHash,
            price: price,
            salesCount: 0,
            active: true,
            createdAt: block.timestamp
        });

        campaignDesigns[campaignId].push(designId);
        designerDesigns[msg.sender].push(designId);
        designCount++;

        emit DesignCreated(designId, msg.sender, campaignId, designName, price);

        return designId;
    }

    function purchaseDesign(uint256 designId) external payable nonReentrant returns (uint256) {
        Design storage design = designs[designId];
        if (design.designer == address(0)) revert Errors.DesignNotFound(designId);
        if (!design.active) revert Errors.DesignNotActive(designId);
        
        if (msg.value != design.price) {
            revert Errors.InsufficientPayment(design.price, msg.value);
        }

        (address ngo, , uint256 ngoShareBps, uint256 designerShareBps, uint256 platformShareBps, ) = 
            CAMPAIGN_REGISTRY.getCampaign(design.campaignId);
        
        uint256 ngoAmount = (msg.value * ngoShareBps) / 10000;
        uint256 designerAmount = (msg.value * designerShareBps) / 10000;
        uint256 platformAmount = msg.value - ngoAmount - designerAmount;

        _transferHbar(payable(ngo), ngoAmount);
        _transferHbar(payable(design.designer), designerAmount);
        _transferHbar(payable(platformWallet), platformAmount);

        uint256 nftSerialNumber = PROOF_NFT.mintDonationNFT(
            msg.sender,
            design.campaignId,
            msg.value,
            design.metadataHash
        );

        design.salesCount++;

        emit DesignPurchased(msg.sender, designId, design.campaignId, msg.value, nftSerialNumber);
        emit FundsDistributed(designId, msg.value, ngoAmount, designerAmount, platformAmount);

        return nftSerialNumber;
    }

    function deactivateDesign(uint256 designId) external {
        Design storage design = designs[designId];
        if (design.designer == address(0)) revert Errors.DesignNotFound(designId);
        
        bool isOwner = msg.sender == owner();
        bool isDesigner = design.designer == msg.sender;
        bool isAdmin = ADMIN_REGISTRY.isAdmin(msg.sender);
        
        if (!isOwner && !isDesigner && !isAdmin) {
            revert Errors.NotDesignOwner(msg.sender);
        }
        
        design.active = false;
        emit DesignDeactivated(designId);
    }

    function getDesign(uint256 designId) external view returns (
        address designer,
        uint256 campaignId,
        string memory designName,
        uint256 price,
        bool active
    ) {
        Design storage design = designs[designId];
        if (design.designer == address(0)) revert Errors.DesignNotFound(designId);
        
        return (design.designer, design.campaignId, design.designName, design.price, design.active);
    }

    function getDesignsByCampaign(uint256 campaignId) external view returns (uint256[] memory) {
        return campaignDesigns[campaignId];
    }

    function getDesignsByDesigner(address designer) external view returns (uint256[] memory) {
        return designerDesigns[designer];
    }

    function _transferHbar(address payable recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert Errors.TransferFailed(recipient, amount);
    }
}

