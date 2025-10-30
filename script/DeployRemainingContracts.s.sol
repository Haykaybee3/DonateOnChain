// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {ProofNFT} from "../src/ProofNFT.sol";
import {DonationManager} from "../src/DonationManager.sol";
import {DesignMarketplace} from "../src/DesignMarketplace.sol";

contract DeployRemainingContracts is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        address adminRegistry = vm.envAddress("ADMIN_REGISTRY");
        address ngoRegistry = vm.envAddress("NGO_REGISTRY");
        address designerRegistry = vm.envAddress("DESIGNER_REGISTRY");
        address fileManager = vm.envAddress("FILE_MANAGER");
        address platformWallet = vm.envAddress("PLATFORM_WALLET");

        vm.startBroadcast(pk);

        address owner = vm.addr(pk);

        CampaignRegistry campaignRegistry = new CampaignRegistry(
            owner,
            adminRegistry,
            fileManager,
            ngoRegistry
        );

        ProofNFT proofNFT = new ProofNFT(owner);

        DonationManager donationManager = new DonationManager(
            owner,
            address(campaignRegistry),
            address(proofNFT),
            platformWallet
        );

        DesignMarketplace marketplace = new DesignMarketplace(
            owner,
            designerRegistry,
            address(campaignRegistry),
            address(proofNFT),
            fileManager,
            platformWallet,
            adminRegistry
        );

        proofNFT.setDonationManager(address(donationManager));

        console.log("CampaignRegistry:", address(campaignRegistry));
        console.log("ProofNFT:", address(proofNFT));
        console.log("DonationManager:", address(donationManager));
        console.log("DesignMarketplace:", address(marketplace));

        vm.stopBroadcast();
    }
}


