import { commitmentSchema, idSchema, type Envelope } from './schema';
import { mirrorJson, networks, type Fetcher } from './live';
export async function verifyHcs(
  e: Envelope,
  topic: string,
  sequence: string,
  expectedPayer?: string,
  fetcher?: Fetcher,
) {
  idSchema.parse(topic);
  if (!/^[1-9]\d{0,19}$/.test(sequence))
    throw new Error('Invalid HCS sequence');
  if (expectedPayer) idSchema.parse(expectedPayer);
  const mirrorUrl = `${networks.testnet.mirror}/api/v1/topics/${topic}/messages/${sequence}`;
  const message = await mirrorJson<{
    message: string;
    consensus_timestamp: string;
    sequence_number: string;
    payer_account_id: string;
  }>(mirrorUrl, fetcher);
  const commitment = commitmentSchema.parse(
      JSON.parse(Buffer.from(message.message, 'base64').toString('utf8')),
    ),
    s = e.report.snapshot;
  const matches =
    String(message.sequence_number) === sequence &&
    commitment.digest === e.digest &&
    commitment.observedAt === s.observedAt &&
    commitment.expiresAt === s.expiresAt &&
    commitment.sourceNetwork === s.network &&
    commitment.mode === s.mode &&
    commitment.blockNumber === s.blockNumber &&
    commitment.accountId === s.accountId &&
    (!expectedPayer || message.payer_account_id === expectedPayer);
  return {
    matches,
    topicId: topic,
    sequence: String(message.sequence_number),
    consensusTimestamp: message.consensus_timestamp,
    payerAccountId: message.payer_account_id,
    mirrorUrl,
  };
}
