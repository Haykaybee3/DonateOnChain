// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";

contract AddAdmins is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address adminRegistry = vm.envAddress("ADMIN_REGISTRY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AdminRegistry registry = AdminRegistry(adminRegistry);
        
        address[] memory adminsToAdd = new address[](3);
        adminsToAdd[0] = 0x1111111111111111111111111111111111111111;
        adminsToAdd[1] = 0x2222222222222222222222222222222222222222;
        adminsToAdd[2] = 0x3333333333333333333333333333333333333333;
        
        for (uint256 i = 0; i < adminsToAdd.length; i++) {
            try registry.addAdmin(adminsToAdd[i]) {
                console.log("Added admin:", adminsToAdd[i]);
            } catch {
                console.log("Failed to add admin:", adminsToAdd[i]);
            }
        }
        
        vm.stopBroadcast();
    }
}

