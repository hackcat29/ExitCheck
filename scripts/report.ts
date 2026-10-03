import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  createReport,
  envelope,
  requestSchema,
} from '../packages/core/src/index';
import { demoSnapshot } from '../packages/core/src/demo';
import { liveSnapshot } from '../packages/core/src/live';
import { argument, loadEnv } from './env';
if (process.argv.includes('--help')) {
  console.log(`Create an ExitCheck report. Demo runs without a key; --live reads public network data.

npm run report -- [options]
  --live                       Read an actual Hedera account (default: synthetic example)
  --network testnet|mainnet     Network for live reads (default: mainnet)
  --account 0.0.ID              Account to inspect
  --payout 0.0.ID               Fungible HTS payment token
  --obligation AMOUNT          Payment amount in token units (default: 5000)
  --hbar-reserve AMOUNT        HBAR kept for fees (default: 10)
  --slippage-bps BPS           Output allowance; 100 = 1% (default: 100)
  --max-impact-bps BPS         Price-impact cap; 1500 = 15% (default: 1500)
  --liquidity-bps BPS          Remaining pool reserves; 2500 = 25% (default: 10000)
  --liquidation-bps BPS        Fraction of inventory examined (default: 10000)
  --obligation-multiplier-bps BPS  Multiply the payment (default: 10000)
  --out PATH                  Save JSON report (default: reports/report.json)

No trades are sent. Reports include inputs, source observations and a SHA-256 digest.`);
  process.exit(0);
}
loadEnv();
const req = requestSchema.parse({
  mode: process.argv.includes('--live') ? 'live' : 'demo',
  network: argument('--network', 'mainnet'),
  accountId: argument('--account', '0.0.8348691'),
  payoutTokenId: argument('--payout', '0.0.456858'),
  obligation: argument('--obligation', '5000'),
  hbarReserve: argument('--hbar-reserve', '10'),
  slippageBps: Number(argument('--slippage-bps', '100')),
  maxImpactBps: Number(argument('--max-impact-bps', '1500')),
  liquidityBps: Number(argument('--liquidity-bps', '10000')),
  obligationMultiplierBps: Number(
    argument('--obligation-multiplier-bps', '10000'),
  ),
  liquidationBps: Number(argument('--liquidation-bps', '10000')),
});
try {
  const snapshot =
    req.mode === 'demo' ? demoSnapshot() : await liveSnapshot(req);
  const report = envelope(createReport(snapshot, req));
  const output = resolve(argument('--out', 'reports/report.json')!);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        output,
        digest: report.digest,
        status: report.report.result.status,
        paymentToken: report.report.snapshot.payout.symbol,
        paymentNeeded: units(
          report.report.result.obligation,
          report.report.snapshot.payout.decimals,
        ),
        estimatedProceeds: units(
          report.report.result.minimumProceeds,
          report.report.snapshot.payout.decimals,
        ),
        paymentGap: units(
          report.report.result.shortfall,
          report.report.snapshot.payout.decimals,
        ),
        excludedBalances: report.report.result.excludedCount,
        network: report.report.snapshot.network,
        observedBlock:
          req.mode === 'live' ? report.report.snapshot.blockNumber : null,
        expiresAt: report.report.snapshot.expiresAt,
        mode: req.mode,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Report creation failed');
  process.exitCode = 1;
}

function units(raw: string, decimals: number) {
  const n = BigInt(raw),
    base = 10n ** BigInt(decimals);
  const fraction = (n % base)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');
  return `${n / base}${fraction ? '.' + fraction : ''}`;
}
