// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./interfaces/ICarboToken.sol";
import "./interfaces/IDividendManager.sol";
import "./FeeHolder.sol";
import "./RecoverableFunds.sol";

contract FeeManager is Ownable, RecoverableFunds {

    struct Addresses {
        address buyback;
        address treasury;
        address liquidity;
    }

    struct Amounts {
        uint256 dividends;
        uint256 buyback;
        uint256 treasury;
        uint256 liquidity;
        uint256 sum;
    }

    IUniswapV2Router02 public uniswapRouter;
    IERC20 public busd;
    ICarboToken public carbo;
    IDividendManager public dividendManager;
    FeeHolder public buyFeeHolder;
    FeeHolder public sellFeeHolder;

    Addresses public addresses;

    constructor(address _router, address _busd, address _carbo) {
        carbo = ICarboToken(_carbo);
        busd = IERC20(_busd);
        uniswapRouter = IUniswapV2Router02(_router);
        buyFeeHolder = new FeeHolder(_carbo);
        sellFeeHolder = new FeeHolder(_carbo);
    }

    function setFeeAddresses(address buyback, address treasury, address liquidity) external onlyOwner {
        addresses = Addresses(buyback, treasury, liquidity);
    }

    function setDividendManager(address _address) external onlyOwner {
        dividendManager = IDividendManager(_address);
    }

    function swapAndDistribute() external onlyOwner {
        ICarboToken.Fees memory buyFees = carbo.getFees(ICarboToken.FeeType.BUY);
        ICarboToken.Fees memory sellFees = carbo.getFees(ICarboToken.FeeType.SELL);
        uint256 buyFeeTotal = buyFeeHolder.getTokens();
        uint256 sellFeeTotal = sellFeeHolder.getTokens();
        uint256 feeTotal = buyFeeTotal + sellFeeTotal;
        require(feeTotal > 0, "FeeManager: nothing to distribute");
        Amounts memory buyFeeAmounts = _getAmounts(buyFeeTotal, buyFees);
        Amounts memory sellFeeAmounts = _getAmounts(sellFeeTotal, sellFees);
        uint256 notToSwap = (buyFeeAmounts.liquidity + sellFeeAmounts.liquidity) / 2;
        uint256 toSwap = feeTotal - notToSwap;
        require(toSwap > 0, "FeeManager: nothing to swap");
        _swap(toSwap);
        uint256 busdReceived = busd.balanceOf(address(this));
        uint256 dividends = busdReceived * (buyFeeAmounts.dividends + sellFeeAmounts.dividends) / feeTotal;
        uint256 buyback = busdReceived * (buyFeeAmounts.buyback + sellFeeAmounts.buyback) / feeTotal;
        uint256 treasury = busdReceived * (buyFeeAmounts.treasury + sellFeeAmounts.treasury) / feeTotal;
        uint256 liquidity = busdReceived - dividends - buyback - treasury;
        busd.approve(address(dividendManager), dividends);
        dividendManager.distributeDividends(dividends);
        busd.transfer(addresses.buyback, buyback);
        busd.transfer(addresses.treasury, treasury);
        busd.transfer(addresses.liquidity, liquidity);
        carbo.transfer(addresses.liquidity, notToSwap);
    }

    function _getAmounts(uint256 amount, ICarboToken.Fees memory fees) internal view returns (Amounts memory amounts) {
        Amounts memory amounts;
        uint256 denominator = fees.dividends + fees.buyback + fees.treasury + fees.liquidity;
        if (denominator > 0) {
            amounts.dividends = amount * fees.dividends / denominator;
            amounts.buyback = amount * fees.buyback / denominator;
            amounts.treasury = amount * fees.treasury / denominator;
            amounts.liquidity = amount - amounts.dividends - amounts.buyback - amounts.treasury;
        }
        return amounts;
    }

    function _swap(uint256 amount) internal {
        address[] memory path = new address[](2);
        path[0] = address(carbo);
        path[1] = address(busd);

        carbo.approve(address(uniswapRouter), amount);

        uniswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

}

