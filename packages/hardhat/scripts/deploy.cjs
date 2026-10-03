const { ethers } = require('hardhat');
async function main() {
  if (!process.env.HEDERA_EVM_PRIVATE_KEY)
    throw new Error(
      'Set HEDERA_EVM_PRIVATE_KEY in your shell for testnet deployment',
    );
  const factory = await ethers.getContractFactory('ReportAnchor');
  const c = await factory.deploy();
  await c.waitForDeployment();
  console.log(
    JSON.stringify(
      {
        network: 'hedera-testnet',
        address: await c.getAddress(),
        transactionHash: c.deploymentTransaction().hash,
      },
      null,
      2,
    ),
  );
}
main().catch(() => {
  console.error(
    'Deployment failed. Check your local EVM key, testnet funding and RPC URL.',
  );
  process.exitCode = 1;
});
