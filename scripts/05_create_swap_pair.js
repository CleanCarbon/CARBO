const { getEvents, fromArtifact} = require('../test/util');
const { logger } = require('./util');
const { web3 } = require("@openzeppelin/test-environment");
const UniswapFactory = fromArtifact("@uniswap/v2-core/build/UniswapV2Factory.json");


async function deploy () {
  const { log } = logger(await web3.eth.net.getNetworkType());
  const [deployer] = await web3.eth.getAccounts();
  const args = process.argv.slice(2);
  const UNISWAP_FACTORY_ADDRESS = args[args.findIndex(argName => argName === '--factory') + 1];
  const BUSD_ADDRESS = args[args.findIndex(argName => argName === '--busd') + 1];
  const TOKEN_ADDRESS = args[args.findIndex(argName => argName === '--token') + 1];
  const uniswapFactory = await UniswapFactory.at(UNISWAP_FACTORY_ADDRESS);
  const { tx } = await uniswapFactory.createPair(TOKEN_ADDRESS, BUSD_ADDRESS, {from: deployer});
  const logs = await getEvents(tx, uniswapFactory, 'PairCreated', web3);
  const swapPairAddress = logs[0].args.pair;
  log(`Pair created at address: @address{${swapPairAddress}}`);
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
