// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {FileManager} from "../src/FileManager.sol";

contract SetupTestCampaigns is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        address adminRegistryAddr = vm.envAddress("ADMIN_REGISTRY");
        address ngoRegistryAddr = vm.envAddress("NGO_REGISTRY");
        address designerRegistryAddr = vm.envAddress("DESIGNER_REGISTRY");
        address campaignRegistryAddr = vm.envAddress("CAMPAIGN_REGISTRY");
        address fileManagerAddr = vm.envAddress("FILE_MANAGER");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AdminRegistry adminRegistry = AdminRegistry(adminRegistryAddr);
        NGORegistry ngoRegistry = NGORegistry(ngoRegistryAddr);
        DesignerRegistry designerRegistry = DesignerRegistry(designerRegistryAddr);
        CampaignRegistry campaignRegistry = CampaignRegistry(campaignRegistryAddr);
        FileManager fileManager = FileManager(fileManagerAddr);
        
        console.log("=== Setting up test campaigns ===");
        
        address testNGO = address(0x1111111111111111111111111111111111111111);
        address testDesigner = address(0x2222222222222222222222222222222222222222);
        
        console.log("Adding test NGO...");
        ngoRegistry.addNGO(testNGO, "ipfs://QmTestNGOMetadata");
        
        console.log("Adding test Designer...");
        designerRegistry.addDesigner(testDesigner, "ipfs://QmTestDesignerPortfolio");
        
        console.log("Storing metadata files...");
        bytes32[] memory metadataHashes = new bytes32[](4);
        metadataHashes[0] = keccak256(abi.encodePacked("clean-oceans"));
        metadataHashes[1] = keccak256(abi.encodePacked("climate-change"));
        metadataHashes[2] = keccak256(abi.encodePacked("education"));
        metadataHashes[3] = keccak256(abi.encodePacked("healthcare"));
        
        fileManager.storeFileHashAdmin(metadataHashes[0], "ipfs://QmCleanOceans");
        fileManager.storeFileHashAdmin(metadataHashes[1], "ipfs://QmClimateChange");
        fileManager.storeFileHashAdmin(metadataHashes[2], "ipfs://QmEducation");
        fileManager.storeFileHashAdmin(metadataHashes[3], "ipfs://QmHealthcare");
        
        console.log("Creating test campaigns...");
        for (uint256 i = 0; i < metadataHashes.length; i++) {
            uint256 campaignId = campaignRegistry.createCampaign(
                testNGO,
                testDesigner,
                7000,
                2000,
                1000,
                metadataHashes[i]
            );
            console.log("Campaign created with ID:", campaignId);
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== Test campaigns configured successfully! ===");
    }
}

