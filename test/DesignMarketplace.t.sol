// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {FileManager} from "../src/FileManager.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {DesignMarketplace} from "../src/DesignMarketplace.sol";
import {Errors} from "../src/Errors.sol";

interface IProofNFT_DM_T {
    function mintDonationNFT(address donor, uint256 campaignId, uint256 amount, string calldata metadataHash)
        external
        returns (uint256);
}

contract MockProofNFT_DM is IProofNFT_DM_T {
    mapping(address => bool) public managers;
    uint256 private serial;
    constructor() { serial = 1; }
    function setDonationManager(address m) external { managers[m] = true; }
    function mintDonationNFT(address, uint256, uint256, string calldata) external returns (uint256) {
        if (!managers[msg.sender]) revert Errors.NotDonationManager(msg.sender);
        return serial++;
    }
}

contract DesignMarketplaceFailPathsTest is Test {
    AdminRegistry adminRegistry;
    NGORegistry ngoRegistry;
    DesignerRegistry designerRegistry;
    FileManager fileManager;
    CampaignRegistry campaignRegistry;
    DesignMarketplace marketplace;
    MockProofNFT_DM proof;

    address admin;
    address ngo;
    address designer;

    bytes32 campaignMeta = keccak256("cmeta");
    string designMeta = "dmeta";

    function setUp() public {
        admin = address(this);
        ngo = address(0xAA);
        designer = address(0xBB);

        adminRegistry = new AdminRegistry(admin);
        ngoRegistry = new NGORegistry(admin, address(adminRegistry));
        designerRegistry = new DesignerRegistry(admin, address(adminRegistry));
        fileManager = new FileManager(admin, address(adminRegistry), address(ngoRegistry), address(designerRegistry));
        campaignRegistry = new CampaignRegistry(admin, address(adminRegistry), address(fileManager), address(ngoRegistry));
        proof = new MockProofNFT_DM();
        marketplace = new DesignMarketplace(
            admin, address(designerRegistry), address(campaignRegistry), address(proof), address(fileManager), admin, address(adminRegistry)
        );
        proof.setDonationManager(address(marketplace));

        ngoRegistry.addNGO(ngo, "cid");
        designerRegistry.addDesigner(designer, "pf");
        fileManager.storeFileHashAdmin(campaignMeta, "cid");
    }

    function createCampaign() internal returns (uint256) {
        return campaignRegistry.createCampaign(ngo, designer, 7000, 2000, 1000, campaignMeta);
    }

    function testPurchaseWrongPriceReverts() public {
        uint256 campaignId = createCampaign();
        vm.prank(designer);
        uint256 designId = marketplace.createDesign(
            campaignId, "Name", "Desc", "file", "img", designMeta, 1 ether
        );
        vm.deal(address(0xCAFE), 2 ether);
        vm.prank(address(0xCAFE));
        vm.expectRevert(abi.encodeWithSelector(Errors.InsufficientPayment.selector, 1 ether, 2 ether));
        marketplace.purchaseDesign{value: 2 ether}(designId);
    }

    function testPurchaseInactiveDesignReverts() public {
        uint256 campaignId = createCampaign();
        vm.prank(designer);
        uint256 designId = marketplace.createDesign(
            campaignId, "Name", "Desc", "file", "img", designMeta, 1 ether
        );
        marketplace.deactivateDesign(designId);
        vm.deal(address(0xCAFE), 1 ether);
        vm.prank(address(0xCAFE));
        vm.expectRevert(abi.encodeWithSelector(Errors.DesignNotActive.selector, designId));
        marketplace.purchaseDesign{value: 1 ether}(designId);
    }
}


