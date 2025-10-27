// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {FileManager} from "../src/FileManager.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {DonationManager} from "../src/DonationManager.sol";
import {Errors} from "../src/Errors.sol";

interface IProofNFT {
    function mintDonationNFT(
        address donor,
        uint256 campaignId,
        uint256 amount,
        string calldata metadataHash
    ) external returns (uint256);
}

contract MockProofNFT is IProofNFT {
    uint256 private serialCounter;
    address public donationManager;

    event ProofOfDonationMinted(
        address indexed donor,
        uint256 indexed campaignId,
        uint256 indexed serialNumber,
        uint256 amount,
        string metadataHash
    );

    constructor() {
        serialCounter = 1;
    }

    function setDonationManager(address manager) external {
        donationManager = manager;
    }

    function mintDonationNFT(
        address donor,
        uint256 campaignId,
        uint256 amount,
        string calldata metadataHash
    ) external returns (uint256) {
        if (msg.sender != donationManager) revert Errors.NotDonationManager(msg.sender);
        uint256 serial = serialCounter++;
        emit ProofOfDonationMinted(donor, campaignId, serial, amount, metadataHash);
        return serial;
    }
}

contract TestRecipient {
    receive() external payable {}
}

contract DonationManagerTest is Test {
    AdminRegistry public adminRegistry;
    NGORegistry public ngoRegistry;
    DesignerRegistry public designerRegistry;
    FileManager public fileManager;
    CampaignRegistry public campaignRegistry;
    MockProofNFT public proofNFT;
    DonationManager public donationManager;
    
    TestRecipient public platformWallet;
    TestRecipient public ngoRecipient;
    TestRecipient public designerRecipient;
    address public donor;

    uint256 public constant DONATION_AMOUNT = 100 ether;
    uint256 public constant NGO_SHARE_BPS = 7000;
    uint256 public constant DESIGNER_SHARE_BPS = 2000;
    uint256 public constant PLATFORM_SHARE_BPS = 1000;
    bytes32 public constant METADATA_HASH = keccak256("test-metadata");

    function setUp() public {
        platformWallet = new TestRecipient();
        ngoRecipient = new TestRecipient();
        designerRecipient = new TestRecipient();
        donor = address(0x4);

        adminRegistry = new AdminRegistry(address(this));
        ngoRegistry = new NGORegistry(address(this), address(adminRegistry));
        designerRegistry = new DesignerRegistry(address(this), address(adminRegistry));
        fileManager = new FileManager(address(this), address(adminRegistry), address(ngoRegistry), address(designerRegistry));
        campaignRegistry = new CampaignRegistry(address(this), address(adminRegistry), address(fileManager), address(ngoRegistry));

        ngoRegistry.addNGO(address(ngoRecipient), "ipfs://QmTestNGO");
        designerRegistry.addDesigner(address(designerRecipient), "ipfs://QmTestDesigner");
        fileManager.storeFileHashAdmin(METADATA_HASH, "ipfs://QmTestMetadata");

        proofNFT = new MockProofNFT();
        donationManager = new DonationManager(address(this), address(campaignRegistry), address(proofNFT), address(platformWallet));
        proofNFT.setDonationManager(address(donationManager));

        campaignRegistry.createCampaign(
            address(ngoRecipient),
            address(designerRecipient),
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            METADATA_HASH
        );
    }

    function testDonateSuccess() public {
        vm.deal(donor, DONATION_AMOUNT);
        
        uint256 ngoBalanceBefore = address(ngoRecipient).balance;
        uint256 designerBalanceBefore = address(designerRecipient).balance;
        uint256 platformBalanceBefore = address(platformWallet).balance;

        vm.prank(donor);
        donationManager.donate{value: DONATION_AMOUNT}(0, "test-metadata");

        assertEq(address(ngoRecipient).balance - ngoBalanceBefore, 70 ether);
        assertEq(address(designerRecipient).balance - designerBalanceBefore, 20 ether);
        assertEq(address(platformWallet).balance - platformBalanceBefore, 10 ether);
    }

    function testRevertWhenZeroAmount() public {
        vm.deal(donor, DONATION_AMOUNT);
        
        vm.prank(donor);
        vm.expectRevert(Errors.ZeroAmount.selector);
        donationManager.donate{value: 0}(0, "test-metadata");
    }

    function testRevertWhenCampaignNotFound() public {
        vm.deal(donor, DONATION_AMOUNT);

        vm.prank(donor);
        vm.expectRevert(abi.encodeWithSelector(Errors.CampaignNotFound.selector, 999));
        donationManager.donate{value: DONATION_AMOUNT}(999, "test-metadata");
    }

    function testUpdatePlatformWallet() public {
        TestRecipient newPlatformWallet = new TestRecipient();
        
        donationManager.updatePlatformWallet(address(newPlatformWallet));
        
        vm.deal(donor, DONATION_AMOUNT);
        vm.prank(donor);
        donationManager.donate{value: DONATION_AMOUNT}(0, "test-metadata");

        assertEq(address(newPlatformWallet).balance, 10 ether);
    }

    function testFuzzDonate(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);
        
        vm.deal(donor, amount);
        
        uint256 ngoBalanceBefore = address(ngoRecipient).balance;
        uint256 designerBalanceBefore = address(designerRecipient).balance;
        uint256 platformBalanceBefore = address(platformWallet).balance;

        vm.prank(donor);
        donationManager.donate{value: amount}(0, "test-metadata");

        uint256 ngoAmount = (amount * NGO_SHARE_BPS) / 10000;
        uint256 designerAmount = (amount * DESIGNER_SHARE_BPS) / 10000;
        uint256 platformAmount = amount - ngoAmount - designerAmount;

        assertEq(address(ngoRecipient).balance - ngoBalanceBefore, ngoAmount);
        assertEq(address(designerRecipient).balance - designerBalanceBefore, designerAmount);
        assertEq(address(platformWallet).balance - platformBalanceBefore, platformAmount);
    }
}

