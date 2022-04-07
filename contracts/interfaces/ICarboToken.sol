// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Interface of CarboToken
 */
interface ICarboToken is IERC20 {

    struct Amounts {
        uint256 sum;
        uint256 transfer;
        uint256 rfi;
        uint256 dividends;
        uint256 buyback;
        uint256 treasury;
        uint256 liquidity;
    }

    struct Fees {
        uint256 rfi;
        uint256 dividends;
        uint256 buyback;
        uint256 treasury;
        uint256 liquidity;
    }

    struct FeeAddresses {
        address dividends;
        address buyback;
        address treasury;
        address liquidity;
    }

    enum FeeType { BUY, SELL, NONE}

    event FeeTaken(uint256 rfi, uint256 dividends, uint256 buyback, uint256 treasury, uint256 liquidity);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external pure returns (uint8);
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
    function getFees(FeeType feeType) external view returns (Fees memory);
    function setFees(FeeType feeType, uint rfi, uint dividends, uint buyback, uint treasury, uint liquidity) external;
    function getFeeAddresses(FeeType feeType) external view returns (FeeAddresses memory);
    function setFeeAddresses(FeeType feeType, address dividends, address buyback, address treasury, address liquidity) external;
    function setTaxable(address account, bool value) external;
    function setTaxExempt(address account, bool value) external;
    function getROwned(address account) external view returns (uint256);
    function getRTotal() external view returns (uint256);
    function excludeFromRFI(address account) external;
    function includeInRFI(address account) external;
    function reflect(uint256 tAmount) external;
    function reflectionFromToken(uint256 tAmount) external view returns (uint256);
    function tokenFromReflection(uint256 rAmount) external view returns (uint256);

}
