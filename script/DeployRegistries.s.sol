// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {FileManager} from "../src/FileManager.sol";

contract DeployRegistries is Script {
    function run()
        external
        returns (
            AdminRegistry adminRegistry,
            NGORegistry ngoRegistry,
            DesignerRegistry designerRegistry,
            FileManager fileManager
        )
    {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        adminRegistry = new AdminRegistry(deployerAddress);
        console.log("AdminRegistry deployed at:", address(adminRegistry));

        ngoRegistry = new NGORegistry(deployerAddress, address(adminRegistry));
        console.log("NGORegistry deployed at:", address(ngoRegistry));

        designerRegistry = new DesignerRegistry(deployerAddress, address(adminRegistry));
        console.log("DesignerRegistry deployed at:", address(designerRegistry));

        fileManager =
            new FileManager(deployerAddress, address(adminRegistry), address(ngoRegistry), address(designerRegistry));
        console.log("FileManager deployed at:", address(fileManager));

        vm.stopBroadcast();
    }
}
