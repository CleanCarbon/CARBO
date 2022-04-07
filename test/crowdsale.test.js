const { dateFromNow, getEvents, getTransactionCost, increaseDateTo } = require('./util');
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { BN, ether, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = contract.fromArtifact('CARBOToken');
const Sale = contract.fromArtifact('CrowdSale');
const Wallet = contract.fromArtifact('VestingWallet');

const [deployer, owner, fundraisingWallet, buyer] = accounts;
const PRICE = 10000;

describe('CrowdSale', async function () {
  let token;
  let sale;
  let wallet;
  let STAGES;

  beforeEach(async function () {
    STAGES = [
      { start: await dateFromNow(1), end: await dateFromNow(8), bonus: 100, minInvestmentLimit: ether('0.03'), maxInvestmentLimit: ether('80000'), hardcap: ether('80000') },
      { start: await dateFromNow(9), end: await dateFromNow(16), bonus: 0, minInvestmentLimit: ether('0.03'), maxInvestmentLimit: ether('120000'), hardcap: ether('120000') }
    ];
    sale = await Sale.new({ from: deployer });
    token = await Token.new({ from: deployer });
    wallet = await Wallet.new({ from: deployer });
    await Promise.all([
      wallet.setToken(token.address, { from: deployer }),
      sale.setToken(token.address, { from: deployer }),
      sale.setFundraisingWallet(fundraisingWallet, { from: deployer }),
      sale.setVestingWallet(wallet.address, { from: deployer }),
      sale.setPrice(ether(PRICE.toString()), { from: deployer }),
      token.transfer(sale.address, ether('300000000'), { from: deployer })
    ]);
    await Promise.all(STAGES.map((stage, i) => {
      const { start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcap } = stage;
      return sale.setStage(i, start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcap, 0, 0, 0, false, { from: deployer });
    }));
    await Promise.all([
      sale.transferOwnership(owner, { from: deployer }),
      token.transferOwnership(owner, { from: deployer }),
      wallet.transferOwnership(owner, { from: deployer })
    ]);
  });

  it('should not accept ETH before crowdsale start', async function () {
    await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'CrowdSale: No suitable stage found');
  });

  it('should not accept ETH before crowdsale start', async function () {
    await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'CrowdSale: No suitable stage found');
  });

  it('should not accept ETH below min limit', async function () {
    await increaseDateTo(STAGES[0].start);
    await expectRevert(sale.sendTransaction({ value: ether('0.029'), from: buyer }), 'CrowdSale: The amount of ETH you sent is too small.');
  });

  it('should accept ETH above min limit', async function () {
    const { start, bonus } = STAGES[0];
    await increaseDateTo(start);
    const ethSent = ether('0.1');
    const { receipt: { transactionHash } } = await sale.sendTransaction({ value: ethSent, from: buyer });
    const events = await getEvents(transactionHash, token, 'Transfer', web3);
    const tokensExpected = ethSent.muln(PRICE).muln(100 + bonus).divn(100);
    const tokensReceived = new BN(events[0].args.value);
    expect(tokensReceived).to.be.bignumber.equal(tokensExpected);
  });

  describe('should not return tokens above the maxInvestmentLimit',  function () {
    const maxInvestmentLimit = ether('3');
    beforeEach(async function () {
      const { start, end, bonus, minInvestmentLimit, hardcap } = STAGES[0];
      await sale.setStage(0, start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcap, 0, 0, 0, false, { from: owner });
      await increaseDateTo(start);
    });
    it('when limit exceded within first transaction', async function () {
      const ethSent = ether('3');
      await sale.sendTransaction({ value: ethSent, from: buyer });
      await expectRevert(sale.sendTransaction({ value: ethSent, from: buyer }), 'CrowdSale: No tokens available for purchase');
    });
    it('when limit exceded within second transaction', async function () {
      const ethSent = ether('2');
      let tokensReceived1;
      let tokensReceived2;
      {
        const { receipt: { transactionHash } } = await sale.sendTransaction({ value: ethSent, from: buyer });
        const events = await getEvents(transactionHash, token, 'Transfer', web3);
        tokensReceived1 = new BN(events[0].args.value);
      }
      {
        const { receipt: { transactionHash } } = await sale.sendTransaction({ value: ethSent, from: buyer });
        const events = await getEvents(transactionHash, token, 'Transfer', web3);
        tokensReceived2 = new BN(events[0].args.value);
      }
      expect(tokensReceived1.add(tokensReceived2)).to.be.bignumber.equal(maxInvestmentLimit.muln(PRICE * (1 + STAGES[0].bonus / 100)))
      await expectRevert(sale.sendTransaction({ value: ethSent, from: buyer }), 'CrowdSale: No tokens available for purchase');
    });
  })


  it('should not return tokens above the hardcap', async function () {
    const { start, hardcap } = STAGES[0];
    await increaseDateTo(start);
    const ethSent = ether('99');
    const { receipt: { transactionHash } } = await sale.sendTransaction({ value: ethSent, from: buyer });
    const events = await getEvents(transactionHash, token, 'Transfer', web3);
    const tokensReceived = new BN(events[0].args.value);
    expect(tokensReceived).to.be.bignumber.equal(hardcap);
  });

  it('should calculate change correctly', async function () {
    const { start, bonus, hardcap } = STAGES[0];
    await increaseDateTo(start);
    const ethBalanceBefore = new BN(await web3.eth.getBalance(buyer));
    const ethSent = ether('93');
    const { receipt: { gasUsed, transactionHash } } = await sale.sendTransaction({ value: ethSent, from: buyer });
    const { gasPrice } = await web3.eth.getTransaction(transactionHash);
    const ethBalanceAfter = new BN(await web3.eth.getBalance(buyer));
    const tokensPerEth = PRICE * (100 + bonus) / 100;
    const ethSpent = hardcap.divn(tokensPerEth);
    const ethTxFee = new BN(gasUsed * gasPrice);
    expect(ethBalanceBefore.sub(ethSpent).sub(ethTxFee)).to.be.bignumber.equal(ethBalanceAfter);
  });

  it('should not accept ETH between crowdsale stages', async function () {
    await increaseDateTo(STAGES[0].end);
    await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'CrowdSale: No suitable stage found');
  });

  it('should accept ETH after the start of the next stage', async function () {
    const { start, bonus } = STAGES[1];
    await increaseDateTo(start);
    const ethSent = ether('0.123');
    const { receipt: { transactionHash } } = await sale.sendTransaction({ value: ethSent, from: buyer });
    const events = await getEvents(transactionHash, token, 'Transfer', web3);
    const tokensExpected = ethSent.muln(PRICE * (100 + bonus) / 100);
    const tokensReceived = new BN(events[0].args.value);
    expect(tokensReceived).to.be.bignumber.equal(tokensExpected);
  });

  it('should remove stage by index correctly', async function () {
    await sale.removeStage(0, { from: owner });
    const stage1 = await sale.getStage(1);
    expectStageToBeEqual(stage1, STAGES[1]);
    await expectRevert(sale.getStage(0), 'Stages.Map: nonexistent key');
  });

  describe('whitelist', function () {
    it('should not be editable by non-owner', async function () {
      await expectRevert(sale.addToWhitelist([buyer], {from: buyer}), 'Ownable: caller is not the owner');
      await expectRevert(sale.removeFromWhitelist([buyer], {from: buyer}), 'Ownable: caller is not the owner');
    });
    it('should be editable by the owner', async function () {
      await sale.addToWhitelist([buyer], {from: owner});
      expect(await sale.whitelist(buyer)).to.be.equal(true);
      await sale.removeFromWhitelist([buyer], {from: owner});
      expect(await sale.whitelist(buyer)).to.be.equal(false);
    });
    it('should not allow non-whitelisted users to buy tokens', async function () {
      const { start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcap } = STAGES[0];
      await sale.setStage(0, start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcap, 0, 0, 0, true, { from: owner });
      await increaseDateTo(start);
      await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'CrowdSale: Your address is not whitelisted');
    })
    it('should allow whitelisted users to buy tokens', async function () {
      const { start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcap } = STAGES[0];
      await sale.setStage(0, start, end, bonus, minInvestmentLimit, maxInvestmentLimit, hardcap, 0, 0, 0, true, { from: owner });
      await sale.addToWhitelist([buyer], {from: owner});
      await increaseDateTo(start);
      await sale.sendTransaction({ value: ether('0.123'), from: buyer });
    })
  })
});

function expectStageToBeEqual (actual, expected) {
  expect(actual.start).to.be.bignumber.equal(new BN(expected.start));
  expect(actual.end).to.be.bignumber.equal(new BN(expected.end));
  expect(actual.bonus).to.be.bignumber.equal(new BN(expected.bonus));
  expect(actual.minInvestmentLimit).to.be.bignumber.equal(expected.minInvestmentLimit);
  expect(actual.hardcapInTokens).to.be.bignumber.equal(expected.hardcap);
}
