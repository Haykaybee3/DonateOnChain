// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DonationManager} from "../src/DonationManager.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {ProofNFT} from "../src/ProofNFT.sol";

contract DonateToCampaign is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        address donationManagerAddr = vm.envAddress("DONATION_MANAGER");
        address campaignRegistryAddr = vm.envAddress("CAMPAIGN_REGISTRY");
        address proofNFTAddr = vm.envAddress("PROOF_NFT");

        console.log("=== Donation Test - Pre-flight Checks ===");
        console.log("Donor Address:", deployerAddress);
        console.log("Donation Manager:", donationManagerAddr);
        
        vm.startBroadcast(deployerPrivateKey);

        DonationManager donationManager = DonationManager(payable(donationManagerAddr));
        CampaignRegistry campaignRegistry = CampaignRegistry(campaignRegistryAddr);
        ProofNFT proofNFT = ProofNFT(proofNFTAddr);

        address nftTokenId = proofNFT.nftTokenId();
        address proofNFTDonationManager = proofNFT.donationManager();
        
        console.log("Proof NFT Token ID:", nftTokenId);
        console.log("Proof NFT Contract:", proofNFTAddr);
        console.log("NFT Donation Manager:", proofNFTDonationManager);
        
        if (nftTokenId == address(0)) {
            console.log("ERROR: NFT Token ID not set in ProofNFT contract!");
            revert("NFT Token ID not configured");
        }
        
        if (proofNFTDonationManager != donationManagerAddr) {
            console.log("ERROR: ProofNFT donation manager mismatch!");
            console.log("Expected:", donationManagerAddr);
            console.log("Actual:", proofNFTDonationManager);
            revert("Donation manager mismatch");
        }

        uint256[] memory activeCampaigns = campaignRegistry.getActiveCampaigns();
        console.log("\nActive Campaigns:", activeCampaigns.length);
        
        if (activeCampaigns.length == 0) {
            console.log("ERROR: No active campaigns available!");
            revert("No active campaigns");
        }

        uint256 campaignId = activeCampaigns[0];
        (address ngo, address designer, uint256 ngoBps, uint256 designerBps, uint256 platformBps, bool active) = 
            campaignRegistry.getCampaign(campaignId);
        
        console.log("\n=== Campaign Details ===");
        console.log("Campaign ID:", campaignId);
        console.log("NGO:", ngo);
        console.log("Designer:", designer);
        console.log("NGO Share (BPS):", ngoBps);
        console.log("Designer Share (BPS):", designerBps);
        console.log("Platform Share (BPS):", platformBps);
        console.log("Active:", active);

        if (!active) {
            console.log("ERROR: Campaign is not active!");
            revert("Campaign not active");
        }

        uint256 donationAmount = 10 * 1e8;
        string memory metadataHash = "donation-test-metadata";
        
        uint256 donorBalanceBefore = deployerAddress.balance;
        uint256 ngoBalanceBefore = ngo.balance;
        uint256 designerBalanceBefore = designer.balance;

        console.log("\n=== Making Donation ===");
        console.log("Donation Amount:", donationAmount / 1e8, "HBAR");
        console.log("Donation Amount (tinybars):", donationAmount);
        console.log("Metadata Hash:", metadataHash);

        uint256 nftSerial = donationManager.donate{value: donationAmount}(
            campaignId, 
            metadataHash
        );
        
        uint256 donorBalanceAfter = deployerAddress.balance;
        uint256 ngoBalanceAfter = ngo.balance;
        uint256 designerBalanceAfter = designer.balance;

        console.log("\n=== Donation Results ===");
        console.log("NFT Serial Number:", nftSerial);
        console.log("HBAR Deducted:", (donorBalanceBefore - donorBalanceAfter) / 1e8, "HBAR");
        console.log("NGO Balance Increase:", (ngoBalanceAfter - ngoBalanceBefore) / 1e8, "HBAR");
        console.log("Designer Balance Increase:", (designerBalanceAfter - designerBalanceBefore) / 1e8, "HBAR");
        console.log("\nDonation successful! NFT minted with serial:", nftSerial);

        vm.stopBroadcast();
    }
}
