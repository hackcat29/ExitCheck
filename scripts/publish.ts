import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import {
  Client,
  PrivateKey,
  Hbar,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';
import {
  envelopeSchema,
  verifyEnvelope,
  canonicalize,
} from '../packages/core/src/index';
import { commitmentSchema } from '../packages/core/src/schema';
import { argument, loadEnv } from './env';
if (process.argv.includes('--help')) {
  console.log(`Publish a report commitment on Hedera TESTNET only.
Configure HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY and HEDERA_KEY_TYPE in local .env.
Set HCS_TOPIC_ID to reuse an authorized topic, or use --create-topic.

npm run hcs:publish -- --file reports/check.json --create-topic
  --file PATH        Report to publish (default: reports/report.json)
  --create-topic     Create a submit-key-protected topic if HCS_TOPIC_ID is unset
  --allow-expired    Explicitly archive an old report; does not make it fresh

Writes evidence/hcs-receipt.json and evidence/published-report.json.
Prints public transaction, HashScan and Mirror Node links. Fee cap: 2 HBAR per transaction.
Never record or commit .env.`);
  process.exit(0);
}
loadEnv();
let client: Client | undefined;
try {
  const file = argument('--file', 'reports/report.json')!;
  if ((await stat(file)).size > 250000)
    throw new Error('Report exceeds 250 KB');
  const raw = JSON.parse(await readFile(file, 'utf8')),
    e = envelopeSchema.parse(raw),
    check = verifyEnvelope(raw);
  if (!check.valid) throw new Error('Report integrity check failed');
  if (!check.fresh && !process.argv.includes('--allow-expired'))
    throw new Error(
      'Report has expired. Generate a new report or pass --allow-expired to archive it explicitly.',
    );
  const accountId = process.env.HEDERA_ACCOUNT_ID,
    keyText = process.env.HEDERA_PRIVATE_KEY;
  if (!accountId || !keyText)
    throw new Error(
      'Configure HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY locally. Never put a private key in a report or browser.',
    );
  const key =
    process.env.HEDERA_KEY_TYPE === 'ed25519'
      ? PrivateKey.fromStringED25519(keyText)
      : PrivateKey.fromStringECDSA(keyText);
  client = Client.forTestnet();
  client.setOperator(accountId, key);
  client.setDefaultMaxTransactionFee(new Hbar(2));
  const created: Record<string, string> = {};
  let topicId = process.env.HCS_TOPIC_ID;
  if (!topicId) {
    if (!process.argv.includes('--create-topic'))
      throw new Error(
        'Set HCS_TOPIC_ID or pass --create-topic to create a submit-key-protected topic.',
      );
    const response = await new TopicCreateTransaction()
      .setTopicMemo('ExitCheck v1 report commitments')
      .setSubmitKey(key.publicKey)
      .setMaxTransactionFee(new Hbar(2))
      .execute(client);
    const receipt = await response.getReceipt(client);
    topicId = receipt.topicId!.toString();
    created.topicCreateTransactionId = response.transactionId.toString();
  }
  const s = e.report.snapshot;
  const commitment = commitmentSchema.parse({
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
  });
  const payload = canonicalize(commitment);
  if (Buffer.byteLength(payload) > 1024)
    throw new Error('Commitment exceeds one HCS message');
  const response = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(payload)
    .setMaxTransactionFee(new Hbar(2))
    .execute(client);
  const receipt = await response.getReceipt(client),
    txId = response.transactionId.toString();
  const sequence = receipt.topicSequenceNumber!.toString();
  const evidence = {
    network: 'testnet',
    operatorAccountId: accountId,
    topicId,
    sequence,
    transactionId: txId,
    receiptStatus: receipt.status.toString(),
    ...created,
    commitment,
    hashscanUrl: `https://hashscan.io/testnet/transaction/${txId}`,
    mirrorUrl: `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages/${sequence}`,
  };
  await mkdir('evidence', { recursive: true });
  await writeFile(
    'evidence/hcs-receipt.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
  await writeFile(
    'evidence/published-report.json',
    JSON.stringify(e, null, 2) + '\n',
  );
  console.log(JSON.stringify(evidence, null, 2));
} catch (e) {
  const msg = e instanceof Error ? e.message : '';
  console.error(
    /Configure|expired|integrity|HCS_TOPIC_ID|exceeds/.test(msg)
      ? msg
      : 'Testnet publication failed. Check local key type, account funding and topic permissions. No private key is logged.',
  );
  process.exitCode = 1;
} finally {
  client?.close();
}
