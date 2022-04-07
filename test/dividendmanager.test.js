const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { BN, ether, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { expectToBeRoughlyEqual } = require('./util');

const CarboToken = contract.fromArtifact('CarboToken');
const FeeManager = contract.fromArtifact('FeeManager');
const DividendManager = contract.fromArtifact('DividendManager');
const ERC20Mock = contract.fromArtifact('ERC20Mock');

const [deployer, owner, account1, account2, account3] = accounts;
const balances = [ether('12345'), ether('234567'), ether('3456789')];
const TOTAL_AMOUNT = ether('500000000');

describe('DividendManager', async function () {
  let token;
  let busd;
  let dividendManager;

  beforeEach(async function () {
    token = await CarboToken.new({from: deployer});
    dividendManager = await DividendManager.new({from: deployer});
    busd = await ERC20Mock.new('BUSD', 'BUSD', owner, ether('1000000000'), {from: deployer});
    await token.setCallbackContract(dividendManager.address, {from: deployer});
    await token.setCallbackFunction(2, true, {from: deployer})
    await token.setCallbackFunction(3, true, {from: deployer})
    await dividendManager.setToken(token.address, {from: deployer});
    await dividendManager.setBUSD(busd.address, {from: deployer});
    token.transferOwnership(owner, {from: deployer});
    dividendManager.transferOwnership(owner, {from: deployer});
    const [balance1, balance2, balance3] = balances;
    await Promise.all([
      token.transfer(account1, balance1, {from: deployer}),
      token.transfer(account2, balance2, {from: deployer}),
      token.transfer(account3, balance3, {from: deployer})
    ])
    await token.transfer(owner, (await token.balanceOf(deployer)).divn('2'), {from: deployer});
  });

  describe('includeinDividends', function () {
    beforeEach(async function () {
      await dividendManager.excludeFromDividends(account3, {from: owner});
    })
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(dividendManager.includeInDividends(account1, {from: account2}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should work', async function () {
        await dividendManager.includeInDividends(account3, {from: owner});
      });
    });
  });

  describe('excludeFromDividends', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(dividendManager.excludeFromDividends(account1, {from: account2}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should work', async function () {
        await dividendManager.excludeFromDividends(account3, {from: owner});
      });
    });
  });

  describe('distributeDividends', function () {
    it('should distribute dividends among accounts in proportion to their balances', async function () {
      const accounts = [account1, account2, account3];
      const amount = ether('0.123');
      const before = await Promise.all(accounts.map(account => dividendManager.accumulativeDividendOf(account)));
      before.forEach(dividend => expect(dividend).to.be.bignumber.equal(new BN('0')));
      await busd.approve(dividendManager.address, amount, {from: owner});
      await dividendManager.distributeDividends(amount, {from: owner});
      const after = await Promise.all(accounts.map(account => dividendManager.accumulativeDividendOf(account)));
      after.forEach((dividend, i) => expectToBeRoughlyEqual(dividend, amount.mul(balances[i]).div(TOTAL_AMOUNT), 1));
    });
  });

  describe('token transfer', function () {
    beforeEach(async function () {
      const amount = ether('123');
      await busd.approve(dividendManager.address, amount, {from: owner});
      await dividendManager.distributeDividends(amount, {from: owner});
      await dividendManager.excludeFromDividends(owner, {from: owner});
    })
    describe('from ususal account to usual account', function () {
      it('should not change dividend amounts', async function () {
        const accumulativeBefore = await Promise.all(accounts.map(account => dividendManager.accumulativeDividendOf(account)));
        const withdrawableBefore = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
        const withdrawnBefore = await Promise.all(accounts.map(account => dividendManager.withdrawnDividendOf(account)));
        token.transfer(account1, ether('321'), {from: account3});
        const accumulativeAfter = await Promise.all(accounts.map(account => dividendManager.accumulativeDividendOf(account)));
        const withdrawableAfter = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
        const withdrawnAfter = await Promise.all(accounts.map(account => dividendManager.withdrawnDividendOf(account)));
        accumulativeAfter.forEach((dividend, i) => expect(dividend).to.be.bignumber.equal(accumulativeBefore[i]));
        withdrawableAfter.forEach((dividend, i) => expect(dividend).to.be.bignumber.equal(withdrawableBefore[i]));
        withdrawnAfter.forEach((dividend, i) => expect(dividend).to.be.bignumber.equal(withdrawnBefore[i]));
      })
    });
    describe('from ususal account to excluded account', function () {
      it('should not change dividend amounts', async function () {
        const accounts = [account1, account2, account3];
        const accumulativeBefore = await Promise.all(accounts.map(account => dividendManager.accumulativeDividendOf(account)));
        const withdrawableBefore = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
        const withdrawnBefore = await Promise.all(accounts.map(account => dividendManager.withdrawnDividendOf(account)));
        token.transfer(owner, ether('321'), {from: deployer});
        const accumulativeAfter = await Promise.all(accounts.map(account => dividendManager.accumulativeDividendOf(account)));
        const withdrawableAfter = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
        const withdrawnAfter = await Promise.all(accounts.map(account => dividendManager.withdrawnDividendOf(account)));
        accumulativeAfter.forEach((dividend, i) => expect(dividend).to.be.bignumber.equal(accumulativeBefore[i]));
        withdrawableAfter.forEach((dividend, i) => expect(dividend).to.be.bignumber.equal(withdrawableBefore[i]));
        withdrawnAfter.forEach((dividend, i) => expect(dividend).to.be.bignumber.equal(withdrawnBefore[i]));
      })
      it('should increase dividend per share', async function () {
        const amount = ether('321');
        const accounts = [account1, account2];
        let diffs1;
        {
          const before = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          await busd.approve(dividendManager.address, amount, {from: owner});
          await dividendManager.distributeDividends(amount, {from: owner});
          const after = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          diffs1 = after.map((div, i) => div.sub(before[i]));
        }
        let diffs2;
        await token.transfer(owner, ether('123'), {from: account3});
        {
          const before = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          await busd.approve(dividendManager.address, amount, {from: owner});
          await dividendManager.distributeDividends(amount, {from: owner});
          const after = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          diffs2 = after.map((div, i) => div.sub(before[i]));
        }
        accounts.forEach((acc, i) => expect(diffs2[i]).to.be.bignumber.gt(diffs1[i]));
      })
    });
    describe('from excluded account to usual account', function () {
      it('should decrease dividend per share', async function () {
        const amount = ether('321');
        const accounts = [account1, account2];
        let diffs1;
        {
          const before = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          await busd.approve(dividendManager.address, amount, {from: owner});
          await dividendManager.distributeDividends(amount, {from: owner});
          const after = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          diffs1 = after.map((div, i) => div.sub(before[i]));
        }
        let diffs2;
        await token.transfer(account3, ether('123'), {from: owner});
        {
          const before = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          await busd.approve(dividendManager.address, amount, {from: owner});
          await dividendManager.distributeDividends(amount, {from: owner});
          const after = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
          diffs2 = after.map((div, i) => div.sub(before[i]));
        }
        accounts.forEach((acc, i) => expect(diffs2[i]).to.be.bignumber.lt(diffs1[i]));
      })
    });
  });

  describe('token reflect', function () {
    it('should increase withdrawable dividend', async function () {
      const amount = ether('34');
      const accounts = [account1, account2, account3];
      await busd.approve(dividendManager.address, amount, {from: owner});
      await dividendManager.distributeDividends(amount, {from: owner});
      const before = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
      await Promise.all(accounts.map(account => dividendManager.withdrawDividend({from: account})));
      await token.reflect(ether('321'), {from: owner});
      await busd.approve(dividendManager.address, amount, {from: owner});
      await dividendManager.distributeDividends(amount, {from: owner});
      const after = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
      accounts.forEach((acc, i) => expect(after[i]).to.be.bignumber.gt(before[i]));
    });
  });

  describe('token burn', function () {
    it('should not affect account\'s dividend', async function () {
      const amount = ether('34');
      await busd.approve(dividendManager.address, amount, {from: owner});
      await dividendManager.distributeDividends(amount, {from: owner});
      const before = await dividendManager.withdrawableDividendOf(account1);
      await token.burn(balances[0], {from: account1});
      const after = await dividendManager.withdrawableDividendOf(account1);
      expect(after).to.be.bignumber.equal(before);
    });
    it('should increase withdrawable dividend', async function () {
      const amount = ether('34');
      const accounts = [account1, account2, account3];
      await busd.approve(dividendManager.address, amount, {from: owner});
      await dividendManager.distributeDividends(amount, {from: owner});
      const before = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
      await Promise.all(accounts.map(account => dividendManager.withdrawDividend({from: account})));
      await token.burn(ether('321'), {from: owner});
      await busd.approve(dividendManager.address, amount, {from: owner});
      await dividendManager.distributeDividends(amount, {from: owner});
      const after = await Promise.all(accounts.map(account => dividendManager.withdrawableDividendOf(account)));
      accounts.forEach((acc, i) => expect(after[i]).to.be.bignumber.gt(before[i]));
    });
  });

});
