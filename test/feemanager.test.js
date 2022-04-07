const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { BN, ether, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { getEvents, fromArtifact, expectToBeRoughlyEqual} = require('./util');

const CarboToken = contract.fromArtifact('CarboToken');
const FeeManager = contract.fromArtifact('FeeManager');
const DividendManager = contract.fromArtifact('DividendManager');
const ERC20Mock = contract.fromArtifact('ERC20Mock');
const UniswapFactory = fromArtifact("@uniswap/v2-core/build/UniswapV2Factory.json");
const UniswapRouter = fromArtifact("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const [deployer, owner, account1, account2, account3, buyback, treasury, liquidity] = accounts;
const balances = [ether('12345'), ether('234567'), ether('3456789')];
const TOTAL_AMOUNT = ether('500000000');
const BUY_FEES = {rfi: 0, dividends: 30, buyback: 5, treasury: 5, liquidity: 10};
const SELL_FEES = {rfi: 40, dividends: 0, buyback: 0, treasury: 0, liquidity: 10};

describe('FeeManager', async function () {
  let token;
  let busd;
  let dividendManager;
  let feeManager;
  let buyFeeHolder;
  let sellFeeHolder;
  let uniswapRouter;

  beforeEach(async function () {
    this.timeout(0);
    [token, dividendManager, busd] = await Promise.all([
      CarboToken.new({from: deployer}),
      DividendManager.new({from: deployer}),
      ERC20Mock.new('BUSD', 'BUSD', deployer, ether('1000000000'), {from: deployer})
    ]);
    const uniswapFactory = await UniswapFactory.new(deployer, {from: deployer});
    uniswapRouter = await UniswapRouter.new(uniswapFactory.address, busd.address, {from: deployer});
    const { tx } = await uniswapFactory.createPair(token.address, busd.address, {from: deployer});
    const logs = await getEvents(tx, uniswapFactory, 'PairCreated', web3);
    const swapPairAddress = logs[0].args.pair;
    // provide liquidity
    const tokens = ether('100000000');
    const value = ether('10000');
    await Promise.all([
      token.approve(uniswapRouter.address, tokens, {from: deployer}),
      busd.approve(uniswapRouter.address, value, {from: deployer})
    ])
    const deadline = (await time.latest()).addn(300);
    // address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline
    await uniswapRouter.addLiquidity(token.address, busd.address, tokens, value, 0, 0, owner, deadline, {from: deployer})
    feeManager = await FeeManager.new(uniswapRouter.address, busd.address, token.address, {from: deployer});
    await Promise.all([
      feeManager.setDividendManager(dividendManager.address, {from: deployer}),
      feeManager.setFeeAddresses(buyback, treasury, liquidity, {from: deployer})
    ]);
    [buyFeeHolder, sellFeeHolder] = await Promise.all([feeManager.buyFeeHolder(), feeManager.sellFeeHolder()]);
    await Promise.all([
      token.setFees(0, BUY_FEES.rfi, BUY_FEES.dividends, BUY_FEES.buyback, BUY_FEES.treasury, BUY_FEES.liquidity, {from: deployer}),
      token.setFees(1, SELL_FEES.rfi, SELL_FEES.dividends, SELL_FEES.buyback, SELL_FEES.treasury, SELL_FEES.liquidity, {from: deployer}),
      token.setFeeAddresses(0, buyFeeHolder, buyFeeHolder, buyFeeHolder, buyFeeHolder, {from: deployer}),
      token.setFeeAddresses(1, sellFeeHolder, sellFeeHolder, sellFeeHolder, sellFeeHolder, {from: deployer}),
      token.setCallbackContract(dividendManager.address, {from: deployer}),
      token.setCallbackFunction(2, true, {from: deployer}),
      token.setCallbackFunction(3, true, {from: deployer}),
      token.excludeFromRFI(buyFeeHolder, {from: deployer}),
      token.excludeFromRFI(sellFeeHolder, {from: deployer}),
      token.excludeFromRFI(swapPairAddress, {from: deployer}),
      token.setTaxable(swapPairAddress, true, {from: deployer}),
      token.setTaxExempt(feeManager.address, true, {from: deployer}),
      dividendManager.setToken(token.address, {from: deployer}),
      dividendManager.setBUSD(busd.address, {from: deployer})
    ]);
    await token.transferOwnership(owner, {from: deployer});
    await dividendManager.transferOwnership(owner, {from: deployer});
    await feeManager.transferOwnership(owner, {from: deployer});
    const [balance1, balance2, balance3] = balances;
    await Promise.all([
      token.transfer(account1, balance1, {from: deployer}),
      token.transfer(account2, balance2, {from: deployer}),
      token.transfer(account3, balance3, {from: deployer})
    ])
    await token.transfer(owner, (await token.balanceOf(deployer)).divn('2'), {from: deployer});
  });

  describe('token transfer', function () {
    describe('from usual account to uniswap pair', function () {
      it('should increase balance of sellFeeHolder', async function () {
        const amount = ether('123');
        const before = await token.balanceOf(sellFeeHolder);
        await token.approve(uniswapRouter.address, amount, {from: account1});
        const deadline = (await time.latest()).addn(300);
        await uniswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, 0, [token.address, busd.address], account1, deadline,  {from: account1});
        const after = await token.balanceOf(sellFeeHolder);
        const {rfi, ...fees} = SELL_FEES;
        expect(after).to.be.bignumber.equal(amount.muln(Object.values(fees).reduce((a, b) => a + b)).divn(1000).sub(before));
      })
    })
    describe('from uniswap pair to usual account', function () {
      it('should increase balance of buyFeeHolder', async function () {
        const amount = ether('123');
        const fbb = await token.balanceOf(buyFeeHolder);
        await busd.transfer(account1, amount, {from: deployer});
        await busd.approve(uniswapRouter.address, amount, {from: account1});
        const tbb = await token.balanceOf(account1);
        await uniswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, 0, [busd.address, token.address], account1, (await time.latest()).addn(300),  {from: account1});
        const fba = await token.balanceOf(buyFeeHolder);
        const {rfi, ...fees} = BUY_FEES;
        const tba = await token.balanceOf(account1);
        const feeDiff = fba.sub(fbb);
        const accDiff = tba.sub(tbb);
        expect(feeDiff).to.be.bignumber.gt(new BN('0'));
      })
    })
  })

  describe('swapAndDistribute', function () {
    beforeEach(async function () {
      const amount = ether('123');
      await token.approve(uniswapRouter.address, amount, {from: account1});
      await uniswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, 0, [token.address, busd.address], account1, (await time.latest()).addn(300),  {from: account1});
      await busd.transfer(account1, amount, {from: deployer});
      await busd.approve(uniswapRouter.address, amount, {from: account1});
      await uniswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, 0, [busd.address, token.address], account1, (await time.latest()).addn(300),  {from: account1});
    })
    it('should swap and distribute', async function () {
      const before = await Promise.all([token.balanceOf(sellFeeHolder), token.balanceOf(buyFeeHolder)]);
      before.forEach(balance => expect(balance).to.be.bignumber.gt(new BN('0')));
      await feeManager.swapAndDistribute({from: owner});
      const after = await Promise.all([token.balanceOf(sellFeeHolder), token.balanceOf(buyFeeHolder), token.balanceOf(feeManager.address)]);
      after.forEach(balance => expect(balance).to.be.bignumber.equal(new BN('0')));
    })
    it('should send appropriate amount of tokens to liquidity wallet', async function () {
      const [sellFee, buyFee] = await Promise.all([token.balanceOf(sellFeeHolder), token.balanceOf(buyFeeHolder)]);
      await feeManager.swapAndDistribute({from: owner});
      const after = await token.balanceOf(liquidity);
      const expectedSellFeeLiquidity = sellFee.divn(2);
      const expectedBuyFeeLiquidity = buyFee.divn(10)
      expect(after).to.be.bignumber.equal(expectedSellFeeLiquidity.add(expectedBuyFeeLiquidity));
    })
    it('should distribute busd among other wallets according to fees', async function () {
      const { tx } = await feeManager.swapAndDistribute({from: owner});
      const logs = await getEvents(tx, busd, 'Transfer', web3);
      const totalAmount = new BN(logs.find(({args: {to}}) => to === feeManager.address).args.value);
      const dividendsAmount = new BN(logs.find(({args: {to}}) => to === dividendManager.address).args.value);
      const buybackAmount = new BN(logs.find(({args: {to}}) => to === buyback).args.value);
      const treasuryAmount = new BN(logs.find(({args: {to}}) => to === treasury).args.value);
      const liquidityAmount = new BN(logs.find(({args: {to}}) => to === liquidity).args.value);
      expect(totalAmount).to.be.bignumber.equal(new BN(dividendsAmount).add(new BN(buybackAmount)).add(new BN(treasuryAmount)).add(new BN(liquidityAmount)));
      expectToBeRoughlyEqual(dividendsAmount, buybackAmount.muln(6), 1);
      expect(buybackAmount).to.be.bignumber.equal(treasuryAmount);
    })
  })

});
