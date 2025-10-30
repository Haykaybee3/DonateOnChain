// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {FileManager} from "../src/FileManager.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {DonationManager} from "../src/DonationManager.sol";

interface IProofNFT_DM_C {
    function mintDonationNFT(address donor, uint256 campaignId, uint256 amount, string calldata metadataHash)
        external
        returns (uint256);
}

contract MockProofNFT_DM_C is IProofNFT_DM_C {
    address public donationManager;
    uint256 private serial;

    constructor() {
        serial = 1;
    }

    function setDonationManager(address m) external {
        donationManager = m;
    }

    function mintDonationNFT(address, uint256, uint256, string calldata) external returns (uint256) {
        require(msg.sender == donationManager, "NDM");
        return serial++;
    }
}

contract DonationManagerConfigTest is Test {
    AdminRegistry adminRegistry;
    NGORegistry ngoRegistry;
    DesignerRegistry designerRegistry;
    FileManager fileManager;
    CampaignRegistry campaignRegistry;
    DonationManager donationManager;
    MockProofNFT_DM_C proof;

    address admin;
    address ngo;
    address designer;

    bytes32 meta = keccak256("m");

    event HCSTopicIdSet(address indexed topicId);
    event HCSLoggingDisabled();

    function setUp() public {
        admin = address(this);
        ngo = address(0xA1);
        designer = address(0xB1);

        adminRegistry = new AdminRegistry(admin);
        ngoRegistry = new NGORegistry(admin, address(adminRegistry));
        designerRegistry = new DesignerRegistry(admin, address(adminRegistry));
        fileManager = new FileManager(admin, address(adminRegistry), address(ngoRegistry), address(designerRegistry));
        campaignRegistry =
            new CampaignRegistry(admin, address(adminRegistry), address(fileManager), address(ngoRegistry));

        proof = new MockProofNFT_DM_C();
        donationManager = new DonationManager(admin, address(campaignRegistry), address(proof), admin);
        proof.setDonationManager(address(donationManager));

        ngoRegistry.addNGO(ngo, "cid");
        designerRegistry.addDesigner(designer, "pf");
        fileManager.storeFileHashAdmin(meta, "cid");
        campaignRegistry.createCampaign(ngo, designer, 7000, 2000, 1000, meta);
    }

    function testSetHCSTopicEmits() public {
        address topic = address(0x777);
        vm.expectEmit(false, false, false, true);
        emit HCSTopicIdSet(topic);
        donationManager.setHcsTopicId(topic);
    }

    function testDisableHCSLoggingEmits() public {
        donationManager.setHcsTopicId(address(0x777));
        vm.expectEmit(false, false, false, true);
        emit HCSLoggingDisabled();
        donationManager.disableHCSLogging();
    }
}
