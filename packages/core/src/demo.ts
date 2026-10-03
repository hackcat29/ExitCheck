import { amountOut } from './index';
import type { Snapshot } from './schema';
export function demoSnapshot(now = new Date()): Snapshot {
  const pool = (
    tokenIn: string,
    reserveIn: string,
    reserveOut: string,
    quotedInput: string,
    index: number,
  ) => ({
    tokenIn,
    reserveIn,
    reserveOut,
    quotedInput,
    routerQuote: amountOut(
      BigInt(quotedInput),
      BigInt(reserveIn),
      BigInt(reserveOut),
    ).toString(),
    feeBps: 30 as const,
    address: '0x' + index.toString(16).padStart(40, '0'),
  });
  return {
    mode: 'demo',
    network: 'mainnet',
    accountId: '0.0.1062644',
    observedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 120000).toISOString(),
    blockNumber: 0,
    blockHash: '0x' + '0'.repeat(64),
    balanceTimestamp: 'synthetic',
    payout: { id: '0.0.456858', symbol: 'USDC', decimals: 6 },
    whbarTokenId: '0.0.1456986',
    hbarReserved: '1000000000',
    holdings: [
      {
        id: 'HBAR',
        kind: 'native',
        token: { id: '0.0.1456986', symbol: 'HBAR', decimals: 8 },
        balance: '501000000000',
        eligible: true,
      },
      {
        id: '0.0.731861',
        kind: 'hts',
        token: { id: '0.0.731861', symbol: 'SAUCE', decimals: 6 },
        balance: '300000000000',
        eligible: true,
      },
      {
        id: '0.0.456858',
        kind: 'hts',
        token: { id: '0.0.456858', symbol: 'USDC', decimals: 6 },
        balance: '400000000',
        eligible: true,
      },
      {
        id: '0.0.9000001',
        kind: 'hts',
        token: { id: '0.0.9000001', symbol: 'LOCK', decimals: 6 },
        balance: '200000000000',
        eligible: false,
        exclusion:
          'Synthetic example: token has custom fees; net proceeds are not modeled',
      },
    ],
    pools: [
      pool('0.0.1456986', '20000000000000', '30000000000', '500000000000', 1),
      pool('0.0.731861', '100000000000', '10000000000', '300000000000', 2),
    ],
    warnings: [
      'Demonstration only: synthetic balances, pools, and token flags. No live treasury claim.',
      'Direct V1 routes only. V2, multi-hop routes, gas, approvals and encumbrances are outside this estimate.',
    ],
    sources: [],
  };
}
