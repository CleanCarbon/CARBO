// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IVestingWallet.sol";
import "./RecoverableFunds.sol";
import "./lib/Stages.sol";
import "./lib/Schedules.sol";
import "./interfaces/IDividendManager.sol";
import "./interfaces/IFeeManager.sol";
import "./interfaces/ICarboToken.sol";
import "./interfaces/ICrowdSale.sol";
import "./interfaces/IOwnable.sol";
import "./interfaces/IWithCallback.sol";

contract Configurator is RecoverableFunds {

    struct Amounts {
        uint256 owner;
        uint256 sale;
        uint256 team;
        uint256 marketingLocked;
        uint256 marketingUnlocked;
        uint256 reserve;
        uint256 liquidity;
        uint256 airdrop;
    }

    struct Addresses {
        address owner;
        address payable fundraising;
        address team;
        address marketing;
        address reserve;
        address liquidity;
        address airdrop;
        address treasury;
        address buyback;
    }

    ICarboToken token;
    IVestingWallet wallet;
    ICrowdSale sale;
    IDividendManager divs;
    IFeeManager fees;

    function init(address _token, address _sale, address _wallet, address _busd, address _pair, address _divs, address _fees) public onlyOwner {

        Schedules.Schedule[4] memory schedules;

        // Unlocked on start
        schedules[0].start =      1648818000;         // April 1 2022 13:00:00 UTC
        schedules[0].duration =   0;
        schedules[0].interval =   0;
        // Public sale
        schedules[1].start =      1648818000;         // April 1 2022 13:00:00 UTC
        schedules[1].duration =   0;
        schedules[1].interval =   0;
        // Team
        schedules[2].start =      1646830800;         // April 1 2022 13:00:00 UTC - 23 days delay
        schedules[2].duration =   750 days;
        schedules[2].interval =   30 days;
        // Marketing
        schedules[3].start =      1646830800;         // April 1 2022 13:00:00 UTC - 23 days delay
        schedules[3].duration =   450 days;
        schedules[3].interval =   90 days;

        Amounts memory amounts;

        amounts.sale =                 150_000_000 ether;
        amounts.team =                  50_000_000 ether;
        amounts.marketingLocked =       20_000_000 ether;
        amounts.marketingUnlocked =     20_000_000 ether;
        amounts.reserve =               25_000_000 ether;
        amounts.liquidity =            100_000_000 ether;
        amounts.airdrop =               35_000_000 ether;

        Addresses memory addresses;

        addresses.owner =           address(0x1425234cc5F42D2aAa2db1E2088CeC81E6caaF9E);
        addresses.fundraising =     payable(0x2c1524500bb8D2A2548eCF0b87e549b78B0E9625);
        addresses.team =            address(0x924bFf61da5B81ecCc58607e3CB76A00aa6201cf);
        addresses.marketing =       address(0xa48d081d79FB257eEA71791B99D535858Ad8B1DC);
        addresses.reserve =         address(0xA5B10a6A78dF992Fd06587400378010BD248278b);
        addresses.liquidity =       address(0x8441220eFF1370A24f1400f79C06558c3C5A48fa);
        addresses.airdrop =         address(0x1D2d2B2DddA02500B97f08f361AFb17751a27728);
        addresses.treasury =        address(0xA7E8cB251033990cFFC3C10131f35BB122b321fB);
        addresses.buyback =         address(0x5FF5763964aC663Ec6CDcCf9836306301AED64C0);

        token = ICarboToken(_token);
        wallet = IVestingWallet(_wallet);
        sale = ICrowdSale(_sale);
        divs = IDividendManager(_divs);
        fees = IFeeManager(_fees);

        // -------------------------------------------------------------------------------------------------------------
        // CarboToken
        // -------------------------------------------------------------------------------------------------------------

        {
            address _buyFeeHolder = fees.buyFeeHolder();
            address _sellFeeHolder = fees.sellFeeHolder();
            ICarboToken.Fees memory BUY_FEES;
            ICarboToken.Fees memory SELL_FEES;

            BUY_FEES.rfi = 0;
            BUY_FEES.dividends = 30;
            BUY_FEES.buyback = 5;
            BUY_FEES.treasury = 5;
            BUY_FEES.liquidity = 10;

            SELL_FEES.rfi = 40;
            SELL_FEES.dividends = 0;
            SELL_FEES.buyback = 0;
            SELL_FEES.treasury = 0;
            SELL_FEES.liquidity = 10;

            token.setFees(ICarboToken.FeeType.BUY, BUY_FEES.rfi, BUY_FEES.dividends, BUY_FEES.buyback, BUY_FEES.treasury, BUY_FEES.liquidity);
            token.setFees(ICarboToken.FeeType.SELL, SELL_FEES.rfi, SELL_FEES.dividends, SELL_FEES.buyback, SELL_FEES.treasury, SELL_FEES.liquidity);
            token.setFeeAddresses(ICarboToken.FeeType.BUY, _buyFeeHolder, _buyFeeHolder, _buyFeeHolder, _buyFeeHolder);
            token.setFeeAddresses(ICarboToken.FeeType.SELL, _sellFeeHolder, _sellFeeHolder, _sellFeeHolder, _sellFeeHolder);

            IWithCallback(_token).setCallbackContract(_divs);
            IWithCallback(_token).setCallbackFunction(IWithCallback.CallbackType.INCREASE_BALANCE, true);
            IWithCallback(_token).setCallbackFunction(IWithCallback.CallbackType.DECREASE_BALANCE, true);

            token.excludeFromRFI(_buyFeeHolder);
            token.excludeFromRFI(_sellFeeHolder);
            token.excludeFromRFI(_sale);
            token.excludeFromRFI(_wallet);
            token.excludeFromRFI(_pair);
            token.excludeFromRFI(addresses.owner);
            token.excludeFromRFI(addresses.fundraising);
            token.excludeFromRFI(addresses.team);
            token.excludeFromRFI(addresses.marketing);
            token.excludeFromRFI(addresses.reserve);
            token.excludeFromRFI(addresses.liquidity);
            token.excludeFromRFI(addresses.airdrop);
            token.excludeFromRFI(addresses.treasury);
            token.excludeFromRFI(addresses.buyback);

            token.setTaxable(_pair, true);

            token.setTaxExempt(_fees, true);
            token.setTaxExempt(addresses.owner, true);
            token.setTaxExempt(addresses.fundraising, true);
            token.setTaxExempt(addresses.team, true);
            token.setTaxExempt(addresses.marketing, true);
            token.setTaxExempt(addresses.reserve, true);
            token.setTaxExempt(addresses.liquidity, true);
            token.setTaxExempt(addresses.airdrop, true);
            token.setTaxExempt(addresses.treasury, true);
            token.setTaxExempt(addresses.buyback, true);

            token.transferFrom(msg.sender, address(this), token.balanceOf(msg.sender));
            IOwnable(_token).transferOwnership(msg.sender);
        }

        // -------------------------------------------------------------------------------------------------------------
        // VestingWallet
        // -------------------------------------------------------------------------------------------------------------

        {
            wallet.setToken(_token);
            for (uint256 i; i < schedules.length; i++) {
                wallet.setVestingSchedule(i, schedules[i].start,   schedules[i].duration,  schedules[i].interval);
            }
            token.approve(_wallet, amounts.team + amounts.marketingLocked);
            wallet.deposit(2, addresses.team, amounts.team);
            wallet.deposit(3, addresses.marketing, amounts.marketingLocked);
            IOwnable(_wallet).transferOwnership(msg.sender);
        }

        // -------------------------------------------------------------------------------------------------------------
        // CrowdSale
        // -------------------------------------------------------------------------------------------------------------

        {
            uint256 PRICE = 10_000 ether;
            Stages.Stage memory STAGE;
            STAGE.start = 1649595600;       // April 10 2022 13:00:00 UTC
            STAGE.end = 1650200400;         // April 17 2022 13:00:00 UTC
            STAGE.bonus = 0;
            STAGE.minInvestmentLimit = 1 ether;
            STAGE.maxInvestmentLimit = amounts.sale / PRICE;
            STAGE.hardcapInTokens = amounts.sale;
            STAGE.vestingSchedule = 1;
            STAGE.invested = 0;
            STAGE.tokensSold = 0;
            STAGE.whitelist = false;

            sale.setToken(_token);
            sale.setFundraisingWallet(addresses.fundraising);
            sale.setVestingWallet(_wallet);
            sale.setPrice(PRICE);
            sale.setStage(0, STAGE.start, STAGE.end, STAGE.bonus, STAGE.minInvestmentLimit, STAGE.maxInvestmentLimit, STAGE.hardcapInTokens, STAGE.vestingSchedule, STAGE.invested, STAGE.tokensSold, STAGE.whitelist);
            token.transfer(_sale, amounts.sale);
            IOwnable(_sale).transferOwnership(msg.sender);
        }

        // -------------------------------------------------------------------------------------------------------------
        // DividendManager
        // -------------------------------------------------------------------------------------------------------------

        {
            divs.setToken(_token);
            divs.setBUSD(_busd);
            divs.excludeFromDividends(_token);
            divs.excludeFromDividends(_sale);
            divs.excludeFromDividends(_wallet);
            divs.excludeFromDividends(_pair);
            divs.excludeFromDividends(addresses.owner);
            divs.excludeFromDividends(addresses.fundraising);
            divs.excludeFromDividends(addresses.team);
            divs.excludeFromDividends(addresses.marketing);
            divs.excludeFromDividends(addresses.reserve);
            divs.excludeFromDividends(addresses.liquidity);
            divs.excludeFromDividends(addresses.airdrop);
            divs.excludeFromDividends(addresses.treasury);
            divs.excludeFromDividends(addresses.buyback);
            IOwnable(_divs).transferOwnership(msg.sender);
        }

        // -------------------------------------------------------------------------------------------------------------
        // FeeManager
        // -------------------------------------------------------------------------------------------------------------

        {
            fees.setDividendManager(_divs);
            fees.setFeeAddresses(addresses.buyback, addresses.treasury, addresses.liquidity);
            IOwnable(_fees).transferOwnership(msg.sender);
        }

        // -------------------------------------------------------------------------------------------------------------
        // Token Distribution
        // -------------------------------------------------------------------------------------------------------------

        {
            token.transfer(addresses.marketing, amounts.marketingUnlocked);
            token.transfer(addresses.reserve, amounts.reserve);
            token.transfer(addresses.liquidity, amounts.liquidity);
            token.transfer(addresses.airdrop, amounts.airdrop);
            token.transfer(addresses.owner, token.balanceOf(address(this)));
        }
    }

}
