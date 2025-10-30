// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAdminRegistry} from "./interfaces/IAdminRegistry.sol";
import {Errors} from "./Errors.sol";

contract NGORegistry is Ownable {
    struct NGO {
        address wallet;
        string name;
        string description;
        string profileImageHash;
        string metadataHash;
        bool isActive;
        bool isPending;
        uint256 createdAt;
    }

    mapping(address => NGO) private ngos;
    mapping(address => NGO) private pendingNGOs;
    address[] private pendingNGOList;

    IAdminRegistry public immutable ADMIN_REGISTRY;

    event NGOAdded(address indexed wallet, string metadataHash, address indexed addedBy);
    event NGOUpdated(address indexed wallet, string metadataHash, address indexed updatedBy);
    event NGODeactivated(address indexed wallet);
    event NGORegistrationRequested(address indexed wallet, string metadataHash, address indexed requester);
    event NGOApproved(address indexed wallet);
    event NGORejected(address indexed wallet);

    modifier onlyAdmin() {
        if (!ADMIN_REGISTRY.isAdmin(msg.sender)) revert Errors.NotAdmin(msg.sender);
        _;
    }

    constructor(address initialOwner, address _adminRegistry) Ownable(initialOwner) {
        if (_adminRegistry == address(0)) revert Errors.InvalidAddress(_adminRegistry);
        ADMIN_REGISTRY = IAdminRegistry(_adminRegistry);
    }

    function addNGO(address wallet, string calldata metadataHash) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (bytes(metadataHash).length == 0) revert Errors.EmptyMetadata();

        if (ngos[wallet].isActive) {
            ngos[wallet].metadataHash = metadataHash;
            emit NGOUpdated(wallet, metadataHash, msg.sender);
        } else {
            ngos[wallet] = NGO({
                wallet: wallet,
                name: "",
                description: "",
                profileImageHash: "",
                metadataHash: metadataHash,
                isActive: true,
                isPending: false,
                createdAt: block.timestamp
            });
            emit NGOAdded(wallet, metadataHash, msg.sender);
        }
    }

    function updateNGO(address wallet, string calldata metadataHash) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (!ngos[wallet].isActive) revert Errors.NGONotFound(wallet);
        if (bytes(metadataHash).length == 0) revert Errors.EmptyMetadata();

        ngos[wallet].metadataHash = metadataHash;
        emit NGOUpdated(wallet, metadataHash, msg.sender);
    }

    function deactivateNGO(address wallet) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (!ngos[wallet].isActive) revert Errors.NGONotFound(wallet);

        ngos[wallet].isActive = false;
        emit NGODeactivated(wallet);
    }

    function isVerifiedNGO(address ngo) external view returns (bool) {
        return ngos[ngo].isActive;
    }

    function getNGOWallet(address ngo) external view returns (address) {
        if (!ngos[ngo].isActive) revert Errors.NGONotFound(ngo);
        return ngos[ngo].wallet;
    }

    function getNGO(address ngo) external view returns (address wallet, string memory metadataHash, bool isActive) {
        NGO storage ngoData = ngos[ngo];
        return (ngoData.wallet, ngoData.metadataHash, ngoData.isActive);
    }

    function registerNGOPending(
        string calldata name,
        string calldata description,
        string calldata profileImageHash,
        string calldata metadataHash
    ) external {
        if (msg.sender == address(0)) revert Errors.InvalidAddress(msg.sender);
        if (bytes(name).length == 0 || bytes(description).length == 0) revert Errors.EmptyMetadata();
        if (bytes(metadataHash).length == 0) revert Errors.EmptyMetadata();
        if (ngos[msg.sender].isActive) revert Errors.NGOAlreadyRegistered(msg.sender);

        pendingNGOs[msg.sender] = NGO({
            wallet: msg.sender,
            name: name,
            description: description,
            profileImageHash: profileImageHash,
            metadataHash: metadataHash,
            isActive: false,
            isPending: true,
            createdAt: block.timestamp
        });

        pendingNGOList.push(msg.sender);
        emit NGORegistrationRequested(msg.sender, metadataHash, msg.sender);
    }

    function approveNGO(address wallet) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (!pendingNGOs[wallet].isPending) revert Errors.NGONotPending(wallet);

        ngos[wallet] = pendingNGOs[wallet];
        ngos[wallet].isActive = true;
        ngos[wallet].isPending = false;

        delete pendingNGOs[wallet];
        emit NGOApproved(wallet);
    }

    function rejectNGO(address wallet) external onlyAdmin {
        if (wallet == address(0)) revert Errors.InvalidAddress(wallet);
        if (!pendingNGOs[wallet].isPending) revert Errors.NGONotPending(wallet);

        delete pendingNGOs[wallet];
        emit NGORejected(wallet);
    }

    function updateNGOProfile(string calldata name, string calldata description, string calldata profileImageHash)
        external
    {
        if (!ngos[msg.sender].isActive) revert Errors.NGONotFound(msg.sender);
        if (bytes(name).length == 0 || bytes(description).length == 0) revert Errors.EmptyMetadata();

        ngos[msg.sender].name = name;
        ngos[msg.sender].description = description;
        ngos[msg.sender].profileImageHash = profileImageHash;

        emit NGOUpdated(msg.sender, ngos[msg.sender].metadataHash, msg.sender);
    }

    function getPendingNGOs() external view returns (address[] memory) {
        return pendingNGOList;
    }
}
