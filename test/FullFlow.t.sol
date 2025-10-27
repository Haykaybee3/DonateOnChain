// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {FileManager} from "../src/FileManager.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {DonationManager} from "../src/DonationManager.sol";
import {DesignMarketplace} from "../src/DesignMarketplace.sol";
import {Errors} from "../src/Errors.sol";

interface IProofNFTTest {
    function mintDonationNFT(
        address donor,
        uint256 campaignId,
        uint256 amount,
        string calldata metadataHash
    ) external returns (uint256);
}

contract MockProofNFT is IProofNFTTest {
    uint256 private serialCounter;
    mapping(address => bool) public donationManagers;

    constructor() {
        serialCounter = 1;
    }

    function setDonationManager(address manager) external {
        donationManagers[manager] = true;
    }

    function mintDonationNFT(
        address donor,
        uint256 campaignId,
        uint256 amount,
        string calldata metadataHash
    ) external returns (uint256) {
        if (!donationManagers[msg.sender]) revert Errors.NotDonationManager(msg.sender);
        uint256 serial = serialCounter++;
        return serial;
    }
}

contract TestRecipient {
    receive() external payable {}
}

contract FullFlowTest is Test {
    AdminRegistry public adminRegistry;
    NGORegistry public ngoRegistry;
    DesignerRegistry public designerRegistry;
    FileManager public fileManager;
    CampaignRegistry public campaignRegistry;
    MockProofNFT public proofNFT;
    DonationManager public donationManager;
    DesignMarketplace public designMarketplace;

    TestRecipient public platformWallet;

    address public admin;
    address public ngo;
    address public designer;
    address public customer;

    bytes32 public constant NGO_METADATA_HASH = keccak256("NGO-Metadata");
    bytes32 public constant CAMPAIGN_METADATA_HASH = keccak256("Campaign-Metadata");
    bytes32 public constant DESIGN_FILE_HASH = keccak256("Design-File");

    string public constant NGO_METADATA_CID = "QmNgoMetadata";
    string public constant CAMPAIGN_METADATA_CID = "QmCampaignMetadata";
    string public constant DESIGN_FILE_CID = "QmDesignFile";
    string public constant DESIGN_METADATA_HASH = "QmDesignMetadata";

    uint256 public constant NGO_SHARE_BPS = 7000;
    uint256 public constant DESIGNER_SHARE_BPS = 2000;
    uint256 public constant PLATFORM_SHARE_BPS = 1000;

    event NGORegistrationRequested(address indexed wallet, string metadataHash, address indexed requester);
    event NGOApproved(address indexed wallet);
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed ngoAddr,
        address indexed designerAddr,
        uint256 ngoShareBps,
        uint256 designerShareBps,
        uint256 platformShareBps,
        bytes32 metadataFileHash,
        address createdBy
    );
    event DesignerRegistrationRequested(address indexed wallet, string portfolioHash, address indexed requester);
    event DesignerApproved(address indexed wallet);
    event DesignCreated(
        uint256 indexed designId,
        address indexed designerAddr,
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
    event FundsDistributed(
        uint256 indexed designId,
        uint256 totalAmount,
        uint256 ngoAmount,
        uint256 designerAmount,
        uint256 platformAmount
    );

    function setUp() public {
        admin = address(this);
        ngo = address(0x100);
        designer = address(0x200);
        customer = address(0x300);

        platformWallet = new TestRecipient();

        adminRegistry = new AdminRegistry(admin);
        ngoRegistry = new NGORegistry(admin, address(adminRegistry));
        designerRegistry = new DesignerRegistry(admin, address(adminRegistry));
        fileManager = new FileManager(admin, address(adminRegistry), address(ngoRegistry), address(designerRegistry));
        campaignRegistry = new CampaignRegistry(admin, address(adminRegistry), address(fileManager), address(ngoRegistry));
        
        proofNFT = new MockProofNFT();
        donationManager = new DonationManager(
            admin,
            address(campaignRegistry),
            address(proofNFT),
            address(platformWallet)
        );
        
        designMarketplace = new DesignMarketplace(
            admin,
            address(designerRegistry),
            address(campaignRegistry),
            address(proofNFT),
            address(fileManager),
            address(platformWallet),
            address(adminRegistry)
        );

        proofNFT.setDonationManager(address(donationManager));
        proofNFT.setDonationManager(address(designMarketplace));
    }

    function testFullFlowNGORegistrationAndApproval() public {
        vm.startPrank(ngo);
        ngoRegistry.registerNGOPending(
            "Test NGO",
            "Helping communities",
            "QmNgoProfile",
            NGO_METADATA_CID
        );
        vm.stopPrank();

        address[] memory pending = ngoRegistry.getPendingNGOs();
        assertEq(pending.length, 1);
        assertEq(pending[0], ngo);

        vm.expectEmit(true, false, false, false);
        emit NGOApproved(ngo);
        ngoRegistry.approveNGO(ngo);

        assertTrue(ngoRegistry.isVerifiedNGO(ngo));
        
        (address wallet, string memory metadata, bool isActive) = ngoRegistry.getNGO(ngo);
        assertEq(wallet, ngo);
        assertTrue(isActive);
    }

    function testFullFlowDesignerRegistrationAndApproval() public {
        vm.startPrank(designer);
        designerRegistry.registerDesignerPending(
            "Test Designer",
            "Creative designer",
            "QmDesignerPortfolio",
            "QmDesignerProfile"
        );
        vm.stopPrank();

        address[] memory pending = designerRegistry.getPendingDesigners();
        assertEq(pending.length, 1);
        assertEq(pending[0], designer);

        vm.expectEmit(true, false, false, false);
        emit DesignerApproved(designer);
        designerRegistry.approveDesigner(designer);

        assertTrue(designerRegistry.isVerifiedDesigner(designer));
        
        (address wallet, string memory portfolio, bool isActive) = designerRegistry.getDesigner(designer);
        assertEq(wallet, designer);
        assertTrue(isActive);
    }

    function testFullFlowCampaignCreation() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        
        vm.expectEmit(true, true, true, false);
        emit CampaignCreated(
            0,
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH,
            admin
        );
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        assertEq(campaignId, 0);
        
        (address campaignNGO, address campaignDesigner, uint256 ngoShare, uint256 designerShare, uint256 platformShare, bool active) = 
            campaignRegistry.getCampaign(campaignId);
        
        assertEq(campaignNGO, ngo);
        assertEq(campaignDesigner, designer);
        assertEq(ngoShare, NGO_SHARE_BPS);
        assertEq(designerShare, DESIGNER_SHARE_BPS);
        assertEq(platformShare, PLATFORM_SHARE_BPS);
        assertTrue(active);
    }

    function testFullFlowDesignCreation() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        designerRegistry.addDesigner(designer, "QmPortfolio");
        
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        fileManager.storeFileHashAdmin(DESIGN_FILE_HASH, DESIGN_FILE_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        vm.prank(designer);
        vm.expectEmit(true, true, true, false);
        emit DesignCreated(
            0,
            designer,
            campaignId,
            "Test Design",
            100 ether
        );

        uint256 designId = designMarketplace.createDesign(
            campaignId,
            "Test Design",
            "A beautiful design for the campaign",
            DESIGN_FILE_CID,
            "QmPreviewImage",
            DESIGN_METADATA_HASH,
            100 ether
        );

        assertEq(designId, 0);
        
        (address designDesigner, uint256 designCampaignId, string memory name, uint256 price, bool active) = 
            designMarketplace.getDesign(designId);
        
        assertEq(designDesigner, designer);
        assertEq(designCampaignId, campaignId);
        assertEq(keccak256(bytes(name)), keccak256(bytes("Test Design")));
        assertEq(price, 100 ether);
        assertTrue(active);
    }

    function testFullFlowCustomerDonatesToCampaign() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        designerRegistry.addDesigner(designer, "QmPortfolio");
        
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        uint256 donationAmount = 1000 ether;
        vm.deal(customer, donationAmount);

        vm.prank(customer);
        vm.expectEmit(true, true, true, true);
        emit DonationMade(
            customer,
            campaignId,
            donationAmount,
            700 ether,
            200 ether,
            100 ether,
            ngo,
            designer,
            address(platformWallet),
            1
        );

        uint256 nftSerial = donationManager.donate{value: donationAmount}(campaignId, "donation-metadata");

        assertEq(nftSerial, 1);
        assertEq(ngo.balance, 700 ether);
        assertEq(designer.balance, 200 ether);
        assertEq(address(platformWallet).balance, 100 ether);
    }

    function testFullFlowCustomerBuysDesign() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        designerRegistry.addDesigner(designer, "QmPortfolio");
        
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        fileManager.storeFileHashAdmin(DESIGN_FILE_HASH, DESIGN_FILE_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        vm.prank(designer);
        uint256 designId = designMarketplace.createDesign(
            campaignId,
            "Test Design",
            "A beautiful design",
            DESIGN_FILE_CID,
            "QmPreviewImage",
            DESIGN_METADATA_HASH,
            100 ether
        );

        uint256 buyAmount = 100 ether;
        vm.deal(customer, buyAmount);

        uint256 ngoBalanceBefore = ngo.balance;
        uint256 designerBalanceBefore = designer.balance;
        uint256 platformBalanceBefore = address(platformWallet).balance;

        vm.prank(customer);
        vm.expectEmit(true, true, true, true);
        emit DesignPurchased(
            customer,
            designId,
            campaignId,
            buyAmount,
            1
        );

        vm.expectEmit(true, true, true, true);
        emit FundsDistributed(
            designId,
            buyAmount,
            70 ether,
            20 ether,
            10 ether
        );

        uint256 nftSerial = designMarketplace.purchaseDesign{value: buyAmount}(designId);

        assertEq(nftSerial, 1);
        assertEq(ngo.balance - ngoBalanceBefore, 70 ether);
        assertEq(designer.balance - designerBalanceBefore, 20 ether);
        assertEq(address(platformWallet).balance - platformBalanceBefore, 10 ether);
    }

    function testFullFlowCompleteFlow() public {
        vm.startPrank(ngo);
        ngoRegistry.registerNGOPending(
            "Test NGO",
            "Helping communities",
            "QmNgoProfile",
            NGO_METADATA_CID
        );
        vm.stopPrank();

        ngoRegistry.approveNGO(ngo);
        assertTrue(ngoRegistry.isVerifiedNGO(ngo));

        vm.startPrank(designer);
        designerRegistry.registerDesignerPending(
            "Test Designer",
            "Creative designer",
            "QmDesignerPortfolio",
            "QmDesignerProfile"
        );
        vm.stopPrank();

        designerRegistry.approveDesigner(designer);
        assertTrue(designerRegistry.isVerifiedDesigner(designer));

        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        fileManager.storeFileHashAdmin(DESIGN_FILE_HASH, DESIGN_FILE_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        vm.prank(designer);
        uint256 designId = designMarketplace.createDesign(
            campaignId,
            "Test Design",
            "A beautiful design",
            DESIGN_FILE_CID,
            "QmPreviewImage",
            DESIGN_METADATA_HASH,
            50 ether
        );

        uint256 donationAmount = 200 ether;
        vm.deal(customer, donationAmount * 2);

        vm.prank(customer);
        donationManager.donate{value: donationAmount}(campaignId, "donation-metadata");

        vm.prank(customer);
        designMarketplace.purchaseDesign{value: 50 ether}(designId);

        assertEq(ngo.balance, 140 ether + 35 ether);
        assertEq(designer.balance, 40 ether + 10 ether);
        assertEq(address(platformWallet).balance, 20 ether + 5 ether);
    }

    function testFullFlowMultipleDesignsForCampaign() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        designerRegistry.addDesigner(designer, "QmPortfolio");
        
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        fileManager.storeFileHashAdmin(DESIGN_FILE_HASH, DESIGN_FILE_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        vm.startPrank(designer);
        designMarketplace.createDesign(campaignId, "Design 1", "First design", DESIGN_FILE_CID, "Qm1", DESIGN_METADATA_HASH, 100 ether);
        designMarketplace.createDesign(campaignId, "Design 2", "Second design", DESIGN_FILE_CID, "Qm2", DESIGN_METADATA_HASH, 150 ether);
        designMarketplace.createDesign(campaignId, "Design 3", "Third design", DESIGN_FILE_CID, "Qm3", DESIGN_METADATA_HASH, 200 ether);
        vm.stopPrank();

        uint256[] memory designs = designMarketplace.getDesignsByCampaign(campaignId);
        assertEq(designs.length, 3);
    }

    function testFullFlowRevertIfNGOUnverifiedCreatesCampaign() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.FileNotStored.selector, CAMPAIGN_METADATA_HASH));
        campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );
    }

    function testFullFlowRevertIfDesignerUnverifiedCreatesDesign() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        vm.startPrank(designer);
        vm.expectRevert(abi.encodeWithSelector(Errors.NotVerifiedDesigner.selector, designer));
        designMarketplace.createDesign(campaignId, "Design", "Desc", DESIGN_FILE_CID, "Qm", DESIGN_METADATA_HASH, 100 ether);
        vm.stopPrank();
    }

    function testFullFlowGetCampaignMetadata() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        string memory cid = campaignRegistry.getCampaignMetadataCid(campaignId);
        assertEq(keccak256(bytes(cid)), keccak256(bytes(CAMPAIGN_METADATA_CID)));

        bytes32 hash = campaignRegistry.getCampaignMetadataHash(campaignId);
        assertEq(hash, CAMPAIGN_METADATA_HASH);
    }

    function testFullFlowNGOUpdateProfile() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);

        vm.prank(ngo);
        ngoRegistry.updateNGOProfile("Updated NGO Name", "Updated description", "QmUpdatedProfile");
        
        (address wallet, , bool isActive) = ngoRegistry.getNGO(ngo);
        assertEq(wallet, ngo);
        assertTrue(isActive);
    }

    function testFullFlowDesignerUpdateProfile() public {
        designerRegistry.addDesigner(designer, "QmPortfolio");

        vm.prank(designer);
        designerRegistry.updateDesignerProfile(
            "Updated Designer",
            "Updated bio",
            "QmUpdatedPortfolio",
            "QmUpdatedProfile"
        );
        
        (address wallet, string memory portfolio, bool isActive) = designerRegistry.getDesigner(designer);
        assertEq(wallet, designer);
        assertTrue(isActive);
    }

    function testFullFlowDeactivateCampaign() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        (, , , , , bool active) = campaignRegistry.getCampaign(campaignId);
        assertTrue(active);

        campaignRegistry.deactivateCampaign(campaignId);
        
        (, , , , , active) = campaignRegistry.getCampaign(campaignId);
        assertFalse(active);
    }

    function testFullFlowRevertDonateToInactiveCampaign() public {
        ngoRegistry.addNGO(ngo, NGO_METADATA_CID);
        fileManager.storeFileHashAdmin(CAMPAIGN_METADATA_HASH, CAMPAIGN_METADATA_CID);
        
        uint256 campaignId = campaignRegistry.createCampaign(
            ngo,
            designer,
            NGO_SHARE_BPS,
            DESIGNER_SHARE_BPS,
            PLATFORM_SHARE_BPS,
            CAMPAIGN_METADATA_HASH
        );

        campaignRegistry.deactivateCampaign(campaignId);

        vm.deal(customer, 100 ether);
        vm.prank(customer);
        vm.expectRevert(abi.encodeWithSelector(Errors.InactiveCampaign.selector, campaignId));
        donationManager.donate{value: 100 ether}(campaignId, "metadata");
    }
}

