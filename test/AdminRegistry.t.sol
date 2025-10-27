// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AdminRegistry} from "../src/AdminRegistry.sol";
import {Errors} from "../src/Errors.sol";

contract AdminRegistryTest is Test {
    AdminRegistry public adminRegistry;
    address public owner;
    address public admin;

    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);

    function setUp() public {
        owner = address(this);
        admin = address(0x1);
        adminRegistry = new AdminRegistry(owner);
    }

    function testOwnerIsAdmin() public {
        assertTrue(adminRegistry.isAdmin(owner));
    }

    function testAddAdmin() public {
        vm.expectEmit(true, false, false, true);
        emit AdminAdded(admin, owner);
        
        adminRegistry.addAdmin(admin);
        assertTrue(adminRegistry.isAdmin(admin));
    }

    function testRemoveAdmin() public {
        adminRegistry.addAdmin(admin);
        assertTrue(adminRegistry.isAdmin(admin));

        vm.expectEmit(true, false, false, true);
        emit AdminRemoved(admin, owner);
        
        adminRegistry.removeAdmin(admin);
        assertFalse(adminRegistry.isAdmin(admin));
    }

    function testRevertAddZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidAddress.selector, address(0)));
        adminRegistry.addAdmin(address(0));
    }

    function testRevertRemoveZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidAddress.selector, address(0)));
        adminRegistry.removeAdmin(address(0));
    }

    function testOnlyOwnerCanAddAdmin() public {
        vm.prank(address(0x999));
        vm.expectRevert();
        adminRegistry.addAdmin(admin);
    }

    function testOnlyOwnerCanRemoveAdmin() public {
        adminRegistry.addAdmin(admin);
        vm.prank(address(0x999));
        vm.expectRevert();
        adminRegistry.removeAdmin(admin);
    }

    function testMultipleAdmins() public {
        address admin2 = address(0x2);
        address admin3 = address(0x3);

        adminRegistry.addAdmin(admin);
        adminRegistry.addAdmin(admin2);
        adminRegistry.addAdmin(admin3);

        assertTrue(adminRegistry.isAdmin(admin));
        assertTrue(adminRegistry.isAdmin(admin2));
        assertTrue(adminRegistry.isAdmin(admin3));
    }
}

