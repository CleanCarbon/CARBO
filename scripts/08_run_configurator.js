const Token = artifacts.require('CarboToken');
const CrowdSale = artifacts.require('CrowdSale');
const VestingWallet = artifacts.require('VestingWallet');
const DividendManager = artifacts.require('DividendManager');
const FeeManager = artifacts.require('FeeManager');
const Configurator = artifacts.require('Configurator');
const { logger } = require('./util');

async function deploy () {
  const { log } = logger(await web3.eth.net.getNetworkType());
  const [deployer] = await web3.eth.getAccounts();
  const args = process.argv.slice(2);
  const CONFIGURATOR_ADDRESS = args[args.findIndex(argName => argName === '--configurator') + 1];
  const TOKEN_ADDRESS = args[args.findIndex(argName => argName === '--token') + 1];
  const CROWDSALE_ADDRESS = args[args.findIndex(argName => argName === '--sale') + 1];
  const WALLET_ADDRESS = args[args.findIndex(argName => argName === '--wallet') + 1];
  const DIVIDENDMANAGER_ADDRESS = args[args.findIndex(argName => argName === '--divs') + 1];
  const FEEMANAGER_ADDRESS = args[args.findIndex(argName => argName === '--fees') + 1];
  const BUSD_ADDRESS = args[args.findIndex(argName => argName === '--busd') + 1];
  const SWAP_PAIR_ADDRESS = args[args.findIndex(argName => argName === '--pair') + 1];

  const token = await Token.at(TOKEN_ADDRESS);
  const sale = await CrowdSale.at(CROWDSALE_ADDRESS);
  const wallet = await VestingWallet.at(WALLET_ADDRESS);
  const divs = await DividendManager.at(DIVIDENDMANAGER_ADDRESS);
  const fees = await FeeManager.at(FEEMANAGER_ADDRESS);
  const configurator = await Configurator.at(CONFIGURATOR_ADDRESS);

  {
    // log(`Token. Transfer ownership`);
    // const tx = await token.transferOwnership(CONFIGURATOR_ADDRESS, {from: deployer});
    // log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    // log(`CrowdSale. Transfer ownership`);
    // const tx = await sale.transferOwnership(CONFIGURATOR_ADDRESS, {from: deployer});
    // log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    // log(`DividendManager. Transfer ownership`);
    // const tx = await divs.transferOwnership(CONFIGURATOR_ADDRESS, {from: deployer});
    // log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    // log(`FeeManager. Transfer ownership`);
    // const tx = await fees.transferOwnership(CONFIGURATOR_ADDRESS, {from: deployer});
    // log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    // log(`VestingWallet. Transfer ownership`);
    // const tx = await wallet.transferOwnership(CONFIGURATOR_ADDRESS, {from: deployer});
    // log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    // log(`Token. Increase allowance`);
    // const tx = await token.approve(CONFIGURATOR_ADDRESS, await token.balanceOf(deployer), {from: deployer});
    // log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    log(`Configurator. Init.`);
    const tx = await configurator.init(TOKEN_ADDRESS, CROWDSALE_ADDRESS, WALLET_ADDRESS, BUSD_ADDRESS, SWAP_PAIR_ADDRESS, DIVIDENDMANAGER_ADDRESS, FEEMANAGER_ADDRESS, { from: deployer });
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
}

module.exports = async function main (callback) {
  try {
    await deploy();
    console.log('success');
    callback(null);
  } catch (e) {
    console.log('error');
    console.log(e);
    callback(e);
  }
};
