const { accounts, contract } = require('@openzeppelin/test-environment');
const { BN, ether, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = contract.fromArtifact('CARBOToken');

const [deployer, owner, account1, account2, dividends, buyback, treasury, liquidity, pancake ] = accounts;

describe('CARBOToken', async function () {
  let token;

  beforeEach(async function () {
    token = await Token.new({from: deployer});
    await token.transferOwnership(owner, {from: deployer})
  });

  describe('setFees', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.setFees(0, 1, 2, 3, 4, 5, {from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should set buy fees correctly', async function () {
        const fees = {rfi: '1', dividends: '2', buyback: '3', treasury: '4', liquidity: '5'};
        await token.setFees(0, fees.rfi, fees.dividends, fees.buyback, fees.treasury, fees.liquidity, {from: owner});
        const buyFees = await token.getFees(0);
        expect(buyFees.rfi).to.be.equal(fees.rfi);
        expect(buyFees.dividends).to.be.equal(fees.dividends);
        expect(buyFees.buyback).to.be.equal(fees.buyback);
        expect(buyFees.treasury).to.be.equal(fees.treasury);
        expect(buyFees.liquidity).to.be.equal(fees.liquidity);
        const sellFees = await token.getFees(1);
        expect(sellFees.rfi).to.be.equal(sellFees.dividends).and.equal(sellFees.buyback).and.equal(sellFees.treasury).and.equal(sellFees.liquidity).and.equal('0');
      });
      it('should set sell fees correctly', async function () {
        const fees = {rfi: '5', dividends: '4', buyback: '3', treasury: '2', liquidity: '1'};
        await token.setFees(1, fees.rfi, fees.dividends, fees.buyback, fees.treasury, fees.liquidity, {from: owner});
        const sellFees = await token.getFees(1);
        expect(sellFees.rfi).to.be.equal(fees.rfi);
        expect(sellFees.dividends).to.be.equal(fees.dividends);
        expect(sellFees.buyback).to.be.equal(fees.buyback);
        expect(sellFees.treasury).to.be.equal(fees.treasury);
        expect(sellFees.liquidity).to.be.equal(fees.liquidity);
        const buyFees = await token.getFees(0);
        expect(buyFees.rfi).to.be.equal(buyFees.dividends).and.equal(buyFees.buyback).and.equal(buyFees.treasury).and.equal(buyFees.liquidity).and.equal('0');
      });
    });
  });

  describe('setFeeAddresses', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.setFeeAddresses(0, dividends, buyback, treasury, liquidity, {from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should set fee addresses correctly', async function () {
        await token.setFeeAddresses(0, dividends, buyback, treasury, liquidity, {from: owner});
        let addresses = await token.getFeeAddresses(0);
        expect(addresses.dividends).to.be.equal(dividends);
        expect(addresses.buyback).to.be.equal(buyback);
        expect(addresses.treasury).to.be.equal(treasury);
        expect(addresses.liquidity).to.be.equal(liquidity);
        addresses = await token.getFeeAddresses(1);
        expect(addresses.dividends).to.be.equal(constants.ZERO_ADDRESS);
        expect(addresses.buyback).to.be.equal(constants.ZERO_ADDRESS);
        expect(addresses.treasury).to.be.equal(constants.ZERO_ADDRESS);
        expect(addresses.liquidity).to.be.equal(constants.ZERO_ADDRESS);
        await token.setFeeAddresses(1, dividends, buyback, treasury, liquidity, {from: owner});
        addresses = await token.getFeeAddresses(1);
        expect(addresses.dividends).to.be.equal(dividends);
        expect(addresses.buyback).to.be.equal(buyback);
        expect(addresses.treasury).to.be.equal(treasury);
        expect(addresses.liquidity).to.be.equal(liquidity);
      });
    });
  });

  describe('setTaxable', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.setTaxable(pancake, true, {from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should set address correctly', async function () {
        await token.setTaxable(pancake, true, {from: owner});
      });
      describe('when already set', function () {
        it('should revert', async function () {
          await expectRevert(token.setTaxable(pancake, false, {from: owner}), "CarboToken: already set");
          await token.setTaxable(pancake, true, {from: owner});
          await expectRevert(token.setTaxable(pancake, true, {from: owner}), "CarboToken: already set");
        });
      })
    });
  });

  describe('setTaxExempt', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.setTaxExempt(pancake, true, {from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should set address correctly', async function () {
        await token.setTaxExempt(pancake, true, {from: owner});
      });
      describe('when already set', function () {
        it('should revert', async function () {
          await expectRevert(token.setTaxExempt(pancake, false, {from: owner}), "CarboToken: already set");
          await token.setTaxExempt(pancake, true, {from: owner});
          await expectRevert(token.setTaxExempt(pancake, true, {from: owner}), "CarboToken: already set");
        });
      })
    });
  });

  describe('transfer', function () {
    const BUY_FEES = {rfi: 0, dividends: 30, buyback: 5, treasury: 5, liquidity: 5}
    const SELL_FEES = {rfi: 40, dividends: 0, buyback: 5, treasury: 5, liquidity: 10}
    const PERCENT_RATE = 1000;
    beforeEach(async function () {
      {
        const {rfi, dividends, buyback, treasury, liquidity} = BUY_FEES;
        await token.setFees(0, rfi, dividends, buyback, treasury, liquidity, {from: owner});
      }
      {
        const {rfi, dividends, buyback, treasury, liquidity} = SELL_FEES;
        await token.setFees(1, rfi, dividends, buyback, treasury, liquidity, {from: owner});
      }
      await token.setFeeAddresses(0, dividends, buyback, treasury, liquidity, {from: owner});
      await token.setFeeAddresses(1, dividends, buyback, treasury, liquidity, {from: owner});
      await token.transfer(account1, ether('12345'), {from: deployer});
    })
    describe('from usual account', function () {
      describe('to usual account', function () {
        it ('should transfer full amount', expectTransferWithoutFees);
      })
      describe('to taxable account', function () {
        beforeEach(async function () {
          await token.setTaxable(account2, true, {from: owner});
        })
        it('should charge sell fee', async function () {
          return expectTransferWithSellFees(SELL_FEES, PERCENT_RATE);
        })
      })
      describe('to tax-exempt account', function () {
        beforeEach(async function () {
          await token.setTaxExempt(account2, true, {from: owner});
        })
        it('should transfer full amount', expectTransferWithoutFees)
      })
    })
    describe('from taxable account', function () {
      beforeEach(async function () {
        await token.setTaxable(account1, true, {from: owner});
      })
      describe('to ususal account', function () {
        it('should charge buy fee', async function (){
          return expectTransferWithBuyFees(BUY_FEES, PERCENT_RATE);
        })
      })
      describe('to tax-exempt account', function () {
        beforeEach(async function () {
          await token.setTaxExempt(account2, true, {from: owner});
        })
        it('should transfer full amount', expectTransferWithoutFees)
      })
    })
    describe('from tax-exempt account', function () {
      beforeEach(async function () {
        await token.setTaxExempt(account1, true, {from: owner});
      })
      describe('to ususal account', function () {
        it('should transfer full amount', expectTransferWithoutFees)
      })
      describe('to taxable account', function () {
        beforeEach(async function () {
          await token.setTaxable(account2, true, {from: owner});
        })
        it('should transfer full amount', expectTransferWithoutFees)
      })
      describe('to tax-exempt account', function () {
        beforeEach(async function () {
          await token.setTaxExempt(account2, true, {from: owner});
        })
        it('should transfer full amount', expectTransferWithoutFees)
      })
    })
  })

  //--------------------------------------------------------------------------------------------------------------------
  // helpers
  //--------------------------------------------------------------------------------------------------------------------

  async function expectTransferWithBuyFees(BUY_FEES, PERCENT_RATE) {
    const balancesBefore = await Promise.all([account1, account2, dividends, buyback, treasury, liquidity].map(address => token.balanceOf(address)));
    const [balance1before, balance2before, dividendsBalanceBefore, buybackBalanceBefore, tresuryBalanceBefore, liquidityBalanceBefore] = balancesBefore;
    const tokensToSend = ether('123');
    const fees = Object.assign({}, ...Object.keys(BUY_FEES).map(k => ({[k]: tokensToSend.muln(BUY_FEES[k]).divn(PERCENT_RATE)})));
    const tokensToReceive = tokensToSend.sub(Object.keys(fees).reduce((prev, key) => prev.add(fees[key]), new BN('0')))
    const receipt = await token.transfer(account2, tokensToSend, {from: account1});
    expectEvent(receipt, 'Transfer', {from: account1, to: account2, value: tokensToReceive});
    expectEvent(receipt, 'FeeTaken', fees);
    const balancesAfter = await Promise.all([account1, account2, dividends, buyback, treasury, liquidity].map(address => token.balanceOf(address)));
    const [balance1after, balance2after, dividendsBalanceAfter, buybackBalanceAfter, tresuryBalanceAfter, liquidityBalanceAfter] = balancesAfter;
    expect(balance1after).to.be.bignumber.equal(balance1before.sub(tokensToSend));
    expect(balance2after).to.be.bignumber.equal(balance2before.add(tokensToReceive));
    expect(dividendsBalanceAfter).to.be.bignumber.equal(dividendsBalanceBefore.add(fees.dividends));
    expect(buybackBalanceAfter).to.be.bignumber.equal(buybackBalanceBefore.add(fees.buyback));
    expect(tresuryBalanceAfter).to.be.bignumber.equal(tresuryBalanceBefore.add(fees.treasury));
    expect(liquidityBalanceAfter).to.be.bignumber.equal(liquidityBalanceBefore.add(fees.liquidity));
  }

  async function expectTransferWithSellFees(SELL_FEES, PERCENT_RATE) {
    const balancesBefore = await Promise.all([account1, account2, buyback, treasury, liquidity].map(address => token.balanceOf(address)));
    const [balance1before, balance2before, buybackBalanceBefore, tresuryBalanceBefore, liquidityBalanceBefore] = balancesBefore;
    const tokensToSend = ether('123');
    const fees = Object.assign({}, ...Object.keys(SELL_FEES).map(k => ({[k]: tokensToSend.muln(SELL_FEES[k]).divn(PERCENT_RATE)})));
    const tokensToReceive = tokensToSend.sub(Object.keys(fees).reduce((prev, key) => prev.add(fees[key]), new BN('0')))
    const receipt = await token.transfer(account2, tokensToSend, {from: account1});
    expectEvent(receipt, 'Transfer', {from: account1, to: account2, value: tokensToReceive});
    expectEvent(receipt, 'FeeTaken', fees);
    const balancesAfter = await Promise.all([account1, account2, buyback, treasury, liquidity].map(address => token.balanceOf(address)));
    const [balance1after, balance2after, buybackBalanceAfter, tresuryBalanceAfter, liquidityBalanceAfter] = balancesAfter;
    const diff1 = balance1after.add(tokensToSend).sub(balance1before);
    const diff2 = balance2after.sub(balance2before).sub(tokensToReceive);
    const diff3 = buybackBalanceAfter.sub(fees.buyback).sub(buybackBalanceBefore);
    const diff4 = tresuryBalanceAfter.sub(fees.treasury).sub(tresuryBalanceBefore);
    const diff5 = liquidityBalanceAfter.sub(fees.liquidity).sub(liquidityBalanceBefore);
    const ratio1 = balance1after.div(diff1);
    const ratio2 = balance2after.div(diff2);
    const ratio3 = buybackBalanceAfter.div(diff3);
    const ratio4 = tresuryBalanceAfter.div(diff4);
    const ratio5 = liquidityBalanceAfter.div(diff5);
    expect(ratio1).to.be.bignumber.equal(ratio2).and.equal(ratio3).and.equal(ratio4).and.equal(ratio5);
  }

  async function expectTransferWithoutFees() {
    const [balance1before, balance2before] = await Promise.all([account1, account2].map(address => token.balanceOf(address)));
    const amount = ether('123');
    await token.transfer(account2, amount, {from: account1});
    const [balance1after, balance2after] = await Promise.all([account1, account2].map(address => token.balanceOf(address)));
    expect(balance1after).to.be.bignumber.equal(balance1before.sub(amount));
    expect(balance2after).to.be.bignumber.equal(balance2before.add(amount));
  }

});

