// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {DonationManager} from "../src/DonationManager.sol";
import {ProofNFT} from "../src/ProofNFT.sol";
import {DesignMarketplace} from "../src/DesignMarketplace.sol";

contract DeployCampaignSystem is Script {
    function run() external returns (
        CampaignRegistry campaignRegistry,
        ProofNFT proofNFT,
        DonationManager donationManager,
        DesignMarketplace designMarketplace
    ) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        address platformWallet = vm.envAddress("PLATFORM_WALLET");
        
        address adminRegistry = vm.envAddress("ADMIN_REGISTRY");
        address fileManager = vm.envAddress("FILE_MANAGER");
        address ngoRegistry = vm.envAddress("NGO_REGISTRY");
        address designerRegistry = vm.envAddress("DESIGNER_REGISTRY");

        vm.startBroadcast(deployerPrivateKey);

        campaignRegistry = new CampaignRegistry(deployerAddress, adminRegistry, fileManager, ngoRegistry);
        console.log("CampaignRegistry deployed at:", address(campaignRegistry));

        proofNFT = new ProofNFT(deployerAddress);
        console.log("ProofNFT deployed at:", address(proofNFT));

        donationManager = new DonationManager(deployerAddress, address(campaignRegistry), address(proofNFT), platformWallet);
        console.log("DonationManager deployed at:", address(donationManager));

        designMarketplace = new DesignMarketplace(
            deployerAddress,
            designerRegistry,
            address(campaignRegistry),
            address(proofNFT),
            fileManager,
            platformWallet,
            adminRegistry
        );
        console.log("DesignMarketplace deployed at:", address(designMarketplace));

        proofNFT.setDonationManager(address(donationManager));
        console.log("DonationManager authorized as minter on ProofNFT");

        try vm.envAddress("NFT_TOKEN_ID") returns (address nftTokenId) {
            if (nftTokenId != address(0)) {
                proofNFT.setTokenId(nftTokenId);
                console.log("NFT Token ID set to:", nftTokenId);
            }
        } catch {}

        try vm.envAddress("HCS_TOPIC_ID") returns (address hcsTopicId) {
            if (hcsTopicId != address(0)) {
                donationManager.setHcsTopicId(hcsTopicId);
                console.log("HCS Topic ID set to:", hcsTopicId);
            }
        } catch {}

        vm.stopBroadcast();
    }
}

