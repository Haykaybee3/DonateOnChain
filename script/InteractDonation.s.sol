// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {FileManager} from "../src/FileManager.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {DonationManager} from "../src/DonationManager.sol";
import {ProofNFT} from "../src/ProofNFT.sol";

contract InteractDonation is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        address adminRegistryAddr = vm.envAddress("ADMIN_REGISTRY");
        address ngoRegistryAddr = vm.envAddress("NGO_REGISTRY");
        address designerRegistryAddr = vm.envAddress("DESIGNER_REGISTRY");
        address fileManagerAddr = vm.envAddress("FILE_MANAGER");
        address campaignRegistryAddr = vm.envAddress("CAMPAIGN_REGISTRY");
        address donationManagerAddr = vm.envAddress("DONATION_MANAGER");
        address proofNFTAddr = vm.envAddress("PROOF_NFT");

        vm.startBroadcast(deployerPrivateKey);

        AdminRegistry adminRegistry = AdminRegistry(adminRegistryAddr);
        NGORegistry ngoRegistry = NGORegistry(ngoRegistryAddr);
        DesignerRegistry designerRegistry = DesignerRegistry(designerRegistryAddr);
        FileManager fileManager = FileManager(fileManagerAddr);
        CampaignRegistry campaignRegistry = CampaignRegistry(campaignRegistryAddr);
        DonationManager donationManager = DonationManager(payable(donationManagerAddr));
        ProofNFT proofNFT = ProofNFT(proofNFTAddr);

        console.log("=== Donation System Interaction ===");
        console.log("Admin Registry:", address(adminRegistry));
        console.log("NGO Registry:", address(ngoRegistry));
        console.log("Designer Registry:", address(designerRegistry));
        console.log("File Manager:", address(fileManager));
        console.log("Campaign Registry:", address(campaignRegistry));
        console.log("Donation Manager:", address(donationManager));
        console.log("Proof NFT:", address(proofNFT));

        console.log("\n=== Making Test Donation ===");
        uint256 donationAmount = 1 ether;
        console.log("Donation Amount:", donationAmount);

        uint256 campaignId = 0;
        uint256 nftSerial = donationManager.donate{value: donationAmount}(campaignId, "test-metadata");
        console.log("Donation processed successfully!");
        console.log("NFT Serial Number:", nftSerial);

        vm.stopBroadcast();

        console.log("\n=== Interaction Complete ===");
    }
}
