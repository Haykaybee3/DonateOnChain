// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAdminRegistry} from "./interfaces/IAdminRegistry.sol";
import {INGORegistry} from "./interfaces/INGORegistry.sol";
import {IDesignerRegistry} from "./interfaces/IDesignerRegistry.sol";
import {Errors} from "./Errors.sol";

contract FileManager is Ownable {
    mapping(bytes32 => string) private ipfsCidOf;
    mapping(bytes32 => address) public uploaderOf;

    IAdminRegistry public immutable ADMIN_REGISTRY;
    INGORegistry public immutable NGO_REGISTRY;
    IDesignerRegistry public immutable DESIGNER_REGISTRY;

    event FileStored(bytes32 indexed fileHash, string ipfsCid, address indexed uploader, address indexed storedBy);
    event FileRemoved(bytes32 indexed fileHash, address indexed removedBy);

    modifier onlyAdmin() {
        if (!ADMIN_REGISTRY.isAdmin(msg.sender)) revert Errors.NotAdmin(msg.sender);
        _;
    }

    modifier onlyVerifiedNGO() {
        if (!NGO_REGISTRY.isVerifiedNGO(msg.sender)) revert Errors.NGONotFound(msg.sender);
        _;
    }

    modifier onlyVerifiedDesigner() {
        if (!DESIGNER_REGISTRY.isVerifiedDesigner(msg.sender)) revert Errors.DesignerNotFound(msg.sender);
        _;
    }

    constructor(address initialOwner, address _adminRegistry, address _ngoRegistry, address _designerRegistry)
        Ownable(initialOwner)
    {
        if (_adminRegistry == address(0)) revert Errors.InvalidAddress(_adminRegistry);
        if (_ngoRegistry == address(0)) revert Errors.InvalidAddress(_ngoRegistry);
        if (_designerRegistry == address(0)) revert Errors.InvalidAddress(_designerRegistry);

        ADMIN_REGISTRY = IAdminRegistry(_adminRegistry);
        NGO_REGISTRY = INGORegistry(_ngoRegistry);
        DESIGNER_REGISTRY = IDesignerRegistry(_designerRegistry);
    }

    function storeFileHashAdmin(bytes32 fileHash, string calldata ipfsCid) external onlyAdmin {
        _store(fileHash, ipfsCid, msg.sender);
    }

    function storeFileHashByNGO(bytes32 fileHash, string calldata ipfsCid) external onlyVerifiedNGO {
        _store(fileHash, ipfsCid, msg.sender);
    }

    function storeFileHashByDesigner(bytes32 fileHash, string calldata ipfsCid) external onlyVerifiedDesigner {
        _store(fileHash, ipfsCid, msg.sender);
    }

    function _store(bytes32 fileHash, string calldata ipfsCid, address uploader) internal {
        if (fileHash == bytes32(0)) revert Errors.FileNotStored(fileHash);
        if (bytes(ipfsCid).length == 0) revert Errors.EmptyCID();

        ipfsCidOf[fileHash] = ipfsCid;
        uploaderOf[fileHash] = uploader;
        emit FileStored(fileHash, ipfsCid, uploader, msg.sender);
    }

    function removeFileHash(bytes32 fileHash) external onlyAdmin {
        if (bytes(ipfsCidOf[fileHash]).length == 0) revert Errors.FileNotStored(fileHash);

        delete ipfsCidOf[fileHash];
        delete uploaderOf[fileHash];
        emit FileRemoved(fileHash, msg.sender);
    }

    function getIpfsCid(bytes32 fileHash) external view returns (string memory) {
        return ipfsCidOf[fileHash];
    }

    function verifyFile(bytes32 fileHash, string calldata ipfsCid) external view returns (bool) {
        string memory stored = ipfsCidOf[fileHash];
        if (bytes(stored).length == 0) return false;
        return keccak256(bytes(stored)) == keccak256(bytes(ipfsCid));
    }

    function exists(bytes32 fileHash) external view returns (bool) {
        return bytes(ipfsCidOf[fileHash]).length > 0;
    }
}
