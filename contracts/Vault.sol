// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct UserInfo {
        address addr; // user's wallet address
        uint256 amount; // amount deposited
    }

    // ERC20 Token address
    IERC20 public immutable anyToken;

    // User List
    UserInfo[] public users;

    // mapping from user to user list id
    mapping(address => uint256) internal u2id;

    constructor(address tokenAddress) {
        anyToken = IERC20(tokenAddress);

        // index zero is not related to any user
        users.push(UserInfo(address(0), 0));
    }

    /**
     * @notice deposit function of vault contract
     * @notice if the user never deposited till now, then add a new element in users array, and update u2id mapping as well.
     * @notice otherwise just update u2id mapping value.
     * @param _amount           deposited amount of anyToken into the vault contract
     */
    function deposit(uint256 _amount) external nonReentrant {
        uint256 id = u2id[msg.sender];

        if (id == 0) {
            users.push(UserInfo(msg.sender, _amount));
            u2id[msg.sender] = users.length - 1;
        } else {
            users[id].amount += _amount;
        }

        IERC20(anyToken).safeTransferFrom(msg.sender, address(this), _amount);
    }

    /**
     * @notice withdraw function of vault contract
     * @notice should prevent function from reentrancy attack
     * @param _amount           withdrawl amount of anyToken from the vault contract
     * @dev                     reverts if user doesn't exist or withdrawal amount is grater than balance.
     */
    function withdraw(uint256 _amount) external nonReentrant {
        uint256 id = u2id[msg.sender];
        require(id > 0, "user doesn't exist");
        require(users[id].amount >= _amount, "Can't withdraw that much");

        users[id].amount -= _amount;
        IERC20(anyToken).safeTransfer(msg.sender, _amount);
    }

    /**
     * @notice   time complexity of this function is O(n), `n` is number of users
     * @notice   this function is not intended to be called frequently
     * @dev      reverts if lower than two users
     * @return   return two users who have most funds
     */
    function twoWhales() external view returns (address, address) {
        require(users.length >= 3, "Less than two users");

        uint256[2] memory idWhales;
        idWhales[0] = 1; // biggest whale
        idWhales[1] = 2; // second biggest

        if (users[2].amount > users[1].amount) {
            idWhales[1] = 1;
            idWhales[0] = 2;
        }

        for (uint256 i = 3; i < users.length; i++) {
            if (users[i].amount > users[idWhales[0]].amount) {
                idWhales[1] = idWhales[0];
                idWhales[0] = i;
            } else if (users[idWhales[1]].amount < users[i].amount) {
                idWhales[1] = i;
            }
        }
        return (users[idWhales[0]].addr, users[idWhales[1]].addr);
    }
}
