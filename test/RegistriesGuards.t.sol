// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {NGORegistry} from "../src/NGORegistry.sol";
import {DesignerRegistry} from "../src/DesignerRegistry.sol";
import {Errors} from "../src/Errors.sol";

contract RegistriesGuardsTest is Test {
    AdminRegistry adminRegistry;
    NGORegistry ngoRegistry;
    DesignerRegistry designerRegistry;

    address admin;
    address ngo;
    address designer;

    function setUp() public {
        admin = address(this);
        ngo = address(0x10);
        designer = address(0x20);

        adminRegistry = new AdminRegistry(admin);
        ngoRegistry = new NGORegistry(admin, address(adminRegistry));
        designerRegistry = new DesignerRegistry(admin, address(adminRegistry));

        ngoRegistry.registerNGOPending("n", "d", "p", "cid");
        designerRegistry.registerDesignerPending("n", "b", "pf", "pi");
    }

    function testApproveRejectZeroAddressReverts() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidAddress.selector, address(0)));
        ngoRegistry.approveNGO(address(0));
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidAddress.selector, address(0)));
        ngoRegistry.rejectNGO(address(0));

        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidAddress.selector, address(0)));
        designerRegistry.approveDesigner(address(0));
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidAddress.selector, address(0)));
        designerRegistry.rejectDesigner(address(0));
    }
}
