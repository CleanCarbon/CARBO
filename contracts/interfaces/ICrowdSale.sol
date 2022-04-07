// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/**
 * @dev Interface of CrowdSale contract.
 */
interface ICrowdSale {

    function setToken(address newTokenAddress) external;
    function setVestingWallet(address newVestingWalletAddress) external;
    function setPercentRate(uint256 newPercentRate) external;
    function setFundraisingWallet(address payable newFundraisingWalletAddress) external;
    function setPrice(uint256 newPrice) external;
    function setStage(uint256 id,uint256 start, uint256 end, uint256 bonus, uint256 minInvestmentLimit, uint256 maxInvestmentLimit, uint256 hardcapInTokens, uint256 vestingSchedule, uint256 invested, uint256 tokensSold, bool whitelist) external returns (bool);

}
