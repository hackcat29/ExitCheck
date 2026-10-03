import { readFile, stat } from 'node:fs/promises';
import { envelopeSchema, verifyEnvelope } from '../packages/core/src/index';
import { verifyHcs } from '../packages/core/src/proof';
import { argument } from './env';
try {
  const path = argument('--file', 'reports/report.json')!;
  if ((await stat(path)).size > 250000)
    throw new Error('Report exceeds 250 KB');
  const raw = JSON.parse(await readFile(path, 'utf8')),
    e = envelopeSchema.parse(raw),
    verified = verifyEnvelope(raw);
  const topic = argument('--topic'),
    sequence = argument('--sequence');
  if ((topic && !sequence) || (!topic && sequence))
    throw new Error('Supply both topic and sequence');
  const hcs =
    topic && sequence
      ? await verifyHcs(e, topic, sequence, argument('--payer'))
      : undefined;
  console.log(
    JSON.stringify({ ...verified, ...(hcs ? { hcs } : {}) }, null, 2),
  );
  if (!verified.valid || (hcs && !hcs.matches)) process.exitCode = 1;
} catch {
  console.error(
    'Verification failed: invalid report, altered calculation, or unavailable/mismatched HCS message.',
  );
  process.exitCode = 1;
}
