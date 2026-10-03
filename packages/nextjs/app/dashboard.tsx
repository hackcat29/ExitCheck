'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FlaskConical,
  Layers3,
  Loader2,
  PanelLeftClose,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import type { Envelope, Report } from '@exitcheck/core/schema';
type Result = {
  envelope: Envelope;
  ladder: { liquidationBps: number; result: Report['result'] }[];
  stress: { liquidityBps: number; result: Report['result'] }[];
};
type Form = {
  mode: 'demo' | 'live';
  network: 'mainnet' | 'testnet';
  accountId: string;
  payoutTokenId: string;
  obligation: string;
  hbarReserve: string;
  slippageBps: number;
  maxImpactBps: number;
  liquidityBps: number;
  obligationMultiplierBps: number;
  liquidationBps: number;
};
const defaults: Form = {
  mode: 'demo',
  network: 'mainnet',
  accountId: '0.0.1062644',
  payoutTokenId: '0.0.456858',
  obligation: '5000',
  hbarReserve: '10',
  slippageBps: 100,
  maxImpactBps: 1500,
  liquidityBps: 10000,
  obligationMultiplierBps: 10000,
  liquidationBps: 10000,
};
function units(raw: string, decimals: number) {
  const n = BigInt(raw),
    base = 10n ** BigInt(decimals);
  return `${n / base}${decimals ? '.' + (n % base).toString().padStart(decimals, '0') : ''}`;
}
function display(raw: string, decimals: number, max = 2) {
  const n = Number(units(raw, decimals));
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: max }).format(
    n,
  );
}
const pct = (bps: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(
    bps / 100,
  ) + '%';
function download(result: Envelope) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `exitcheck-${result.digest.slice(0, 12)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Dashboard() {
  const [form, setForm] = useState<Form>(defaults),
    [result, setResult] = useState<Result>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [tab, setTab] = useState('Overview'),
    [sidebar, setSidebar] = useState(false),
    [dirty, setDirty] = useState(false),
    [now, setNow] = useState(Date.now()),
    [copied, setCopied] = useState(false);
  const [verifyText, setVerifyText] = useState(''),
    [verification, setVerification] = useState<{
      valid: boolean;
      fresh: boolean;
      reason: string;
      digest?: string;
      hcs?: {
        matches: boolean;
        mirrorUrl: string;
        payerAccountId: string;
        consensusTimestamp: string;
      };
    }>(),
    [verifying, setVerifying] = useState(false);
  const [topic, setTopic] = useState(''),
    [sequence, setSequence] = useState(''),
    [payer, setPayer] = useState('');
  const initial = useRef(false);
  async function analyze(data: Form) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Analysis failed');
      setResult(body);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setDirty(true);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!initial.current) {
      initial.current = true;
      void analyze(defaults);
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }
  const report = result?.envelope.report,
    r = report?.result,
    s = report?.snapshot,
    decimals = s?.payout.decimals ?? 6,
    symbol = s?.payout.symbol ?? 'USDC';
  const expired = !!s && Date.parse(s.expiresAt) <= now;
  const chart = result?.stress ?? [];
  const maxChart =
    Math.max(
      ...chart.map((p) => Number(units(p.result.minimumProceeds, decimals))),
      r ? Number(units(r.obligation, decimals)) : 0,
      1,
    ) * 1.15;
  const ticks = [0, 1, 2, 3, 4];
  async function verify() {
    setVerifying(true);
    setVerification(undefined);
    try {
      const response = await fetch(
        '/api/verify' +
          (topic || sequence
            ? '?' +
              new URLSearchParams({
                topic,
                sequence,
                ...(payer ? { payer } : {}),
              }).toString()
            : ''),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: verifyText,
        },
      );
      setVerification(await response.json());
    } catch {
      setVerification({
        valid: false,
        fresh: false,
        reason: 'Verification service is unavailable.',
      });
    } finally {
      setVerifying(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? 'is-open' : ''}`}>
        <a className="brand" href="/" aria-label="ExitCheck home">
          <span className="brand-icon">
            <ArrowUpRight size={23} />
          </span>
          ExitCheck<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <div className="workspace-icon">
            <Layers3 size={18} />
          </div>
          <div>
            <strong>Treasury workspace</strong>
            <small>Hedera network</small>
          </div>
          <span className="online-dot" />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {[
            { name: 'Overview', icon: Layers3 },
            { name: 'Verify report', icon: FileCheck2 },
            { name: 'Methodology', icon: ShieldCheck },
          ].map((item) => (
            <button
              key={item.name}
              className={tab === item.name ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setTab(item.name);
                setSidebar(false);
              }}
            >
              <item.icon size={18} />
              {item.name}
              {tab === item.name && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card">
            <div>
              <span className="online-dot" /> Built for Hedera
            </div>
            <p>
              Real liquidity.
              <br />
              Clearer decisions.
            </p>
            <a
              href="https://docs.saucerswap.finance/developers/contracts"
              target="_blank"
              rel="noreferrer"
            >
              SaucerSwap integration <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="profile">
            <span>EC</span>
            <div>
              <strong>ExitCheck Template</strong>
              <small>Open source · MIT</small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="menu-toggle"
              aria-label="Toggle navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              <PanelLeftClose size={19} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{tab}</strong>
          </div>
          <div className="top-right">
            <span className="chain-tag">
              <span className="online-dot" />
              Hedera
            </span>
            <a
              className="docs-link"
              href="https://github.com/hedera-dev/scaffold-hbar"
              target="_blank"
              rel="noreferrer"
            >
              Developer docs <ArrowUpRight size={14} />
            </a>
            <span className="avatar">EC</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">TREASURY INTELLIGENCE</div>
              <h1>
                {tab === 'Overview'
                  ? 'Is your treasury ready to pay?'
                  : tab === 'Verify report'
                    ? 'Trust the report. Check the evidence.'
                    : 'Understand every assumption.'}
              </h1>
              <p>
                {tab === 'Overview'
                  ? 'Go beyond balances. See what your assets can actually cover.'
                  : tab === 'Verify report'
                    ? 'Independently verify the integrity and calculations of an exported report.'
                    : 'A transparent, reproducible model for payout coverage.'}
              </p>
            </div>
            {tab === 'Overview' && (
              <button
                className="button secondary export-button"
                disabled={!result || busy}
                onClick={() => result && download(result.envelope)}
              >
                <ArrowDownToLine size={16} />
                Export report
              </button>
            )}
          </div>
          {tab === 'Overview' && (
            <>
              <div className="demo-banner">
                <div className="banner-symbol">
                  <FlaskConical size={20} />
                </div>
                <div>
                  <strong>
                    {s?.mode === 'live'
                      ? 'Live observation · read-only'
                      : 'Explore a treasury that looks richer than it is'}
                  </strong>
                  <p>
                    {s?.mode === 'live'
                      ? `Balances from Mirror Node · V1 pools at block ${s.blockNumber.toLocaleString()} · No trades are executed.`
                      : 'Synthetic holdings show how thin liquidity can turn a healthy balance into a payout gap.'}
                  </p>
                </div>
                <span
                  className={`badge ${s?.mode === 'live' ? 'green' : 'purple'}`}
                >
                  {s?.mode === 'live' ? 'Live data' : 'Demo data'}
                </span>
              </div>
              <section className="panel input-panel">
                <div className="panel-heading">
                  <h2>
                    <Wallet size={18} />
                    Treasury check
                  </h2>
                  <div className="segmented">
                    {(['demo', 'live'] as const).map((mode) => (
                      <button
                        key={mode}
                        className={form.mode === mode ? 'selected' : ''}
                        onClick={() => {
                          if (mode === 'demo') {
                            setForm(defaults);
                            setDirty(true);
                          } else update('mode', mode);
                        }}
                      >
                        {mode === 'demo' ? 'Demo treasury' : 'Live account'}
                      </button>
                    ))}
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void analyze(form);
                  }}
                >
                  <div className="input-grid">
                    <label className="account-label">
                      Treasury account
                      <div className="input-wrap">
                        <Search size={15} />
                        <input
                          aria-label="Treasury account"
                          value={form.accountId}
                          disabled={form.mode === 'demo' || busy}
                          onChange={(e) => update('accountId', e.target.value)}
                          placeholder="0.0.12345"
                          required
                        />
                      </div>
                    </label>
                    <label>
                      Payout asset{' '}
                      {form.mode === 'demo' ? (
                        <div className="payout-display">
                          <span className="coin usdc">$</span> USDC{' '}
                          <small>USD Coin</small>
                        </div>
                      ) : (
                        <input
                          aria-label="Payout token ID"
                          value={form.payoutTokenId}
                          onChange={(e) =>
                            update('payoutTokenId', e.target.value)
                          }
                          placeholder="0.0.456858"
                          required
                        />
                      )}
                    </label>
                    <label>
                      Obligation amount
                      <div className="input-wrap">
                        <span className="muted">
                          {form.mode === 'demo' ? '$' : '#'}
                        </span>
                        <input
                          aria-label="Obligation amount"
                          inputMode="decimal"
                          value={form.obligation}
                          onChange={(e) => update('obligation', e.target.value)}
                          required
                        />
                      </div>
                    </label>
                    <button
                      className="button primary"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="spin" size={16} />
                      ) : (
                        <ArrowRight size={16} />
                      )}{' '}
                      {busy ? 'Checking sources…' : 'Run exit check'}
                    </button>
                  </div>
                  {form.mode === 'live' && (
                    <div className="live-controls">
                      <label>
                        Network
                        <select
                          value={form.network}
                          onChange={(e) =>
                            update('network', e.target.value as Form['network'])
                          }
                        >
                          <option value="mainnet">Mainnet · read-only</option>
                          <option value="testnet">Testnet · read-only</option>
                        </select>
                      </label>
                      <label>
                        HBAR kept for fees
                        <input
                          aria-label="HBAR reserve"
                          value={form.hbarReserve}
                          onChange={(e) =>
                            update('hbarReserve', e.target.value)
                          }
                        />
                      </label>
                      <p>
                        Use a fungible HTS payout token without custom fees. No
                        wallet connection is required.
                      </p>
                    </div>
                  )}
                  <details className="policy-details">
                    <summary>
                      <SlidersHorizontal size={14} />
                      Execution policy{' '}
                      <span>
                        Slippage {pct(form.slippageBps)} · Maximum price impact{' '}
                        {pct(form.maxImpactBps)}
                      </span>
                    </summary>
                    <div className="policy-controls">
                      <label>
                        Slippage buffer
                        <select
                          value={form.slippageBps}
                          onChange={(e) =>
                            update('slippageBps', Number(e.target.value))
                          }
                        >
                          {[0, 50, 100, 200, 500].map((n) => (
                            <option value={n} key={n}>
                              {pct(n)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Maximum price impact
                        <select
                          value={form.maxImpactBps}
                          onChange={(e) =>
                            update('maxImpactBps', Number(e.target.value))
                          }
                        >
                          {[100, 500, 1000, 1500, 2500].map((n) => (
                            <option value={n} key={n}>
                              {pct(n)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Inventory available
                        <select
                          value={form.liquidationBps}
                          onChange={(e) =>
                            update('liquidationBps', Number(e.target.value))
                          }
                        >
                          {[2500, 5000, 7500, 10000].map((n) => (
                            <option value={n} key={n}>
                              {pct(n)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </details>
                </form>
              </section>
              {error && (
                <div role="alert" className="error-banner">
                  <TriangleAlert size={18} />
                  {error}
                </div>
              )}
              {dirty && r && (
                <div className="notice">
                  <RefreshCw size={15} />
                  Inputs changed. Run exit check to update the displayed report.
                </div>
              )}
              {expired && r && !dirty && (
                <div className="notice">
                  <Clock3 size={15} />
                  This observation has expired. Refresh before using the
                  estimate.
                </div>
              )}
              {r && s && (
                <div
                  className={busy ? 'results loading' : 'results'}
                  aria-busy={busy}
                >
                  <div className="metric-grid">
                    <section className="metric">
                      <div className="metric-label">
                        Spot value of modeled inventory{' '}
                        <span title="Reserve-ratio value before fees, impact and execution policy. Excluded assets are not valued.">
                          ⓘ
                        </span>
                      </div>
                      <div className="metric-value">
                        {display(r.spotValue, decimals)}
                        <small>{symbol}</small>
                      </div>
                      <p>Balance value ≠ payout capacity</p>
                    </section>
                    <section className="metric proceeds">
                      <div className="metric-label">
                        Estimated minimum proceeds <ArrowUpRight size={15} />
                      </div>
                      <div className="metric-value">
                        {display(r.minimumProceeds, decimals)}
                        <small>{symbol}</small>
                      </div>
                      <p>
                        After impact limits + {pct(report!.options.slippageBps)}{' '}
                        buffer
                      </p>
                    </section>
                    <section className="metric">
                      <div className="metric-label">
                        Payout obligation <Wallet size={15} />
                      </div>
                      <div className="metric-value">
                        {display(r.obligation, decimals)}
                        <small>{symbol}</small>
                      </div>
                      <p>What your treasury needs to cover</p>
                    </section>
                  </div>
                  <section
                    className={`coverage-panel ${r.status === 'covered' ? 'covered' : ''}`}
                  >
                    <div className="coverage-icon">
                      {r.status === 'covered' ? (
                        <CheckCircle2 size={26} />
                      ) : (
                        <TriangleAlert size={26} />
                      )}
                    </div>
                    <div className="coverage-copy">
                      <h2>
                        {r.status === 'covered'
                          ? 'Covered within the modeled routes'
                          : 'Your modeled proceeds leave a payout gap'}
                      </h2>
                      <p>
                        {r.status === 'covered'
                          ? `${display(r.surplus, decimals)} ${symbol} estimated surplus, conditional on the stated assumptions.`
                          : `${display(r.shortfall, decimals)} ${symbol} shortfall. ${r.excludedCount ? 'Excluded assets may have additional value outside this model.' : 'Your execution policy limits how much can be sold.'}`}
                      </p>
                    </div>
                    <div className="coverage-stat">
                      <strong>{pct(r.coverageBps)}</strong>
                      <small>obligation coverage</small>
                      <div className="progress-track">
                        <div
                          style={{
                            width: Math.min(r.coverageBps / 100, 100) + '%',
                          }}
                        />
                      </div>
                    </div>
                  </section>
                  <div className="analysis-grid">
                    <section className="panel chart-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>When liquidity disappears</h2>
                          <p>The same inventory. Less depth to sell into.</p>
                        </div>
                        <span className="badge neutral">V1 reserve stress</span>
                      </div>
                      <div className="chart-legend">
                        <span>
                          <i className="green-dot" />
                          Minimum proceeds
                        </span>
                        <span>
                          <i className="line-dot" />
                          Obligation
                        </span>
                      </div>
                      <svg
                        className="chart"
                        viewBox="0 0 600 215"
                        role="img"
                        aria-label="Minimum payout proceeds under 100, 75, 50 and 25 percent remaining liquidity"
                      >
                        {ticks.map((t) => {
                          const y = 165 - t * 33;
                          return (
                            <g key={t}>
                              <line
                                x1="60"
                                x2="577"
                                y1={y}
                                y2={y}
                                stroke="#e9ece7"
                                strokeDasharray="3 4"
                              />
                              <text
                                x="48"
                                y={y + 4}
                                textAnchor="end"
                                fill="#939990"
                                fontSize="10"
                              >
                                {new Intl.NumberFormat('en-US', {
                                  notation: 'compact',
                                  maximumFractionDigits: 1,
                                }).format((maxChart * t) / 4)}
                              </text>
                            </g>
                          );
                        })}
                        <line
                          x1="60"
                          x2="577"
                          y1={
                            165 -
                            (Number(units(r.obligation, decimals)) / maxChart) *
                              132
                          }
                          y2={
                            165 -
                            (Number(units(r.obligation, decimals)) / maxChart) *
                              132
                          }
                          stroke="#acb4a5"
                          strokeDasharray="6 4"
                        />
                        {chart.map((p, i) => {
                          const h =
                              (Number(
                                units(p.result.minimumProceeds, decimals),
                              ) /
                                maxChart) *
                              132,
                            x = 92 + i * 125;
                          return (
                            <g key={i}>
                              <rect
                                x={x}
                                y={165 - h}
                                width="52"
                                height={h}
                                fill={i === 0 ? '#254d3b' : '#9ec4ae'}
                                rx="5"
                              />
                              <text
                                x={x + 26}
                                y={155 - h}
                                textAnchor="middle"
                                fill="#3c5346"
                                fontSize="11"
                                fontWeight="600"
                              >
                                {display(p.result.minimumProceeds, decimals, 0)}
                              </text>
                              <text
                                x={x + 26}
                                y="190"
                                textAnchor="middle"
                                fill="#747e74"
                                fontSize="11"
                              >
                                {pct(p.liquidityBps)} depth
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      <div className="chart-footnote">
                        Both reserves shrink proportionally. Spot price stays
                        constant.
                      </div>
                    </section>
                    <section className="panel stress-panel">
                      <div className="panel-heading">
                        <h2>
                          <SlidersHorizontal size={17} />
                          Stress your payout
                        </h2>
                      </div>
                      <p className="stress-description">
                        Change the conditions before they change on you.
                      </p>
                      <label className="range-label">
                        Remaining liquidity
                        <strong>{pct(form.liquidityBps)}</strong>
                        <input
                          aria-label="Remaining liquidity"
                          type="range"
                          min="1000"
                          max="10000"
                          step="500"
                          value={form.liquidityBps}
                          onChange={(e) =>
                            update('liquidityBps', Number(e.target.value))
                          }
                        />
                        <div>
                          <small>10% depth</small>
                          <small>Full depth</small>
                        </div>
                      </label>
                      <label className="range-label">
                        Obligation multiplier
                        <strong>
                          {(form.obligationMultiplierBps / 10000).toFixed(1)}×
                        </strong>
                        <input
                          aria-label="Obligation multiplier"
                          type="range"
                          min="10000"
                          max="40000"
                          step="5000"
                          value={form.obligationMultiplierBps}
                          onChange={(e) =>
                            update(
                              'obligationMultiplierBps',
                              Number(e.target.value),
                            )
                          }
                        />
                        <div>
                          <small>1× obligation</small>
                          <small>4× obligation</small>
                        </div>
                      </label>
                      <button
                        className="button secondary full"
                        disabled={busy}
                        onClick={() => void analyze(form)}
                      >
                        Apply scenario <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                  <section className="panel holdings-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Every asset has an exit story</h2>
                        <p>
                          Direct routes to {symbol}, with your execution policy
                          applied.
                        </p>
                      </div>
                      <span className="asset-count">
                        {r.rows.length} asset groups
                      </span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Asset</th>
                            <th>Available balance</th>
                            <th>Spot value</th>
                            <th>Minimum proceeds</th>
                            <th>Price impact</th>
                            <th>Route status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.rows.map((row, i) => (
                            <tr key={row.tokenId + '-' + i}>
                              <td>
                                <div className="asset">
                                  <span
                                    className={`coin ${row.symbol.includes('HBAR') ? 'hbar' : row.symbol === 'USDC' ? 'usdc' : row.state === 'excluded' ? 'locked' : 'sauce'}`}
                                  >
                                    {row.symbol.includes('HBAR')
                                      ? 'ℏ'
                                      : row.symbol === 'USDC'
                                        ? '$'
                                        : row.symbol.slice(0, 1)}
                                  </span>
                                  <div>
                                    <strong>{row.symbol}</strong>
                                    <small>{row.tokenId}</small>
                                  </div>
                                </div>
                              </td>
                              <td>{display(row.balance, row.decimals, 4)}</td>
                              <td>
                                {row.state === 'excluded' ? (
                                  <span className="muted">Not valued</span>
                                ) : (
                                  display(row.spotValue, decimals)
                                )}
                              </td>
                              <td
                                className={
                                  row.state === 'excluded'
                                    ? 'muted'
                                    : 'amount-cell'
                                }
                              >
                                {display(row.minimumOutput, decimals)}
                                <small> {symbol}</small>
                              </td>
                              <td>
                                {row.state === 'cash' ||
                                row.state === 'excluded'
                                  ? '—'
                                  : pct(row.impactBps)}
                              </td>
                              <td>
                                <span
                                  title={row.reason}
                                  className={`badge ${row.state === 'cash' ? 'green' : row.state === 'quoted' ? 'green' : row.state === 'limited' ? 'amber' : 'neutral'}`}
                                >
                                  {row.state === 'cash'
                                    ? 'Payout asset'
                                    : row.state === 'quoted'
                                      ? 'Direct V1'
                                      : row.state === 'limited'
                                        ? 'Impact limited'
                                        : 'Excluded'}
                                </span>
                                {row.reason && (
                                  <small className="row-reason">
                                    {row.reason}
                                  </small>
                                )}
                                {row.poolAddress && s.mode === 'live' && (
                                  <a
                                    className="pool-link"
                                    target="_blank"
                                    rel="noreferrer"
                                    href={`https://hashscan.io/${s.network}/contract/${row.poolAddress}`}
                                  >
                                    View pool <ArrowUpRight size={10} />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="table-footer">
                      <ShieldCheck size={14} />
                      Excluded assets contribute zero proceeds. Unsold inventory
                      is retained in the exported report.
                    </div>
                  </section>
                  <div className="bottom-grid">
                    <section className="panel ladder-panel">
                      <div className="panel-heading">
                        <h2>Inventory liquidation ladder</h2>
                        <span className="badge neutral">Same snapshot</span>
                      </div>
                      <div className="ladder-items">
                        {result!.ladder.map((item) => (
                          <div key={item.liquidationBps}>
                            <small>{pct(item.liquidationBps)} inventory</small>
                            <strong>
                              {display(item.result.minimumProceeds, decimals)}{' '}
                              <span>{symbol}</span>
                            </strong>
                            <span
                              className={
                                item.result.status === 'covered'
                                  ? 'positive'
                                  : 'muted'
                              }
                            >
                              {pct(item.result.coverageBps)} coverage
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="panel commitment-panel">
                      <div className="panel-heading">
                        <h2>
                          <FileCheck2 size={16} />A report you can verify
                        </h2>
                      </div>
                      <p>
                        Export the snapshot, assumptions and calculations
                        together. Publish its digest to Hedera testnet using the
                        included CLI.
                      </p>
                      <button
                        className="digest"
                        title="Copy report digest"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              result!.envelope.digest,
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          } catch {
                            setError(
                              'Copy unavailable. Export the report to obtain its digest.',
                            );
                          }
                        }}
                      >
                        {result!.envelope.digest.slice(0, 22)}…
                        {copied ? <Check size={14} /> : <Layers3 size={14} />}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setVerifyText(
                            JSON.stringify(result!.envelope, null, 2),
                          );
                          setTab('Verify report');
                        }}
                      >
                        Verify this report <ArrowRight size={14} />
                      </button>
                    </section>
                  </div>
                  <details className="assumptions">
                    <summary>
                      <TriangleAlert size={14} />
                      Observation notes & limitations{' '}
                      <span>{s.warnings.length} notes</span>
                    </summary>
                    <ul>
                      {s.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                    {s.sources.length > 0 && (
                      <div className="source-links">
                        {s.sources.map((url, i) => (
                          <a
                            key={url}
                            target="_blank"
                            rel="noreferrer"
                            href={url}
                          >
                            Source {i + 1} <ArrowUpRight size={11} />
                          </a>
                        ))}
                      </div>
                    )}
                  </details>
                  <footer className="report-footer">
                    <span>
                      <Clock3 size={13} />
                      {s.mode === 'demo'
                        ? 'Synthetic demonstration'
                        : `Observed ${new Date(s.observedAt).toLocaleTimeString()}`}{' '}
                      · {expired ? 'Expired' : '2-minute validity window'}
                    </span>
                    <span>
                      Direct SaucerSwap V1 · HTS checks · HCS evidence
                    </span>
                  </footer>
                </div>
              )}
              {!r && busy && (
                <div className="empty-state">
                  <Loader2 className="spin" size={25} />
                  <h2>Checking treasury coverage</h2>
                  <p>
                    Inspecting balances, token conditions and direct liquidity.
                  </p>
                </div>
              )}
            </>
          )}
          {tab === 'Verify report' && (
            <div className="verify-layout">
              <section className="panel verify-panel">
                <h2>
                  <FileCheck2 size={20} />
                  Verify an exported report
                </h2>
                <p>
                  Choose an ExitCheck JSON file or paste its contents. The
                  verifier recalculates the results and compares the SHA-256
                  digest.
                </p>
                <label className="upload-area">
                  <ArrowDownToLine size={24} />
                  <strong>Choose a report JSON file</strong>
                  <span>Maximum 250 KB · Kept in this local app</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    aria-label="Import report"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 250000) {
                        setVerification({
                          valid: false,
                          fresh: false,
                          reason: 'File exceeds 250 KB.',
                        });
                        return;
                      }
                      setVerifyText(await file.text());
                      setVerification(undefined);
                    }}
                  />
                </label>
                <label className="textarea-label">
                  Report envelope
                  <textarea
                    value={verifyText}
                    onChange={(e) => {
                      setVerifyText(e.target.value);
                      setVerification(undefined);
                    }}
                    placeholder='{"report": {...}, "digest": "..."}'
                    spellCheck={false}
                  />
                </label>
                <details className="hcs-fields">
                  <summary>
                    <ShieldCheck size={14} />
                    Also verify a Hedera testnet commitment
                  </summary>
                  <div className="proof-grid">
                    <label>
                      HCS topic ID
                      <input
                        aria-label="HCS topic ID"
                        placeholder="0.0.10835164"
                        value={topic}
                        onChange={(e) => {
                          setTopic(e.target.value);
                          setVerification(undefined);
                        }}
                      />
                    </label>
                    <label>
                      Sequence number
                      <input
                        aria-label="Sequence number"
                        placeholder="2"
                        value={sequence}
                        onChange={(e) => {
                          setSequence(e.target.value);
                          setVerification(undefined);
                        }}
                      />
                    </label>
                    <label>
                      Expected payer (optional)
                      <input
                        aria-label="Expected payer"
                        placeholder="0.0.8348691"
                        value={payer}
                        onChange={(e) => {
                          setPayer(e.target.value);
                          setVerification(undefined);
                        }}
                      />
                    </label>
                  </div>
                </details>
                <button
                  className="button primary"
                  disabled={!verifyText || verifying}
                  onClick={() => void verify()}
                >
                  {verifying ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  Verify integrity
                </button>
                {verification && (
                  <div
                    role="status"
                    className={`verification-result ${verification.valid ? 'valid' : 'invalid'}`}
                  >
                    {verification.valid ? (
                      <CheckCircle2 size={23} />
                    ) : (
                      <X size={23} />
                    )}
                    <div>
                      <strong>
                        {verification.valid
                          ? 'Report integrity verified'
                          : 'Verification failed'}
                      </strong>
                      <p>{verification.reason}</p>
                      {verification.digest && (
                        <code>{verification.digest}</code>
                      )}
                      {verification.hcs && (
                        <a
                          className="proof-link"
                          href={verification.hcs.mirrorUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View HCS message · payer{' '}
                          {verification.hcs.payerAccountId}{' '}
                          <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </section>
              <section className="panel verify-explainer">
                <h2>Three different questions</h2>
                <ol>
                  <li>
                    <strong>Was the file changed?</strong>
                    <p>Its canonical JSON must match the digest.</p>
                  </li>
                  <li>
                    <strong>Does the math reproduce?</strong>
                    <p>
                      The verifier rebuilds all results from the snapshot and
                      policy.
                    </p>
                  </li>
                  <li>
                    <strong>Was it published on Hedera?</strong>
                    <p>
                      Expand the HCS check here, or use the CLI with a topic ID
                      and sequence number, to compare the actual Mirror Node
                      message.
                    </p>
                  </li>
                </ol>
                <div className="notice">
                  Integrity establishes consistency. It does not establish
                  truthful inputs, ownership or guaranteed execution.
                </div>
                <a
                  href="https://docs.hedera.com/hedera/core-concepts/hedera-consensus-service"
                  target="_blank"
                  rel="noreferrer"
                >
                  About Hedera Consensus Service <ArrowUpRight size={14} />
                </a>
              </section>
            </div>
          )}
          {tab === 'Methodology' && (
            <div className="method-layout">
              <section className="panel method-card">
                <span className="step-number">01</span>
                <h2>Observe the treasury</h2>
                <p>
                  Read HBAR balances, HTS relationships, token decimals, pause
                  state, freeze state, KYC and custom fees from Hedera Mirror
                  Node. Preserve raw integer amounts without floating-point
                  rounding.
                </p>
                <p>
                  Keep the configured HBAR reserve for fees. Combine HBAR and
                  WHBAR so a shared pool is used once.
                </p>
              </section>
              <section className="panel method-card">
                <span className="step-number">02</span>
                <h2>Validate direct liquidity</h2>
                <p>
                  Discover direct SaucerSwap V1 pools through the factory. Read
                  both tokens and reserves at one RPC block, then cross-check
                  the reserve formula against the router’s real quote.
                </p>
                <p>
                  V2 and multi-hop routes are excluded. Missing or unverified
                  liquidity never becomes a guessed price.
                </p>
              </section>
              <section className="panel method-card">
                <span className="step-number">03</span>
                <h2>Apply the payout policy</h2>
                <p>
                  Find the maximum sellable inventory under the chosen impact
                  cap. Deduct a slippage buffer from expected output. Existing
                  payout assets do not incur swap fees or slippage.
                </p>
                <code>
                  out = in × 9970 × reserveOut
                  <br />÷ (reserveIn × 10000 + in × 9970)
                </code>
                <p>
                  “Covered” means the modeled routes cover the obligation under
                  these assumptions. It is a conditional estimate.
                </p>
              </section>
              <section className="panel method-card">
                <span className="step-number">04</span>
                <h2>Make the result reproducible</h2>
                <p>
                  Export the snapshot, policy and result in a versioned report.
                  Sort object keys recursively, preserve array order and hash
                  the canonical UTF-8 JSON with SHA-256.
                </p>
                <p>
                  Publish a small commitment through HCS. Verify its digest,
                  account, observation window, source network and schema against
                  the exported file.
                </p>
              </section>
              <section className="panel method-limitations">
                <h2>Boundaries that matter</h2>
                <ul>
                  <li>
                    Pool reads share an RPC block. Mirror balances and token
                    flags are separate observations.
                  </li>
                  <li>
                    Liquidity stress models proportional withdrawal of both V1
                    reserves. It does not predict market behavior.
                  </li>
                  <li>
                    No swaps, approvals or treasury transactions are sent by the
                    dashboard.
                  </li>
                  <li>
                    Gas, wrapping costs, locked balances, other debts and
                    account control are not priced or proved.
                  </li>
                  <li>
                    Live analysis inspects at most 12 nonzero HTS balances and
                    marks truncated observations.
                  </li>
                  <li>
                    HCS records that a commitment was submitted. It does not
                    certify the report’s inputs.
                  </li>
                </ul>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
