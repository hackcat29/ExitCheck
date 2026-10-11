'use client';
import { useState } from 'react';
import type { Envelope, AnalysisRequest } from '@exitcheck/core/schema';

type Result = { envelope: Envelope };
type Verification = {
  valid: boolean;
  fresh: boolean;
  reason: string;
  hcs?: { matches: boolean; mirrorUrl: string; payerAccountId: string };
};
const initial: AnalysisRequest = {
  mode: 'live',
  network: 'testnet',
  accountId: '0.0.8348691',
  payoutTokenId: '0.0.1183558',
  obligation: '100',
  hbarReserve: '10',
  slippageBps: 100,
  maxImpactBps: 1500,
  liquidityBps: 10000,
  obligationMultiplierBps: 10000,
  liquidationBps: 10000,
};
function amount(raw: string, decimals: number) {
  const n = BigInt(raw),
    base = 10n ** BigInt(decimals);
  const fraction = (n % base)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');
  return `${(n / base).toLocaleString('en-US')}${fraction ? '.' + fraction : ''}`;
}
function save(e: Envelope) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(e, null, 2) + '\n'], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `exitcheck-${e.digest.slice(0, 12)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Workbench() {
  const [tab, setTab] = useState('Check'),
    [form, setForm] = useState(initial),
    [result, setResult] = useState<Result>(),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [text, setText] = useState(''),
    [topic, setTopic] = useState(''),
    [sequence, setSequence] = useState(''),
    [payer, setPayer] = useState(''),
    [verification, setVerification] = useState<Verification>(),
    [verifying, setVerifying] = useState(false);
  const report = result?.envelope.report,
    snapshot = report?.snapshot,
    r = report?.result;
  function update<K extends keyof AnalysisRequest>(
    key: K,
    value: AnalysisRequest[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }
  async function run() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run the check.');
      setDirty(true);
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setVerifying(true);
    setVerification(undefined);
    try {
      const query =
        topic || sequence
          ? '?' +
            new URLSearchParams({
              topic,
              sequence,
              ...(payer ? { payer } : {}),
            })
          : '';
      const response = await fetch('/api/verify' + query, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      setVerification(await response.json());
    } catch {
      setVerification({
        valid: false,
        fresh: false,
        reason: 'Could not reach the verifier. Is the local app running?',
      });
    } finally {
      setVerifying(false);
    }
  }
  const cliCommand = `npm run report -- --live --network ${form.network} --account ${form.accountId} --payout ${form.payoutTokenId} --obligation ${form.obligation} --hbar-reserve ${form.hbarReserve} --out reports/check.json --slippage-bps ${form.slippageBps} --max-impact-bps ${form.maxImpactBps} --liquidity-bps ${form.liquidityBps}`;
  return (
    <main>
      <header>
        <div>
          <a className="wordmark" href="/" aria-label="ExitCheck home">
            <img src="/exitcheck-mark.svg" width="36" height="36" alt="" />
            ExitCheck
          </a>
          <span className="tag">Hedera developer template</span>
        </div>
        <a
          href="https://github.com/hackcat29/ExitCheck"
          target="_blank"
          rel="noreferrer"
        >
          Source & documentation ↗
        </a>
      </header>
      <section className="intro">
        <h1>Check whether a token balance can cover a payment.</h1>
        <p>
          Read an account, estimate conversion through direct SaucerSwap V1
          pools, then save and verify the report. No trades are sent.
        </p>
      </section>
      <nav aria-label="Tools">
        {['Check', 'Verify', 'Setup'].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {tab === 'Check' && (
        <div className="check-layout">
          <section className="form-section">
            <h2>1. Choose the input</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run();
              }}
            >
              <label>
                Network
                <select
                  aria-label="Network"
                  value={form.network}
                  onChange={(e) => {
                    update('network', e.target.value as 'testnet' | 'mainnet');
                    update(
                      'payoutTokenId',
                      e.target.value === 'testnet'
                        ? '0.0.1183558'
                        : '0.0.456858',
                    );
                  }}
                >
                  <option value="testnet">Hedera testnet</option>
                  <option value="mainnet">Hedera mainnet</option>
                </select>
              </label>
              <label>
                Account ID
                <input
                  aria-label="Account ID"
                  value={form.accountId}
                  onChange={(e) => update('accountId', e.target.value)}
                  required
                  pattern="0\.0\.[0-9]+"
                />
              </label>
              <label>
                Payment token ID
                <input
                  aria-label="Payment token ID"
                  value={form.payoutTokenId}
                  onChange={(e) => update('payoutTokenId', e.target.value)}
                  required
                  pattern="0\.0\.[0-9]+"
                />
              </label>
              <p className="hint">
                SAUCE on testnet is 0.0.1183558. The account is read without a
                wallet or private key.
              </p>
              <label>
                Payment amount
                <input
                  aria-label="Payment amount"
                  value={form.obligation}
                  onChange={(e) => update('obligation', e.target.value)}
                  inputMode="decimal"
                  required
                  pattern="(0|[1-9][0-9]*)(\.[0-9]+)?"
                />
                <small>
                  In units of the payment token. For SAUCE, 100 means 100 SAUCE.
                </small>
              </label>
              <details>
                <summary>Conversion assumptions</summary>
                <div className="fields">
                  <label>
                    HBAR to keep for fees
                    <input
                      aria-label="HBAR to keep for fees"
                      value={form.hbarReserve}
                      onChange={(e) => update('hbarReserve', e.target.value)}
                    />
                    <small>
                      This HBAR is kept out of the conversion estimate for fees.
                    </small>
                  </label>
                  <label>
                    Maximum price impact (%)
                    <input
                      type="number"
                      min="1"
                      max="90"
                      step="0.01"
                      value={form.maxImpactBps / 100}
                      onChange={(e) =>
                        update(
                          'maxImpactBps',
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                  </label>
                  <label>
                    Slippage allowance (%)
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.01"
                      value={form.slippageBps / 100}
                      onChange={(e) =>
                        update(
                          'slippageBps',
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                  </label>
                  <label>
                    Pool liquidity remaining (%)
                    <input
                      aria-label="Pool liquidity remaining (%)"
                      type="number"
                      min="10"
                      max="100"
                      step="1"
                      value={form.liquidityBps / 100}
                      onChange={(e) =>
                        update(
                          'liquidityBps',
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                    <small>
                      100 uses the observed reserves. 25 simulates proportional
                      removal of 75% of liquidity.
                    </small>
                  </label>
                </div>
              </details>
              <button className="primary" disabled={busy}>
                {busy ? 'Reading balances and pools…' : 'Run check'}
              </button>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
            </form>
            <details className="command">
              <summary>Run this from the terminal</summary>
              <pre>{cliCommand}</pre>
              <p className="hint">
                For all conversion settings, run{' '}
                <code>npm run report -- --help</code>.
              </p>
            </details>
          </section>
          <section className="output" aria-live="polite">
            <h2>2. Read the result</h2>
            {!r || !snapshot ? (
              <div className="empty">
                <h3>No report yet.</h3>
                <p>
                  Run a check to read the public account balances and estimate
                  whether they can cover your payment. No wallet or private key
                  is needed.
                </p>
              </div>
            ) : (
              <>
                {dirty && (
                  <p role="status" className="notice">
                    Inputs changed. Run check again before using this result.
                  </p>
                )}
                <div
                  className={
                    r.status === 'covered' ? 'result covered' : 'result gap'
                  }
                >
                  <span className="result-source">
                    {`LIVE READ · ${snapshot.network.toUpperCase()}`}
                  </span>
                  <h3>
                    {r.status === 'covered'
                      ? 'The checked balances cover the payment.'
                      : 'The checked balances do not cover the payment.'}
                  </h3>
                  <p>
                    {r.status === 'incomplete'
                      ? 'Some balances could not be included. Other routes may change the result.'
                      : 'This estimate uses only the supported routes and the assumptions above.'}
                  </p>
                </div>
                <dl className="totals">
                  <div>
                    <dt>Payment needed</dt>
                    <dd>
                      {amount(r.obligation, snapshot.payout.decimals)}{' '}
                      {snapshot.payout.symbol}
                    </dd>
                  </div>
                  <div>
                    <dt>Estimated proceeds after allowances</dt>
                    <dd>
                      {amount(r.minimumProceeds, snapshot.payout.decimals)}{' '}
                      {snapshot.payout.symbol}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {r.status === 'covered'
                        ? 'Amount above payment'
                        : 'Payment gap'}
                    </dt>
                    <dd>
                      {amount(
                        r.status === 'covered' ? r.surplus : r.shortfall,
                        snapshot.payout.decimals,
                      )}{' '}
                      {snapshot.payout.symbol}
                    </dd>
                  </div>
                </dl>
                <h3 className="table-title">What each balance contributes</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Balance</th>
                        <th>Proceeds ({snapshot.payout.symbol})</th>
                        <th>How it is treated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.map((row, i) => (
                        <tr key={`${row.tokenId}-${i}`}>
                          <td>
                            <strong>{row.symbol}</strong>
                            <small>{row.tokenId}</small>
                          </td>
                          <td>{amount(row.balance, row.decimals)}</td>
                          <td>
                            {row.state === 'excluded'
                              ? 'Not included'
                              : amount(
                                  row.minimumOutput,
                                  snapshot.payout.decimals,
                                )}
                          </td>
                          <td>
                            {row.state === 'cash'
                              ? 'Already the payment token'
                              : row.state === 'excluded'
                                ? row.reason
                                : row.state === 'limited'
                                  ? `Conversion capped at the price-impact limit. ${amount(row.unsold, row.decimals)} ${row.symbol} remains.`
                                  : 'Direct SaucerSwap V1 pool'}
                            {row.poolAddress && (
                              <small>Pool: {row.poolAddress}</small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {snapshot.warnings.length > 0 && (
                  <details>
                    <summary>
                      Excluded balances and observation notes (
                      {snapshot.warnings.length})
                    </summary>
                    <ul>
                      {snapshot.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="actions">
                  <button
                    disabled={dirty || busy}
                    onClick={() => save(result!.envelope)}
                  >
                    Save JSON report
                  </button>
                  <button
                    disabled={dirty || busy}
                    onClick={() => {
                      setText(JSON.stringify(result!.envelope, null, 2));
                      setVerification(undefined);
                      setTopic('');
                      setSequence('');
                      setPayer('');
                      setTab('Verify');
                    }}
                  >
                    Verify this report
                  </button>
                </div>
                <details>
                  <summary>Raw report and source details</summary>
                  <p>
                    {`Account ${snapshot.accountId} · EVM block ${snapshot.blockNumber} · observed ${snapshot.observedAt}`}
                  </p>
                  <p>
                    Observation expires: {snapshot.expiresAt}. A report hash
                    verifies file integrity, not account ownership or trade
                    execution.
                  </p>
                  <pre>{JSON.stringify(result!.envelope, null, 2)}</pre>
                </details>
              </>
            )}
          </section>
        </div>
      )}
      {tab === 'Verify' && (
        <section className="verify-section">
          <h2>Verify a saved report</h2>
          <p>
            The verifier recalculates the report and checks its hash. Optionally
            compare it with a published testnet HCS message.
          </p>
          <label className="file">
            Choose a report JSON file
            <input
              type="file"
              accept=".json,application/json"
              aria-label="Report JSON file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setVerification(undefined);
                if (file.size > 250000) {
                  setVerification({
                    valid: false,
                    fresh: false,
                    reason: 'Report exceeds 250 KB.',
                  });
                  return;
                }
                setText(await file.text());
              }}
            />
          </label>
          <label>
            Report JSON
            <textarea
              aria-label="Report JSON"
              rows={9}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setVerification(undefined);
              }}
              placeholder="Import a file or paste its contents."
            />
          </label>
          <details>
            <summary>Compare with a Hedera testnet HCS message</summary>
            <div className="proof-fields">
              <label>
                Topic ID
                <input
                  aria-label="Topic ID"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setVerification(undefined);
                  }}
                  placeholder="0.0.10835164"
                />
              </label>
              <label>
                Message sequence
                <input
                  aria-label="Message sequence"
                  value={sequence}
                  onChange={(e) => {
                    setSequence(e.target.value);
                    setVerification(undefined);
                  }}
                  placeholder="2"
                />
              </label>
              <label>
                Expected payer (optional)
                <input
                  aria-label="Expected payer"
                  value={payer}
                  onChange={(e) => {
                    setPayer(e.target.value);
                    setVerification(undefined);
                  }}
                  placeholder="0.0.8348691"
                />
              </label>
            </div>
          </details>
          <button
            className="primary"
            disabled={!text || verifying}
            onClick={() => void verify()}
          >
            {verifying ? 'Verifying…' : 'Verify report'}
          </button>
          {verification && (
            <div
              role="status"
              className={
                verification.valid ? 'verification covered' : 'verification gap'
              }
            >
              <h3>
                {verification.valid ? 'Report verified' : 'Verification failed'}
              </h3>
              <p>{verification.reason}</p>
              {verification.valid && (
                <p>
                  {verification.fresh
                    ? 'The observation window is still open.'
                    : 'The observation has expired. Its integrity can still be verified; create a new report for a current estimate.'}
                </p>
              )}
              {verification.hcs?.matches && (
                <p>
                  <strong>HCS message matches.</strong> Payer:{' '}
                  {verification.hcs.payerAccountId}.{' '}
                  <a
                    href={verification.hcs.mirrorUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the Mirror Node message ↗
                  </a>
                </p>
              )}
            </div>
          )}
          <p className="hint">
            A matching HCS message establishes that this report matches a
            published commitment. It does not certify the balances or guarantee
            a conversion.
          </p>
        </section>
      )}
      {tab === 'Setup' && (
        <section className="setup-section">
          <h2>Use ExitCheck from the terminal</h2>
          <p>
            The command-line tools use the same calculation and verification
            code as this page.
          </p>
          <h3>1. Clone and install</h3>
          <pre>
            {
              'git clone https://github.com/hackcat29/ExitCheck.git\ncd ExitCheck\nnpm ci\nnpm run check'
            }
          </pre>
          <h3>2. Read actual testnet balances and a SaucerSwap pool</h3>
          <pre>
            {
              'npm run report -- --live --network testnet --account 0.0.8348691 --payout 0.0.1183558 --obligation 100 --out reports/testnet.json'
            }
          </pre>
          <p>
            No signing key is needed for a live read. Account balances and pool
            reserves are public.
          </p>
          <h3>3. Publish a report hash on Hedera testnet</h3>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> and configure a
            funded testnet account locally. The key is used only by the
            publishing CLI. Keep it out of screen recordings.
          </p>
          <pre>
            {
              'npm run hcs:publish -- --file reports/testnet.json --create-topic'
            }
          </pre>
          <p>
            The command prints the real transaction link and writes{' '}
            <code>evidence/hcs-receipt.json</code>. Open its HashScan URL and
            check the success status. For later reports, set{' '}
            <code>HCS_TOPIC_ID</code> to reuse your topic.
          </p>
          <h3>4. Verify the actual message</h3>
          <pre>
            {
              'npm run verify -- --file evidence/published-report.json --topic YOUR_TOPIC --sequence YOUR_SEQUENCE --payer YOUR_ACCOUNT'
            }
          </pre>
          <p>
            Read the{' '}
            <a
              href="https://github.com/hackcat29/ExitCheck/blob/main/README.md"
              target="_blank"
              rel="noreferrer"
            >
              README
            </a>{' '}
            for scaffolding, configuration and extension points. Conversion
            logic is in <code>packages/core</code>; signing is in{' '}
            <code>scripts/publish.ts</code>.
          </p>
        </section>
      )}
      <footer>
        Direct SaucerSwap V1 routes only. Analysis is read-only. Reports expire
        after two minutes.
      </footer>
    </main>
  );
}
