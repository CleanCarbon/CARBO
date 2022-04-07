// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/**
 * @dev Interface of FeeManager
 */
interface IFeeManager {

    function setFeeAddresses(address buyback, address treasury, address liquidity) external;
    function setDividendManager(address _address) external;
    function buyFeeHolder() external returns (address);
    function sellFeeHolder() external returns (address);

}
