// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/**
 * @dev Interface of contract that can be invoked by a token contract during reflect or transfer.
 */
interface ICallbackContract {

    function reflectCallback(uint256 tAmount, uint256 rAmount) external;
    function reflectCallback(address account, uint256 tAmount, uint256 rAmount) external;
    function increaseBalanceCallback(address account, uint256 tAmount, uint256 rAmount) external;
    function decreaseBalanceCallback(address account, uint256 tAmount, uint256 rAmount) external;
    function decreaseTotalSupplyCallback(uint256 tAmount, uint256 rAmount) external;
    function transferCallback(address from, address to, uint256 tFromAmount, uint256 rFromAmount, uint256 tToAmount, uint256 rToAmount) external;
    function burnCallback(address account, uint256 tAmount, uint256 rAmount) external;

}
