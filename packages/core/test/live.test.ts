import { describe, it, expect, vi } from 'vitest';
import {
  mirrorJson,
  readRelationships,
  solidityAddress,
  tokenExclusion,
} from '../src/live';
const metadata = {
  token_id: '0.0.731861',
  symbol: 'SAUCE',
  decimals: '6',
  type: 'FUNGIBLE_COMMON',
  deleted: false,
  pause_status: 'NOT_APPLICABLE',
  custom_fees: { fixed_fees: [], fractional_fees: [], royalty_fees: [] },
};
const relation = {
  token_id: '0.0.731861',
  balance: '100',
  freeze_status: 'NOT_APPLICABLE',
  kyc_status: 'NOT_APPLICABLE',
};
describe('HTS eligibility', () => {
  it('permits a plain transferable fungible token', () =>
    expect(tokenExclusion(metadata, relation)).toBeUndefined());
  it('excludes frozen, KYC-restricted, paused and deleted holdings', () => {
    expect(
      tokenExclusion(metadata, { ...relation, freeze_status: 'FROZEN' }),
    ).toMatch(/frozen/);
    expect(
      tokenExclusion(metadata, { ...relation, kyc_status: 'REVOKED' }),
    ).toMatch(/KYC/);
    expect(tokenExclusion({ ...metadata, pause_status: 'PAUSED' })).toMatch(
      /paused/,
    );
    expect(tokenExclusion({ ...metadata, deleted: true })).toMatch(/deleted/);
  });
  it('rejects custom fees, NFTs and unknown fee configuration', () => {
    expect(
      tokenExclusion({ ...metadata, custom_fees: { fractional_fees: [{}] } }),
    ).toMatch(/Custom fees/);
    expect(
      tokenExclusion({ ...metadata, type: 'NON_FUNGIBLE_UNIQUE' }),
    ).toMatch(/Non-fungible/);
    expect(tokenExclusion({ ...metadata, custom_fees: undefined })).toMatch(
      /unavailable/,
    );
  });
  it('maps Hedera entity IDs without floating-point truncation', () => {
    expect(solidityAddress('0.0.731861')).toBe(
      '0x00000000000000000000000000000000000b2ad5',
    );
    expect(solidityAddress('0.0.9007199254740993')).toBe(
      '0x0000000000000000000000000020000000000001',
    );
    expect(() => solidityAddress('evil-url')).toThrow();
  });
});
describe('Mirror Node adapter', () => {
  it('preserves JSON integer balances larger than Number.MAX_SAFE_INTEGER', async () => {
    const fetcher = vi.fn(
      async () => new Response('{"balance":90071992547409931234}'),
    ) as unknown as typeof fetch;
    const data = await mirrorJson<{ balance: string }>(
      'https://example.com',
      fetcher,
    );
    expect(data.balance).toBe('90071992547409931234');
  });
  it('follows relative pagination without dropping holdings', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tokens: [relation],
            links: { next: '/api/v1/accounts/0.0.1/tokens?next=1' },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tokens: [{ ...relation, token_id: '0.0.2' }],
            links: { next: null },
          }),
        ),
      );
    const data = await readRelationships(
      'https://mirror.example',
      '0.0.1',
      fetcher,
    );
    expect(data.items).toHaveLength(2);
    expect(data.truncated).toBe(false);
  });
  it('refuses pagination to an external origin', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tokens: [],
          links: { next: 'https://attacker.example/steal' },
        }),
      ),
    );
    await expect(
      readRelationships('https://mirror.example', '0.0.1', fetcher),
    ).rejects.toThrow('origin');
  });
  it('reports truncation after five pages', async () => {
    let page = 0;
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            tokens: [],
            links: { next: `/api/v1/accounts/0.0.1/tokens?page=${++page}` },
          }),
        ),
    );
    const result = await readRelationships(
      'https://mirror.example',
      '0.0.1',
      fetcher,
    );
    expect(result.truncated).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it('rejects upstream errors', async () => {
    await expect(
      mirrorJson(
        'https://example.com',
        vi.fn(async () => new Response('bad', { status: 429 })),
      ),
    ).rejects.toThrow('429');
  });
});
