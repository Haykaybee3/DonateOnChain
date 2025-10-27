// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IHederaTokenService} from "./interfaces/IHederaTokenService.sol";
import {Errors} from "./Errors.sol";

contract ProofNFT is Ownable {
    address public immutable HTS_PRECOMPILE = address(0x167);

    IHederaTokenService private htsService;
    address public nftTokenId;
    address public donationManager;

    event ProofOfDonationMinted(
        address indexed donor,
        uint256 indexed campaignId,
        uint256 indexed serialNumber,
        uint256 amount,
        string metadataHash
    );
    event TokenIdSet(address indexed tokenId);
    event DonationManagerSet(address indexed oldManager, address indexed newManager);

    modifier onlyDonationManager() {
        if (msg.sender != donationManager) revert Errors.NotDonationManager(msg.sender);
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        htsService = IHederaTokenService(HTS_PRECOMPILE);
    }

    function setTokenId(address tokenId) external onlyOwner {
        if (tokenId == address(0)) revert Errors.InvalidTokenId(tokenId);
        nftTokenId = tokenId;
        emit TokenIdSet(tokenId);
    }

    function setDonationManager(address manager) external onlyOwner {
        if (manager == address(0)) revert Errors.InvalidAddress(manager);
        address oldManager = donationManager;
        donationManager = manager;
        emit DonationManagerSet(oldManager, manager);
    }

    function mintDonationNFT(address donor, uint256 campaignId, uint256 amount, string calldata metadataHash)
        external
        onlyDonationManager
        returns (uint256)
    {
        if (nftTokenId == address(0)) revert Errors.InvalidTokenId(address(0));
        if (donor == address(0)) revert Errors.InvalidAddress(donor);
        if (bytes(metadataHash).length == 0) revert Errors.EmptyMetadata();

        bytes memory metadata = _encodeMetadata(campaignId, amount, metadataHash);
        bytes[] memory metadataArray = new bytes[](1);
        metadataArray[0] = metadata;

        (int64 responseCode,, int64[] memory serialNumbers) = htsService.mintToken(nftTokenId, 1, metadataArray);

        if (responseCode != 22) {
            revert Errors.MintFailed(responseCode);
        }

        uint256 serialNumber = uint256(int256(serialNumbers[0]));

        emit ProofOfDonationMinted(donor, campaignId, serialNumber, amount, metadataHash);

        return serialNumber;
    }

    function _encodeMetadata(uint256 campaignId, uint256 amount, string calldata metadataHash)
        private
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(
            "{\"campaignId\":\"",
            _uint2str(campaignId),
            "\",\"amount\":\"",
            _uint2str(amount),
            "\",\"metadata\":\"",
            metadataHash,
            "\"}"
        );
    }

    function _uint2str(uint256 _i) private pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k--;
            bstr[k] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
}
