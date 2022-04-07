// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RecoverableFunds.sol";

contract FeeHolder is RecoverableFunds {

    address public manager;
    IERC20 public token;

    modifier onlyManager() {
        require(owner() == _msgSender(), "LiquidityHolder: caller is not the manager");
        _;
    }

    constructor(address _token) {
        token = IERC20(_token);
        manager = _msgSender();
    }

    function getTokens() external onlyManager returns (uint256) {
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) token.transfer(manager, balance);
        return balance;
    }

}

