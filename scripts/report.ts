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
