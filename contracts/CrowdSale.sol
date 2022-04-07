// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IVestingWallet.sol";
import "./lib/Stages.sol";
import "./RecoverableFunds.sol";

contract CrowdSale is Pausable, RecoverableFunds {

    using SafeMath for uint256;
    using Stages for Stages.Map;

    IERC20 public token;
    IVestingWallet public vestingWallet;
    Stages.Map private stages;
    uint256 public price; // amount of tokens per 1 ETH
    uint256 public invested;
    uint256 public percentRate = 100;
    address payable public fundraisingWallet;
    mapping(address => bool) public whitelist;
    mapping(uint256 => mapping(address => uint256)) public balances;

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setToken(address newTokenAddress) public onlyOwner {
        token = IERC20(newTokenAddress);
    }

    function setVestingWallet(address newVestingWalletAddress) public onlyOwner {
        vestingWallet = IVestingWallet(newVestingWalletAddress);
    }

    function setPercentRate(uint256 newPercentRate) public onlyOwner {
        percentRate = newPercentRate;
    }

    function setFundraisingWallet(address payable newFundraisingWalletAddress) public onlyOwner {
        fundraisingWallet = newFundraisingWalletAddress;
    }

    function setPrice(uint256 newPrice) public onlyOwner {
        price = newPrice;
    }

    function setStage(uint256 id,uint256 start, uint256 end, uint256 bonus, uint256 minInvestmentLimit, uint256 maxInvestmentLimit, uint256 hardcapInTokens, uint256 vestingSchedule, uint256 invested, uint256 tokensSold, bool whitelist) public onlyOwner returns (bool) {
        return stages.set(id, Stages.Stage(start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcapInTokens, vestingSchedule, invested, tokensSold, whitelist));
    }

    function removeStage(uint256 id) public onlyOwner returns (bool) {
        return stages.remove(id);
    }

    function getStage(uint256 id) public view returns (Stages.Stage memory) {
        return stages.get(id);
    }

    function addToWhitelist(address[] calldata accounts) public onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = true;
        }
    }

    function removeFromWhitelist(address[] calldata accounts) public onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = false;
        }
    }

    function getActiveStageIndex() public view returns (bool, uint256) {
        for (uint256 i = 0; i < stages.length(); i++) {
            Stages.Stage storage stage = stages.get(i);
            if (block.timestamp >= stage.start && block.timestamp < stage.end && stage.tokensSold <= stage.hardcapInTokens) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    function calculateInvestmentAmounts(Stages.Stage memory stage, uint256 investment) internal view returns (uint256, uint256) {
        // apply a bonus if any
        uint256 tokensWithoutBonus = investment.mul(price).div(1 ether);
        uint256 tokensWithBonus = tokensWithoutBonus;
        if (stage.bonus > 0) {
            tokensWithBonus = tokensWithoutBonus.add(tokensWithoutBonus.mul(stage.bonus).div(percentRate));
        }
        // limit the number of tokens that user can buy according to the hardcap of the current stage
        if (stage.tokensSold.add(tokensWithBonus) > stage.hardcapInTokens) {
            tokensWithBonus = stage.hardcapInTokens.sub(stage.tokensSold);
            if (stage.bonus > 0) {
                tokensWithoutBonus = tokensWithBonus.mul(percentRate).div(percentRate + stage.bonus);
            }
        }
        // calculate the resulting amount of ETH that user will spend
        uint256 tokenBasedLimitedInvestValue = tokensWithoutBonus.mul(1 ether).div(price);
        // return the number of purchasesd tokens and spent ETH
        return (tokensWithBonus, tokenBasedLimitedInvestValue);
    }

    receive() external payable whenNotPaused {
        (bool hasActiveStage, uint256 stageIndex) = getActiveStageIndex();
        require(hasActiveStage, "CrowdSale: No suitable stage found");
        Stages.Stage storage stage = stages.get(stageIndex);
        if (stage.whitelist) {
            require(whitelist[msg.sender], "CrowdSale: Your address is not whitelisted");
        }
        uint256 value = msg.value;
        // check min investment limit
        require(value >= stage.minInvestmentLimit, "CrowdSale: The amount of ETH you sent is too small");
        uint256 allowedToInvest = stage.maxInvestmentLimit - balances[stageIndex][msg.sender];
        if (value > allowedToInvest) {
            value = allowedToInvest;
        }
        (uint256 tokens, uint256 investment) = calculateInvestmentAmounts(stage, value);
        require(tokens > 0, "CrowdSale: No tokens available for purchase");
        uint256 change = msg.value.sub(investment);
        // update stats
        balances[stageIndex][msg.sender] = balances[stageIndex][msg.sender].add(investment);
        invested = invested.add(investment);
        stage.tokensSold = stage.tokensSold.add(tokens);
        // transfer tokens
        token.approve(address(vestingWallet), tokens);
        vestingWallet.deposit(stage.vestingSchedule, msg.sender, tokens);
        // transfer ETH
        fundraisingWallet.transfer(investment);
        if (change > 0) {
            payable(msg.sender).transfer(change);
        }
    }

}

