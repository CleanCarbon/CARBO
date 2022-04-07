// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/**
 * @dev Interface of DividendManager
 */
interface IDividendManager {

    function distributeDividends(uint256 amount) external;
    function setBUSD(address _busd) external;
    function setToken(address _token) external;
    function excludeFromDividends(address account) external;

}
