const { getEvents, dateFromNow, increaseDateTo } = require('./util');
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { BN, ether, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = contract.fromArtifact('CARBOToken');
const Sale = contract.fromArtifact('CrowdSale');
const Wallet = contract.fromArtifact('VestingWallet');

const [owner, manager, fundraisingWallet, buyer] = accounts;
const SUPPLY = ether('2500000');
const PRICE = 4348;

describe('VestingWallet', async function () {
  let token;
  let sale;
  let wallet;
  let STAGES;
  let VESTING_SCHEDULES;

  beforeEach(async function () {
    STAGES = [
      { start: await dateFromNow(1), end: await dateFromNow(8), bonus: 500, minInvestmentLimit: ether('0.03'), hardcap: ether('40000000'), schedule: 0 },
      { start: await dateFromNow(9), end: await dateFromNow(11), bonus: 0, minInvestmentLimit: ether('0.03'), hardcap: ether('60000000'), schedule: 1 },
      { start: await dateFromNow(11), end: await dateFromNow(13), bonus: 250, minInvestmentLimit: ether('0.03'), hardcap: ether('5000000'), schedule: 2 }
    ];
    VESTING_SCHEDULES = [
      { start: STAGES[1].start, duration: time.duration.days(300).toNumber(), interval: time.duration.days(30).toNumber() },
      { start: STAGES[2].start, duration: time.duration.days(60).toNumber(), interval: time.duration.days(30).toNumber() }
    ];
    sale = await Sale.new({ from: owner });
    token = await Token.new([sale.address], [SUPPLY], { from: owner });
    wallet = await Wallet.new({ from: owner });
    await Promise.all([
      wallet.setToken(token.address, { from: owner }),
      sale.setToken(token.address, { from: owner }),
      sale.setFundraisingWallet(fundraisingWallet, { from: owner }),
      sale.setVestingWallet(wallet.address, { from: owner }),
      sale.setPrice(ether(PRICE.toString()), { from: owner })
    ]);
    await Promise.all(STAGES.map((stage, i) => {
      const { start, end, bonus, minInvestmentLimit, hardcap } = stage;
      return sale.setStage(i, start, end, bonus, minInvestmentLimit, hardcap, i, 0, 0, { from: owner });
    }));
    await Promise.all(VESTING_SCHEDULES.map((schedule, i) => {
      const { start, duration, interval } = schedule;
      return wallet.setVestingSchedule(i, start, duration, interval, { from: owner });
    }));
    await Promise.all([
      sale.transferOwnership(manager, { from: owner }),
      token.transferOwnership(manager, { from: owner }),
      wallet.transferOwnership(manager, { from: owner })
    ]);
  });

  it('should not allow premature token withdrawal', async function () {
    const { start } = STAGES[1];
    await increaseDateTo(start);
    const ethSent = ether('0.123');
    await sale.sendTransaction({ value: ethSent, from: buyer });
    await expectRevert(wallet.withdraw({ from: buyer }), 'VestingWallet: No tokens available for withdrawal');
  });

  it('should allow to withdraw tokens after the end of the sale', async function () {
    const { start, bonus } = STAGES[1];
    const { duration } = VESTING_SCHEDULES[0];
    await increaseDateTo(start);
    const ethSent = ether('0.123');
    await sale.sendTransaction({ value: ethSent, from: buyer });
    await increaseDateTo(start + duration);
    const { receipt: { transactionHash } } = await wallet.withdraw({ from: buyer });
    const events = await getEvents(transactionHash, token, 'Transfer', web3);
    const tokensExpected = ethSent.muln(PRICE * (100 + bonus) / 100);
    const tokensReceived = new BN(events[0].args.value);
    expect(tokensReceived).to.be.bignumber.equal(tokensExpected);
  });

  it('should reject to withdraw tokens from an empty account', async function () {
    const { start } = STAGES[1];
    const { duration } = VESTING_SCHEDULES[0];
    await increaseDateTo(start + duration);
    await expectRevert(wallet.withdraw({ from: buyer }), 'VestingWallet: No tokens available for withdrawal');
  });

  it('should allow to withdraw all available tokens at the end of the vesting term', async function () {
    const { start, bonus } = STAGES[1];
    const { duration } = VESTING_SCHEDULES[0];
    await increaseDateTo(start);
    const ethSent = ether('0.456');
    await sale.sendTransaction({ value: ethSent, from: buyer });
    const tokensExpected = ethSent.muln(PRICE * (100 + bonus)).divn(100);
    await increaseDateTo(start + duration);
    await wallet.withdraw({ from: buyer });
    const tranche = await token.balanceOf(buyer);
    expect(tranche).to.be.bignumber.equal(tokensExpected);
  });
});
