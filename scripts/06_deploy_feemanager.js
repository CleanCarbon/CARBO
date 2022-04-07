const FeeManager = artifacts.require('FeeManager');
const { logger } = require('./util');

async function deploy () {
  const { log } = logger(await web3.eth.net.getNetworkType());
  const [deployer] = await web3.eth.getAccounts();
  const args = process.argv.slice(2);
  const ROUTER_ADDRESS = args[args.findIndex(argName => argName === '--router') + 1];
  const BUSD_ADDRESS = args[args.findIndex(argName => argName === '--busd') + 1];
  const TOKEN_ADDRESS = args[args.findIndex(argName => argName === '--token') + 1];

  const contract = await FeeManager.new(ROUTER_ADDRESS, BUSD_ADDRESS, TOKEN_ADDRESS, { from: deployer });
  log(`FeeManager deployed: @address{${contract.address}}`);
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
