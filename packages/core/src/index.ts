import { createHash } from 'node:crypto';
import {
  envelopeSchema,
  optionsSchema,
  reportSchema,
  snapshotSchema,
  type Envelope,
  type Options,
  type Pool,
  type Report,
  type Snapshot,
} from './schema';
export * from './schema';
export function parseUnits(value: string, decimals: number): bigint {
  if (
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 18 ||
    !/^(0|[1-9]\d{0,29})(\.\d+)?$/.test(value)
  )
    throw new Error('Invalid decimal amount');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals)
    throw new Error(`This asset supports at most ${decimals} decimal places`);
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, '0') || '0')
  );
}
export function formatUnits(value: string | bigint, decimals: number): string {
  const n = BigInt(value);
  const base = 10n ** BigInt(decimals);
  return `${n / base}${decimals ? '.' + (n % base).toString().padStart(decimals, '0').replace(/0+$/, '') : ''}`.replace(
    /\.$/,
    '',
  );
}
export function amountOut(
  input: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps = 30,
): bigint {
  if (
    input < 0n ||
    reserveIn < 0n ||
    reserveOut < 0n ||
    !Number.isInteger(feeBps) ||
    feeBps < 0 ||
    feeBps >= 10000
  )
    throw new Error('Invalid pool amounts');
  if (!input || !reserveIn || !reserveOut) return 0n;
  const net = input * BigInt(10000 - feeBps);
  return (net * reserveOut) / (reserveIn * 10000n + net);
}
// Impact relative to the fee-adjusted spot price; integer rounding is excluded.
export function impactBps(
  input: bigint,
  reserveIn: bigint,
  feeBps = 30,
): number {
  if (!input) return 0;
  const net = input * BigInt(10000 - feeBps),
    den = reserveIn * 10000n + net;
  return Number((net * 10000n + den - 1n) / den);
}
function limitInput(
  input: bigint,
  reserve: bigint,
  maxImpact: number,
  fee: number,
): bigint {
  const limit =
    (BigInt(maxImpact) * reserve * 10000n) /
    (BigInt(10000 - maxImpact) * BigInt(10000 - fee));
  return input < limit ? input : limit;
}
export function createReport(raw: Snapshot, rawOptions: Options): Report {
  const snapshot = snapshotSchema.parse(raw),
    options = optionsSchema.parse(rawOptions);
  const baseline = parseUnits(options.obligation, snapshot.payout.decimals);
  if (baseline <= 0n) throw new Error('Obligation must be greater than zero');
  const obligation =
    (baseline * BigInt(options.obligationMultiplierBps) + 9999n) / 10000n;
  const poolMap = new Map(snapshot.pools.map((p) => [p.tokenIn, p]));
  if (poolMap.size !== snapshot.pools.length)
    throw new Error('Duplicate pool input');
  const addresses = new Set(snapshot.pools.map((p) => p.address.toLowerCase()));
  if (addresses.size !== snapshot.pools.length)
    throw new Error('Shared pools are not supported');
  const groups = new Map<
    string,
    {
      symbol: string;
      decimals: number;
      balance: bigint;
      eligible: boolean;
      reason?: string;
    }
  >();
  const exclusions: Report['result']['rows'] = [];
  const holdingIds = new Set<string>();
  for (const h of snapshot.holdings) {
    if (holdingIds.has(h.id)) throw new Error('Duplicate holding');
    holdingIds.add(h.id);
    const id = h.kind === 'native' ? snapshot.whbarTokenId : h.token.id;
    let balance = BigInt(h.balance);
    if (h.kind === 'native')
      balance =
        balance > BigInt(snapshot.hbarReserved)
          ? balance - BigInt(snapshot.hbarReserved)
          : 0n;
    if (!h.eligible) {
      exclusions.push({
        tokenId: id,
        symbol: h.token.symbol,
        decimals: h.token.decimals,
        balance: balance.toString(),
        sellInput: '0',
        unsold: balance.toString(),
        spotValue: '0',
        expectedOutput: '0',
        minimumOutput: '0',
        impactBps: 0,
        state: 'excluded',
        reason: h.exclusion ?? 'Unsupported token',
      });
      continue;
    }
    const g = groups.get(id);
    if (g) {
      if (g.decimals !== h.token.decimals)
        throw new Error('Inconsistent token decimals');
      g.balance += balance;
      g.symbol = id === snapshot.whbarTokenId ? 'HBAR + WHBAR' : g.symbol;
    } else
      groups.set(id, {
        symbol: h.token.symbol,
        decimals: h.token.decimals,
        balance,
        eligible: true,
      });
  }
  const rows: Report['result']['rows'] = [];
  for (const [id, g] of groups) {
    const selected = (g.balance * BigInt(options.liquidationBps)) / 10000n;
    if (id === snapshot.payout.id) {
      rows.push({
        tokenId: id,
        symbol: g.symbol,
        decimals: g.decimals,
        balance: g.balance.toString(),
        sellInput: selected.toString(),
        unsold: (g.balance - selected).toString(),
        spotValue: selected.toString(),
        expectedOutput: selected.toString(),
        minimumOutput: selected.toString(),
        impactBps: 0,
        state: 'cash',
      });
      continue;
    }
    const p = poolMap.get(id);
    if (!p) {
      rows.push({
        tokenId: id,
        symbol: g.symbol,
        decimals: g.decimals,
        balance: g.balance.toString(),
        sellInput: '0',
        unsold: g.balance.toString(),
        spotValue: '0',
        expectedOutput: '0',
        minimumOutput: '0',
        impactBps: 0,
        state: 'excluded',
        reason: 'No validated direct SaucerSwap V1 route to payout asset',
      });
      continue;
    }
    const baseIn = BigInt(p.reserveIn),
      baseOut = BigInt(p.reserveOut);
    const reserveIn = (baseIn * BigInt(options.liquidityBps)) / 10000n,
      reserveOut = (baseOut * BigInt(options.liquidityBps)) / 10000n;
    const sell = limitInput(
      selected,
      reserveIn,
      options.maxImpactBps,
      p.feeBps,
    );
    const out = amountOut(sell, reserveIn, reserveOut, p.feeBps);
    const minimum = (out * BigInt(10000 - options.slippageBps)) / 10000n;
    rows.push({
      tokenId: id,
      symbol: g.symbol,
      decimals: g.decimals,
      balance: g.balance.toString(),
      sellInput: sell.toString(),
      unsold: (g.balance - sell).toString(),
      spotValue: (baseIn ? (selected * baseOut) / baseIn : 0n).toString(),
      expectedOutput: out.toString(),
      minimumOutput: minimum.toString(),
      impactBps: impactBps(sell, reserveIn, p.feeBps),
      poolAddress: p.address,
      state: sell < selected ? 'limited' : 'quoted',
      ...(sell < selected
        ? { reason: 'Sale capped by the maximum price-impact policy' }
        : {}),
    });
  }
  rows.push(...exclusions);
  const sum = (key: 'minimumOutput' | 'spotValue') =>
    rows.reduce((n, r) => n + BigInt(r[key]), 0n);
  const proceeds = sum('minimumOutput'),
    spot = sum('spotValue'),
    excluded = rows.filter(
      (r) => r.state === 'excluded' && BigInt(r.balance) > 0n,
    ).length;
  const shortfall = obligation > proceeds ? obligation - proceeds : 0n;
  return reportSchema.parse({
    schema: 'exitcheck.report.v1',
    snapshot,
    options,
    result: {
      obligation: obligation.toString(),
      minimumProceeds: proceeds.toString(),
      spotValue: spot.toString(),
      shortfall: shortfall.toString(),
      surplus: (proceeds > obligation ? proceeds - obligation : 0n).toString(),
      coverageBps: Number(
        (proceeds * 10000n) / obligation > 100000000n
          ? 100000000n
          : (proceeds * 10000n) / obligation,
      ),
      status: !shortfall
        ? 'covered'
        : excluded || snapshot.warnings.some((w) => w.startsWith('INCOMPLETE:'))
          ? 'incomplete'
          : 'shortfall',
      excludedCount: excluded,
      rows,
    },
  });
}
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return '[' + value.map(canonicalize).join(',') + ']';
  if (typeof value === 'object')
    return (
      '{' +
      Object.keys(value as object)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ':' +
            canonicalize((value as Record<string, unknown>)[k]),
        )
        .join(',') +
      '}'
    );
  throw new Error('Only JSON values can be committed');
}
export function digestReport(report: Report): string {
  return createHash('sha256')
    .update(canonicalize(reportSchema.parse(report)), 'utf8')
    .digest('hex');
}
export function envelope(report: Report): Envelope {
  return { report, digest: digestReport(report) };
}
export function verifyEnvelope(
  raw: unknown,
  now = Date.now(),
): { valid: boolean; fresh: boolean; digest: string; reason: string } {
  const e = envelopeSchema.parse(raw),
    recomputed = createReport(e.report.snapshot, e.report.options),
    digest = digestReport(e.report);
  const intact = digest === e.digest,
    math = canonicalize(recomputed) === canonicalize(e.report);
  const fresh =
    Date.parse(e.report.snapshot.expiresAt) > now &&
    Date.parse(e.report.snapshot.observedAt) <= now + 30000;
  return {
    valid: intact && math,
    fresh,
    digest,
    reason: !intact
      ? 'Report digest mismatch'
      : !math
        ? 'Report results do not match the calculation'
        : !fresh
          ? 'Integrity verified; observation window expired'
          : 'Integrity and calculation verified',
  };
}
export function validatePoolQuote(pool: Pool): boolean {
  return (
    amountOut(
      BigInt(pool.quotedInput),
      BigInt(pool.reserveIn),
      BigInt(pool.reserveOut),
      pool.feeBps,
    ).toString() === pool.routerQuote
  );
}
