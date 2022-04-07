const Configurator = artifacts.require('Configurator');
const { logger } = require('./util');

async function deploy () {
  const { log } = logger(await web3.eth.net.getNetworkType());
  const [deployer] = await web3.eth.getAccounts();

  const contract = await Configurator.new({ from: deployer });
  log(`Configurator deployed: @address{${contract.address}}`);
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
