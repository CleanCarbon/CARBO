// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interfaces/ICallbackContract.sol";

contract CallbackContractMock is ICallbackContract {
    address public reflectCallbackAccount;
    uint256 public reflectCallbackTAmount;
    uint256 public reflectCallbackRAmount;
    address public increaseBalanceCallbackAccount;
    uint256 public increaseBalanceCallbackTAmount;
    uint256 public increaseBalanceCallbackRAmount;
    address public decreaseBalanceCallbackAccount;
    uint256 public decreaseBalanceCallbackTAmount;
    uint256 public decreaseBalanceCallbackRAmount;
    address public transferCallbackFromAccount;
    address public transferCallbackToAccount;
    uint256 public transferCallbackTFromAmount;
    uint256 public transferCallbackRFromAmount;
    uint256 public transferCallbackTToAmount;
    uint256 public transferCallbackRToAmount;

    function reflectCallback(uint256 tAmount, uint256 rAmount) external override {
        reflectCallbackTAmount = tAmount;
        reflectCallbackRAmount = rAmount;
    }

    function reflectCallback(address account, uint256 tAmount, uint256 rAmount) external override {}

    function increaseBalanceCallback(address account, uint256 tAmount, uint256 rAmount) external override {
        increaseBalanceCallbackAccount = account;
        increaseBalanceCallbackTAmount = tAmount;
        increaseBalanceCallbackRAmount = rAmount;
    }

    function decreaseBalanceCallback(address account, uint256 tAmount, uint256 rAmount) external override {
        decreaseBalanceCallbackAccount = account;
        decreaseBalanceCallbackTAmount = tAmount;
        decreaseBalanceCallbackRAmount = rAmount;
    }

    function decreaseTotalSupplyCallback(uint256 tAmount, uint256 rAmount) external override {
    }


    function transferCallback(address from, address to, uint256 tFromAmount, uint256 rFromAmount, uint256 tToAmount, uint256 rToAmount) external override {
        transferCallbackFromAccount = from;
        transferCallbackToAccount = to;
        transferCallbackTFromAmount = tFromAmount;
        transferCallbackRFromAmount = rFromAmount;
        transferCallbackTToAmount = tToAmount;
        transferCallbackRToAmount = rToAmount;
    }

    function burnCallback(address account, uint256 tAmount, uint256 rAmount) external override {}
}
