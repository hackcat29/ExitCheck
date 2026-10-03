import { it, expect, vi } from 'vitest';
import { createReport, envelope, optionsSchema } from '../src/index';
import { demoSnapshot } from '../src/demo';
import { verifyHcs } from '../src/proof';
const e = envelope(
    createReport(demoSnapshot(), optionsSchema.parse({ obligation: '1000' })),
  ),
  s = e.report.snapshot;
const commitment = {
  schema: 'exitcheck.commitment.v1',
  algorithm: 'sha256',
  digest: e.digest,
  reportSchema: e.report.schema,
  sourceNetwork: s.network,
  mode: s.mode,
  observedAt: s.observedAt,
  expiresAt: s.expiresAt,
  blockNumber: s.blockNumber,
  accountId: s.accountId,
};
function response(c = commitment, payer = '0.0.1') {
  return vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          message: Buffer.from(JSON.stringify(c)).toString('base64'),
          sequence_number: 2,
          payer_account_id: payer,
          consensus_timestamp: '123.000000001',
        }),
      ),
  );
}
it('matches a published commitment and expected payer', async () => {
  expect((await verifyHcs(e, '0.0.2', '2', '0.0.1', response())).matches).toBe(
    true,
  );
});
it('rejects metadata mismatch even when the digest matches', async () => {
  expect(
    (
      await verifyHcs(
        e,
        '0.0.2',
        '2',
        undefined,
        response({ ...commitment, sourceNetwork: 'testnet' }),
      )
    ).matches,
  ).toBe(false);
});
it('rejects an unexpected payer', async () => {
  expect((await verifyHcs(e, '0.0.2', '2', '0.0.9', response())).matches).toBe(
    false,
  );
});
it('rejects invalid IDs before making a request', async () => {
  const fetcher = response();
  await expect(
    verifyHcs(e, 'https://evil.example', '2', undefined, fetcher),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
