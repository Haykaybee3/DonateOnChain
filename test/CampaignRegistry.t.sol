// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {FileManager} from "../src/FileManager.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {Errors} from "../src/Errors.sol";

contract CampaignRegistryTest is Test {
    AdminRegistry adminRegistry;
    NGORegistry ngoRegistry;
    FileManager fileManager;
    CampaignRegistry campaignRegistry;

    address admin;
    address ngo;
    address designer;

    bytes32 metadataHash = keccak256("cid");

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

    function setUp() public {
        admin = address(this);
        ngo = address(0x111);
        designer = address(0x222);

        adminRegistry = new AdminRegistry(admin);
        ngoRegistry = new NGORegistry(admin, address(adminRegistry));
        fileManager = new FileManager(admin, address(adminRegistry), address(ngoRegistry), address(0xdead));
        campaignRegistry = new CampaignRegistry(admin, address(adminRegistry), address(fileManager), address(ngoRegistry));

        ngoRegistry.addNGO(ngo, "cid");
        fileManager.storeFileHashAdmin(metadataHash, "cid");
    }

    function testCreateCampaignEmitsEvent() public {
        vm.expectEmit(true, true, true, false);
        emit CampaignCreated(0, ngo, designer, 7000, 2000, 1000, metadataHash, admin);
        uint256 id = campaignRegistry.createCampaign(ngo, designer, 7000, 2000, 1000, metadataHash);
        assertEq(id, 0);
    }

    function testUpdateCampaignEmitsAndValidates() public {
        uint256 id = campaignRegistry.createCampaign(ngo, designer, 7000, 2000, 1000, metadataHash);
        vm.expectRevert(Errors.EmptyMetadata.selector);
        campaignRegistry.updateCampaign(id, "", "desc", "img");
        vm.expectRevert(Errors.EmptyMetadata.selector);
        campaignRegistry.updateCampaign(id, "title", "", "img");
        vm.expectEmit(true, false, false, true);
        emit CampaignUpdated(id, "title", "desc", "img", admin);
        campaignRegistry.updateCampaign(id, "title", "desc", "img");
    }

    function testDeactivateCampaign() public {
        uint256 id = campaignRegistry.createCampaign(ngo, designer, 7000, 2000, 1000, metadataHash);
        vm.expectEmit(true, true, false, false);
        emit CampaignDeactivated(id, admin);
        campaignRegistry.deactivateCampaign(id);
        (,,,,, bool active) = campaignRegistry.getCampaign(id);
        assertFalse(active);
    }

    function testCreateCampaignByNGOValidation() public {
        vm.prank(ngo);
        vm.expectRevert(Errors.EmptyMetadata.selector);
        campaignRegistry.createCampaignByNGO(designer, "", "desc", "img", metadataHash, 0, 7000, 2000, 1000);

        vm.prank(ngo);
        vm.expectRevert(Errors.EmptyMetadata.selector);
        campaignRegistry.createCampaignByNGO(designer, "title", "", "img", metadataHash, 0, 7000, 2000, 1000);
    }
}


