import { describe, it, expect } from 'vitest';
import {
  amountOut,
  canonicalize,
  createReport,
  digestReport,
  envelope,
  formatUnits,
  parseUnits,
  validatePoolQuote,
  verifyEnvelope,
  optionsSchema,
} from '../src/index';
import { demoSnapshot } from '../src/demo';
const options = optionsSchema.parse({ obligation: '5000' });
describe('integer arithmetic', () => {
  it('preserves large balances and token decimals', () => {
    expect(parseUnits('9007199254740993.123456', 6)).toBe(
      9007199254740993123456n,
    );
    expect(formatUnits(9007199254740993123456n, 6)).toBe(
      '9007199254740993.123456',
    );
    expect(() => parseUnits('1.001', 2)).toThrow();
    expect(() => parseUnits('1e6', 6)).toThrow();
  });
  it('matches the V1 constant-product equation with downward rounding', () => {
    expect(amountOut(100n, 1000n, 1000n)).toBe(90n);
    expect(amountOut(0n, 1000n, 1000n)).toBe(0n);
    expect(amountOut(10n, 0n, 0n)).toBe(0n);
    expect(() => amountOut(-1n, 10n, 10n)).toThrow();
  });
});
describe('payout coverage', () => {
  it('caps sales under impact policy rather than overstating treasury value', () => {
    const r = createReport(demoSnapshot(), options);
    expect(BigInt(r.result.spotValue)).toBeGreaterThan(
      BigInt(r.result.obligation),
    );
    expect(BigInt(r.result.minimumProceeds)).toBeLessThan(
      BigInt(r.result.obligation),
    );
    expect(r.result.status).toBe('incomplete');
    const sauce = r.result.rows.find((r) => r.symbol === 'SAUCE')!;
    expect(sauce.state).toBe('limited');
    expect(sauce.impactBps).toBeLessThanOrEqual(options.maxImpactBps);
    expect(BigInt(sauce.unsold)).toBeGreaterThan(0n);
  });
  it('covers a smaller obligation using the same inventory', () => {
    expect(
      createReport(demoSnapshot(), { ...options, obligation: '1000' }).result
        .status,
    ).toBe('covered');
  });
  it('reduces minimum proceeds as both reserves are withdrawn', () => {
    const s = demoSnapshot();
    let previous = 2n ** 256n;
    for (const liquidityBps of [10000, 7500, 5000, 2500, 1000]) {
      const proceeds = BigInt(
        createReport(s, { ...options, liquidityBps }).result.minimumProceeds,
      );
      expect(proceeds).toBeLessThanOrEqual(previous);
      previous = proceeds;
    }
  });
  it('counts payout assets without swap fee or slippage', () => {
    const s = demoSnapshot();
    s.holdings = s.holdings.filter((h) => h.token.id === s.payout.id);
    s.pools = [];
    const r = createReport(s, { ...options, slippageBps: 3000 });
    expect(r.result.minimumProceeds).toBe('400000000');
    expect(r.result.status).toBe('shortfall');
  });
  it('keeps the HBAR fee reserve and combines HBAR/WHBAR inventory', () => {
    const s = demoSnapshot();
    s.holdings.push({
      id: 'wrapped',
      kind: 'hts',
      token: { id: s.whbarTokenId, symbol: 'WHBAR', decimals: 8 },
      balance: '100000000000',
      eligible: true,
    });
    const r = createReport(s, options);
    const rows = r.result.rows.filter((r) => r.tokenId === s.whbarTokenId);
    expect(rows).toHaveLength(1);
    expect(rows[0].balance).toBe('600000000000');
    expect(rows[0].minimumOutput).toBe(
      createReport(
        {
          ...s,
          holdings: s.holdings
            .filter((h) => h.id !== 'wrapped')
            .map((h) =>
              h.kind === 'native' ? { ...h, balance: '601000000000' } : h,
            ),
        },
        options,
      ).result.rows.find((r) => r.tokenId === s.whbarTokenId)!.minimumOutput,
    );
  });
  it('marks missing routes and failed observations as incomplete', () => {
    const s = demoSnapshot();
    s.pools = [];
    expect(createReport(s, options).result.status).toBe('incomplete');
    const t = demoSnapshot();
    t.holdings = t.holdings.filter((h) => h.token.id === t.payout.id);
    t.pools = [];
    t.warnings.push('INCOMPLETE: truncated records');
    expect(createReport(t, options).result.status).toBe('incomplete');
  });
  it('rejects duplicate shared pools and duplicate holdings', () => {
    const s = demoSnapshot();
    s.pools[1].address = s.pools[0].address;
    expect(() => createReport(s, options)).toThrow('Shared pools');
    const t = demoSnapshot();
    t.holdings.push(t.holdings[0]);
    expect(() => createReport(t, options)).toThrow('Duplicate holding');
  });
  it('requires a positive obligation and honors output decimals', () => {
    expect(() =>
      createReport(demoSnapshot(), { ...options, obligation: '0' }),
    ).toThrow();
    expect(() =>
      createReport(demoSnapshot(), { ...options, obligation: '1.0000001' }),
    ).toThrow();
  });
  it('applies the multiplier with conservative upward rounding', () => {
    expect(
      createReport(demoSnapshot(), {
        ...options,
        obligation: '0.000001',
        obligationMultiplierBps: 15000,
      }).result.obligation,
    ).toBe('2');
  });
  it('validates router quote against raw reserves', () => {
    const p = demoSnapshot().pools[0];
    expect(validatePoolQuote(p)).toBe(true);
    expect(validatePoolQuote({ ...p, routerQuote: '1' })).toBe(false);
  });
});
describe('reproducible reports', () => {
  it('canonicalizes keys, preserving array order', () => {
    expect(canonicalize({ z: 1, a: { y: 2, x: 3 } })).toBe(
      canonicalize({ a: { x: 3, y: 2 }, z: 1 }),
    );
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
    expect(() => canonicalize({ x: undefined })).toThrow();
  });
  it('verifies an intact report and detects result tampering', () => {
    const e = envelope(createReport(demoSnapshot(), options));
    expect(verifyEnvelope(e).valid).toBe(true);
    e.report.result.minimumProceeds = '1';
    expect(verifyEnvelope(e).valid).toBe(false);
  });
  it('detects forged calculations even if an attacker updates the digest', () => {
    const e = envelope(createReport(demoSnapshot(), options));
    e.report.result.shortfall = '0';
    e.digest = digestReport(e.report);
    expect(verifyEnvelope(e).valid).toBe(false);
  });
  it('separates expired observations from integrity', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const e = envelope(createReport(demoSnapshot(now), options));
    const v = verifyEnvelope(e, now.getTime() + 121000);
    expect(v.valid).toBe(true);
    expect(v.fresh).toBe(false);
  });
  it('rejects unknown report fields instead of discarding committed data', () => {
    const e = envelope(createReport(demoSnapshot(), options));
    expect(() => verifyEnvelope({ ...e, secret: 'unexpected' })).toThrow();
  });
});
