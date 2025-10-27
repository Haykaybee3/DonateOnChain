// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Errors} from "./Errors.sol";

contract AdminRegistry is Ownable {
    mapping(address => bool) private admins;

    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);

    constructor(address initialOwner) Ownable(initialOwner) {
        admins[initialOwner] = true;
        emit AdminAdded(initialOwner, address(0));
    }

    function addAdmin(address admin) external onlyOwner {
        if (admin == address(0)) revert Errors.InvalidAddress(admin);
        if (admins[admin]) return;
        
        admins[admin] = true;
        emit AdminAdded(admin, msg.sender);
    }

    function removeAdmin(address admin) external onlyOwner {
        if (admin == address(0)) revert Errors.InvalidAddress(admin);
        if (!admins[admin]) return;
        
        admins[admin] = false;
        emit AdminRemoved(admin, msg.sender);
    }

    function isAdmin(address user) external view returns (bool) {
        return admins[user];
    }
}

