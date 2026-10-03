require('@nomicfoundation/hardhat-ethers');
const { subtask } = require('hardhat/config');
const {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
} = require('hardhat/builtin-tasks/task-names');
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(
  async ({ solcVersion }, hre, runSuper) => {
    if (solcVersion === '0.8.28')
      return {
        compilerPath: require.resolve('solc/soljson.js'),
        isSolcJs: true,
        version: solcVersion,
        longVersion: require('solc').version(),
      };
    return runSuper();
  },
);
module.exports = {
  solidity: {
    version: '0.8.28',
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris' },
  },
  networks: {
    hederaTestnet: {
      url:
        process.env.HEDERA_TESTNET_RPC_URL || 'https://testnet.hashio.io/api',
      chainId: 296,
      accounts: process.env.HEDERA_EVM_PRIVATE_KEY
        ? [process.env.HEDERA_EVM_PRIVATE_KEY]
        : [],
    },
  },
  mocha: { timeout: 30000 },
};
