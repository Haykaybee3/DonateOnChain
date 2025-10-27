// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ProofNFT} from "../src/ProofNFT.sol";
import {DonationManager} from "../src/DonationManager.sol";

contract ConfigureContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proofNFTAddr = vm.envAddress("PROOF_NFT");
        address donationManagerAddr = vm.envAddress("DONATION_MANAGER");

        vm.startBroadcast(deployerPrivateKey);

        ProofNFT proofNFT = ProofNFT(proofNFTAddr);
        DonationManager donationManager = DonationManager(payable(donationManagerAddr));

        console.log("\n=== Configuring Contracts ===");
        console.log("ProofNFT:", proofNFTAddr);
        console.log("DonationManager:", donationManagerAddr);

        try vm.envAddress("NFT_TOKEN_ID") returns (address nftTokenId) {
            if (nftTokenId != address(0)) {
                proofNFT.setTokenId(nftTokenId);
                console.log("NFT Token ID set to:", nftTokenId);
            }
        } catch {
            console.log("NFT_TOKEN_ID not found in .env");
        }

        try vm.envAddress("HCS_TOPIC_ID") returns (address hcsTopicId) {
            if (hcsTopicId != address(0)) {
                donationManager.setHcsTopicId(hcsTopicId);
                console.log("HCS Topic ID set to:", hcsTopicId);
            }
        } catch {
            console.log("HCS_TOPIC_ID not found in .env");
        }

        vm.stopBroadcast();

        console.log("\n=== Configuration Complete ===");
    }
}
