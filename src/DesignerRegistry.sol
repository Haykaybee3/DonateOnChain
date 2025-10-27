// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAdminRegistry} from "./interfaces/IAdminRegistry.sol";
import {Errors} from "./Errors.sol";

contract DesignerRegistry is Ownable {
    struct Designer {
        address wallet;
        string name;
        string bio;
        string portfolioHash;
        string profileImageHash;
        bool isActive;
        bool isPending;
        uint256 createdAt;
    }

    mapping(address => Designer) private designers;
    mapping(address => Designer) private pendingDesigners;
    address[] private pendingDesignerList;
    
    IAdminRegistry public immutable ADMIN_REGISTRY;

    event DesignerAdded(address indexed wallet, string portfolioHash, address indexed addedBy);
    event DesignerUpdated(address indexed wallet, string portfolioHash, address indexed updatedBy);
    event DesignerDeactivated(address indexed wallet);
    event DesignerRegistrationRequested(address indexed wallet, string portfolioHash, address indexed requester);
    event DesignerApproved(address indexed wallet);
    event DesignerRejected(address indexed wallet);

    modifier onlyAdmin() {
        if (!ADMIN_REGISTRY.isAdmin(msg.sender)) revert Errors.NotAdmin(msg.sender);
        _;
    }

    constructor(address initialOwner, address _adminRegistry) Ownable(initialOwner) {
        if (_adminRegistry == address(0)) revert Errors.InvalidAddress(_adminRegistry);
        ADMIN_REGISTRY = IAdminRegistry(_adminRegistry);
    }

    function addDesigner(address wallet, string calldata portfolioHash) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (bytes(portfolioHash).length == 0) revert Errors.EmptyMetadata();
        
        if (designers[wallet].isActive) {
            designers[wallet].portfolioHash = portfolioHash;
            emit DesignerUpdated(wallet, portfolioHash, msg.sender);
        } else {
            designers[wallet] = Designer({
                wallet: wallet,
                name: "",
                bio: "",
                portfolioHash: portfolioHash,
                profileImageHash: "",
                isActive: true,
                isPending: false,
                createdAt: block.timestamp
            });
            emit DesignerAdded(wallet, portfolioHash, msg.sender);
        }
    }

    function updateDesigner(address wallet, string calldata portfolioHash) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (!designers[wallet].isActive) revert Errors.DesignerNotFound(wallet);
        if (bytes(portfolioHash).length == 0) revert Errors.EmptyMetadata();
        
        designers[wallet].portfolioHash = portfolioHash;
        emit DesignerUpdated(wallet, portfolioHash, msg.sender);
    }

    function deactivateDesigner(address wallet) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (!designers[wallet].isActive) revert Errors.DesignerNotFound(wallet);
        
        designers[wallet].isActive = false;
        emit DesignerDeactivated(wallet);
    }

    function isVerifiedDesigner(address designer) external view returns (bool) {
        return designers[designer].isActive;
    }

    function getDesignerWallet(address designer) external view returns (address) {
        if (!designers[designer].isActive) revert Errors.DesignerNotFound(designer);
        return designers[designer].wallet;
    }

    function getDesigner(address designer) external view returns (address wallet, string memory portfolioHash, bool isActive) {
        Designer storage designerData = designers[designer];
        return (designerData.wallet, designerData.portfolioHash, designerData.isActive);
    }

    function registerDesignerPending(
        string calldata name,
        string calldata bio,
        string calldata portfolioHash,
        string calldata profileImageHash
    ) external {
        if (msg.sender == address(0)) revert Errors.InvalidAddress(msg.sender);
        if (bytes(name).length == 0 || bytes(bio).length == 0) revert Errors.EmptyMetadata();
        if (bytes(portfolioHash).length == 0) revert Errors.EmptyMetadata();
        if (designers[msg.sender].isActive) revert Errors.DesignerAlreadyRegistered(msg.sender);
        
        pendingDesigners[msg.sender] = Designer({
            wallet: msg.sender,
            name: name,
            bio: bio,
            portfolioHash: portfolioHash,
            profileImageHash: profileImageHash,
            isActive: false,
            isPending: true,
            createdAt: block.timestamp
        });
        
        pendingDesignerList.push(msg.sender);
        emit DesignerRegistrationRequested(msg.sender, portfolioHash, msg.sender);
    }

    function approveDesigner(address wallet) external onlyAdmin {
        if (!pendingDesigners[wallet].isPending) revert Errors.DesignerNotPending(wallet);
        
        designers[wallet] = pendingDesigners[wallet];
        designers[wallet].isActive = true;
        designers[wallet].isPending = false;
        
        delete pendingDesigners[wallet];
        emit DesignerApproved(wallet);
    }

    function rejectDesigner(address wallet) external onlyAdmin {
        if (!pendingDesigners[wallet].isPending) revert Errors.DesignerNotPending(wallet);
        
        delete pendingDesigners[wallet];
        emit DesignerRejected(wallet);
    }

    function updateDesignerProfile(
        string calldata name,
        string calldata bio,
        string calldata portfolioHash,
        string calldata profileImageHash
    ) external {
        if (!designers[msg.sender].isActive) revert Errors.DesignerNotFound(msg.sender);
        if (bytes(name).length == 0 || bytes(bio).length == 0) revert Errors.EmptyMetadata();
        
        designers[msg.sender].name = name;
        designers[msg.sender].bio = bio;
        designers[msg.sender].portfolioHash = portfolioHash;
        designers[msg.sender].profileImageHash = profileImageHash;
        
        emit DesignerUpdated(msg.sender, portfolioHash, msg.sender);
    }

    function getPendingDesigners() external view returns (address[] memory) {
        return pendingDesignerList;
    }
}

