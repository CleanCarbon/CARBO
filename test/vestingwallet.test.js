const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { BN, ether, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = contract.fromArtifact('CARBOToken');
const VestingWallet = contract.fromArtifact('VestingWallet');

const [owner, beneficiary1, beneficiary2, beneficiary3] = accounts;
const balances = [ether('2000')];

describe('VestingWallet', async () => {
  let token;
  let wallet;

  beforeEach(async () => {
    token = await Token.new([owner], balances, { from: owner });
    wallet = await VestingWallet.new({ from: owner });
    await wallet.setToken(token.address, { from: owner });
  });

  describe('setVestingSchedule', () => {
    it('should set vesting schedule correctly', async () => {
      const start = await time.latest();
      const duration = 36000;
      const interval = 3600;
      await wallet.setVestingSchedule(0, start, duration, interval, { from: owner });
      const schedule = await wallet.getVestingSchedule(0);
      expect(schedule.start).to.be.bignumber.equal(start);
      expect(Number(schedule.duration)).to.be.equal(duration);
      expect(Number(schedule.interval)).to.be.equal(interval);
    });
  });

  describe('setBalance', () => {
    it('should set balance fields correctly', async () => {
      const initial1 = ether('1000');
      const withdrawn1 = new BN('0');
      await wallet.setBalance(0, beneficiary1, initial1, withdrawn1, { from: owner });
      const balance1 = await wallet.balances(0, beneficiary1);
      expect(balance1.initial).to.be.bignumber.equal(initial1);
      expect(balance1.withdrawn).to.be.bignumber.equal(withdrawn1);
      const initial2 = ether('1234');
      const withdrawn2 = new BN('32');
      await wallet.setBalance(0, beneficiary1, initial2, withdrawn2, { from: owner });
      const balance2 = await wallet.balances(0, beneficiary1);
      expect(balance2.initial).to.be.bignumber.equal(initial2);
      expect(balance2.withdrawn).to.be.bignumber.equal(withdrawn2);
    });
  });

  describe('deposit', () => {
    const schedule = 0;
    const amount1 = ether('123');
    const amount2 = ether('234');
    const amount3 = ether('345');
    const amounts = [amount1, amount2, amount3];
    const beneficiaries = [beneficiary1, beneficiary2, beneficiary3];

    beforeEach(async () => {
      await Promise.all(beneficiaries.map(async (beneficiary, i) => {
        await token.transfer(beneficiary, amounts[i], { from: owner });
        await token.approve(wallet.address, amounts[i], { from: beneficiary });
        await wallet.deposit(schedule, beneficiary, amounts[i], { from: beneficiary });
      }));
    });

    it('should update balances correctly', async () => {
      const additional = [ether('345'), ether('234'), ether('123')];
      await token.approve(wallet.address, additional.reduce((prev, current) => prev.add(current)), { from: owner });
      await wallet.methods['deposit(uint256,address[],uint256[])'](schedule, beneficiaries, additional, { from: owner });
      await Promise.all(beneficiaries.map(async (beneficiary, i) => {
        const { initial, withdrawn } = await wallet.balances(schedule, beneficiary);
        expect(initial).to.be.bignumber.equal(amounts[i].add(additional[i]));
        expect(withdrawn).to.be.bignumber.equal(new BN('0'));
      }));
    });
  });

  describe('deposit', () => {
    const schedule = new BN('0');
    const amount1 = ether('123');
    const amount2 = ether('234');
    const amount3 = ether('345');

    beforeEach(async () => {
      const sum = amount1.add(amount2).add(amount3);
      await token.transfer(beneficiary1, sum, { from: owner });
      await token.approve(wallet.address, sum, { from: beneficiary1 });
    });

    it('should move tokens', async () => {
      await wallet.deposit(schedule, beneficiary1, amount1, { from: beneficiary1 });
      expect(await token.balanceOf(wallet.address)).to.be.bignumber.equal(amount1);
    });

    it('should emit event', async () => {
      const tx = await wallet.deposit(schedule, beneficiary1, amount1, { from: beneficiary1 });
      expectEvent(tx.receipt, 'Deposit', [schedule, beneficiary1, amount1]);
    });

    it('should update balances correctly', async () => {
      await wallet.deposit(0, beneficiary1, amount1, { from: beneficiary1 });
      await wallet.deposit(0, beneficiary1, amount2, { from: beneficiary1 });
      await wallet.deposit(1, beneficiary1, amount3, { from: beneficiary1 });
      const { initial, withdrawn } = await wallet.balances(0, beneficiary1);
      expect(initial).to.be.bignumber.equal(amount1.add(amount2));
      expect(withdrawn).to.be.bignumber.equal(new BN('0'));
    });
  });

  describe('getAccountInfo', () => {
    const amount = ether('123');
    let start;
    const duration = new BN('36000');
    const interval = new BN('3600');

    beforeEach(async () => {
      start = await time.latest();
      await token.transfer(beneficiary1, amount, { from: owner });
      await token.approve(wallet.address, amount, { from: beneficiary1 });
      await wallet.setVestingSchedule(0, start, duration, interval, { from: owner });
    });

    it('should return 0 values for an empty account', async () => {
      const { 0: initial, 1: withdrawn, 2: vested } = await wallet.getAccountInfo(beneficiary1);
      expect(initial).to.be.bignumber.equal(new BN('0'));
      expect(withdrawn).to.be.bignumber.equal(new BN('0'));
      expect(vested).to.be.bignumber.equal(new BN('0'));
    });

    it('should return correct values after deposit', async () => {
      await wallet.deposit(0, beneficiary1, amount, { from: beneficiary1 });
      const { 0: initial, 1: withdrawn, 2: vested } = await wallet.getAccountInfo(beneficiary1);
      expect(initial).to.be.bignumber.equal(amount);
      expect(withdrawn).to.be.bignumber.equal(new BN('0'));
      expect(vested).to.be.bignumber.equal(new BN('0'));
    });

    it('should return correct values after the interval has passed', async () => {
      await wallet.deposit(0, beneficiary1, amount, { from: beneficiary1 });
      await time.increase(interval);
      const { 0: initial, 1: withdrawn, 2: vested } = await wallet.getAccountInfo(beneficiary1);
      expect(initial).to.be.bignumber.equal(amount);
      expect(withdrawn).to.be.bignumber.equal(new BN('0'));
      expect(vested).to.be.bignumber.equal(amount.mul(interval).div(duration));
    });

    it('should return correct values after withdrawal', async () => {
      await wallet.deposit(0, beneficiary1, amount, { from: beneficiary1 });
      await time.increase(interval);
      await wallet.withdraw({ from: beneficiary1 });
      const { 0: initial, 1: withdrawn, 2: vested } = await wallet.getAccountInfo(beneficiary1);
      expect(initial).to.be.bignumber.equal(amount);
      expect(withdrawn).to.be.bignumber.equal(amount.mul(interval).div(duration));
      expect(vested).to.be.bignumber.equal(new BN('0'));
    });
  });

  describe('withdraw', function () {
    this.timeout(5000);
    let amounts;
    let start;
    let schedules;

    beforeEach(async () => {
      amounts = [ether('123'), ether('234'), ether('345')];
      start = await time.latest();
      schedules = [
        { start, duration: 0, interval: 0 },
        { start, duration: time.duration.days(360), interval: time.duration.days(30) },
        { start: start.add(time.duration.days(90)), duration: time.duration.days(360), interval: time.duration.days(30) }
      ];
      await Promise.all(schedules.map(({ start, duration, interval }, i) => wallet.setVestingSchedule(i, start, duration, interval, { from: owner })));
      const sum = amounts.reduce((prev, current) => prev.add(current));
      await token.transfer(beneficiary1, sum, { from: owner });
      await token.approve(wallet.address, sum, { from: beneficiary1 });
      await Promise.all(amounts.map((amount, i) => wallet.deposit(i, beneficiary1, amount, { from: beneficiary1 })));
    });

    it('should transfer tokens and emit Event', async () => {
      const { receipt } = await wallet.withdraw({ from: beneficiary1 });
      expectEvent(receipt, 'Withdrawal', [beneficiary1, amounts[0]]);
      expect(await token.balanceOf(beneficiary1)).to.be.bignumber.equal(amounts[0]);
    });

    it('should transfer tokens in accordance with vesting schedules', async () => {
      const [amount1, amount2, amount3] = amounts;
      const payouts = [
        { day: 0, amount: amount1 },
        { day: 30, amount: amount2.divn(12) },
        { day: 60, amount: amount2.divn(12) },
        { day: 90, amount: amount2.divn(12) },
        { day: 120, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 150, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 180, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 210, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 240, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 270, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 300, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 330, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 360, amount: amount2.divn(12).add(amount3.divn(12)) },
        { day: 390, amount: amount3.divn(12) },
        { day: 420, amount: amount3.divn(12) },
        { day: 450, amount: amount3.divn(12) }
      ];
      let sum = new BN('0');
      for (const { day, amount } of payouts) {
        const { receipt } = await wallet.withdraw({ from: beneficiary1 });
        expectEvent(receipt, 'Withdrawal', [beneficiary1, amount]);
        await expectRevert(wallet.withdraw({ from: beneficiary1 }), 'VestingWallet: No tokens available for withdrawal');
        sum = sum.add(amount);
        expect(await token.balanceOf(beneficiary1)).to.be.bignumber.equal(sum);
        await time.increase(time.duration.days(30));
      }
    });
  });
});
