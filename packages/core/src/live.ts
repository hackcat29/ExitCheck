import { Contract, FetchRequest, JsonRpcProvider, ZeroAddress } from 'ethers';
import JSONbigFactory from 'json-bigint';
import { parseUnits, validatePoolQuote } from './index';
import {
  requestSchema,
  type AnalysisRequest,
  type Holding,
  type Pool,
  type Snapshot,
} from './schema';
const JSONbig = JSONbigFactory({ storeAsString: true, alwaysParseAsBig: true });
export const networks = {
  mainnet: {
    mirror: 'https://mainnet-public.mirrornode.hedera.com',
    rpc: 'https://mainnet.hashio.io/api',
    factory: '0.0.1062784',
    router: '0.0.3045981',
    whbar: '0.0.1456986',
    chainId: 295,
  },
  testnet: {
    mirror: 'https://testnet.mirrornode.hedera.com',
    rpc: 'https://testnet.hashio.io/api',
    factory: '0.0.9959',
    router: '0.0.19264',
    whbar: '0.0.15058',
    chainId: 296,
  },
} as const;
export function solidityAddress(id: string): string {
  if (!/^0\.0\.(0|[1-9]\d{0,18})$/.test(id))
    throw new Error('Invalid supported Hedera ID');
  const n = BigInt(id.split('.')[2]);
  if (n >= 2n ** 64n) throw new Error('ID exceeds uint64');
  return '0x' + n.toString(16).padStart(40, '0');
}
type Metadata = {
  token_id: string;
  symbol: string;
  decimals: string;
  type: string;
  deleted: boolean;
  pause_status: string;
  custom_fees?: {
    fixed_fees?: unknown[];
    fractional_fees?: unknown[];
    royalty_fees?: unknown[];
  };
};
type Relationship = {
  token_id: string;
  balance: string;
  freeze_status: string;
  kyc_status: string;
};
export function tokenExclusion(
  meta: Metadata,
  relation?: Relationship,
): string | undefined {
  if (meta.deleted) return 'Token deleted';
  if (meta.type !== 'FUNGIBLE_COMMON')
    return 'Non-fungible tokens are not liquid fungible inventory';
  const decimals = Number(meta.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18)
    return 'Unsupported decimals';
  if (!['UNPAUSED', 'NOT_APPLICABLE'].includes(meta.pause_status))
    return 'Token paused or pause status unavailable';
  const fees = meta.custom_fees;
  if (!fees) return 'Custom fee configuration unavailable';
  if (
    [fees.fixed_fees, fees.fractional_fees, fees.royalty_fees].some(
      (f) => f?.length,
    )
  )
    return 'Custom fees are not modeled; excluded from payout proceeds';
  if (relation) {
    if (!['UNFROZEN', 'NOT_APPLICABLE'].includes(relation.freeze_status))
      return 'Account frozen or freeze status unavailable';
    if (!['GRANTED', 'NOT_APPLICABLE'].includes(relation.kyc_status))
      return 'Account lacks KYC or KYC status unavailable';
  }
  return undefined;
}
export type Fetcher = typeof fetch;
export async function mirrorJson<T>(
  url: string,
  fetcher: Fetcher = fetch,
): Promise<T> {
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(`Mirror Node request failed (${response.status})`);
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error('Mirror response too large');
  return JSONbig.parse(text) as T;
}
export async function readRelationships(
  base: string,
  accountId: string,
  fetcher: Fetcher = fetch,
): Promise<{ items: Relationship[]; truncated: boolean }> {
  let next: string | undefined =
      `${base}/api/v1/accounts/${accountId}/tokens?limit=100`,
    pages = 0;
  const items: Relationship[] = [];
  const seen = new Set<string>();
  while (next && pages < 5) {
    if (seen.has(next)) throw new Error('Mirror pagination loop');
    seen.add(next);
    const data: { tokens: Relationship[]; links: { next: string | null } } =
      await mirrorJson<{
        tokens: Relationship[];
        links: { next: string | null };
      }>(next, fetcher);
    items.push(...data.tokens);
    pages++;
    if (data.links.next) {
      const resolved: URL = new URL(data.links.next, base);
      if (
        resolved.origin !== base ||
        !resolved.pathname.startsWith('/api/v1/accounts/')
      )
        throw new Error('Unexpected pagination origin');
      next = resolved.href;
    } else next = undefined;
  }
  return { items, truncated: !!next };
}
export async function liveSnapshot(raw: AnalysisRequest): Promise<Snapshot> {
  const req = requestSchema.parse(raw),
    config = networks[req.network];
  const observedAt = new Date(),
    warnings: string[] = [],
    sources: string[] = [];
  const accountUrl = `${config.mirror}/api/v1/accounts/${req.accountId}`;
  const [account, relationships, payoutMeta, whbarMeta] = await Promise.all([
    mirrorJson<{
      deleted: boolean;
      balance: { balance: string; timestamp: string };
    }>(accountUrl),
    readRelationships(config.mirror, req.accountId),
    mirrorJson<Metadata>(`${config.mirror}/api/v1/tokens/${req.payoutTokenId}`),
    mirrorJson<Metadata>(`${config.mirror}/api/v1/tokens/${config.whbar}`),
  ]);
  if (account.deleted) throw new Error('Treasury account is deleted');
  const payoutRelation = relationships.items.find(
    (r) => r.token_id === req.payoutTokenId,
  );
  const payoutError = tokenExclusion(payoutMeta, payoutRelation);
  if (payoutError)
    throw new Error(`Payout asset is unsupported: ${payoutError}`);
  if (!payoutRelation)
    warnings.push(
      'Payout token is not associated with this account. Association is required before receiving converted funds.',
    );
  if (relationships.truncated)
    warnings.push(
      'INCOMPLETE: Token association pagination exceeded 500 records.',
    );
  const positive = relationships.items.filter((r) => BigInt(r.balance) > 0n),
    selected = positive.slice(0, 12);
  if (positive.length > 12)
    warnings.push(
      `INCOMPLETE: Only the first 12 nonzero token balances were inspected; ${positive.length - 12} additional balances were excluded.`,
    );
  const hbarReserved = parseUnits(req.hbarReserve, 8).toString();
  const whbarError = tokenExclusion(whbarMeta);
  const holdings: Holding[] = [
    {
      id: 'HBAR',
      kind: 'native',
      token: { id: config.whbar, symbol: 'HBAR', decimals: 8 },
      balance: String(account.balance.balance),
      eligible: !whbarError,
      ...(whbarError ? { exclusion: whbarError } : {}),
    },
  ];
  await Promise.all(
    selected.map(async (relation) => {
      try {
        const meta =
          relation.token_id === req.payoutTokenId
            ? payoutMeta
            : relation.token_id === config.whbar
              ? whbarMeta
              : await mirrorJson<Metadata>(
                  `${config.mirror}/api/v1/tokens/${relation.token_id}`,
                );
        const exclusion = tokenExclusion(meta, relation);
        const decimals = Number(meta.decimals);
        holdings.push({
          id: relation.token_id,
          kind: 'hts',
          token: {
            id: relation.token_id,
            symbol: meta.symbol.slice(0, 100),
            decimals:
              Number.isInteger(decimals) && decimals <= 18 && decimals >= 0
                ? decimals
                : 0,
          },
          balance: String(relation.balance),
          eligible: !exclusion,
          ...(exclusion ? { exclusion } : {}),
        });
      } catch {
        holdings.push({
          id: relation.token_id,
          kind: 'hts',
          token: {
            id: relation.token_id,
            symbol: relation.token_id,
            decimals: 0,
          },
          balance: String(relation.balance),
          eligible: false,
          exclusion: 'Token metadata could not be verified',
        });
      }
    }),
  );
  holdings.sort((a, b) => a.id.localeCompare(b.id));
  const rpcUrl =
    req.network === 'mainnet'
      ? (process.env.HEDERA_MAINNET_RPC_URL ?? config.rpc)
      : (process.env.HEDERA_TESTNET_RPC_URL ?? config.rpc);
  const fetchRequest = new FetchRequest(rpcUrl);
  fetchRequest.timeout = 12000;
  const provider = new JsonRpcProvider(fetchRequest, config.chainId, {
    batchMaxCount: 1,
  });
  try {
    const block = await provider.getBlock('latest');
    if (!block || !block.hash) throw new Error('RPC block unavailable');
    const factory = new Contract(
      solidityAddress(config.factory),
      ['function getPair(address,address) view returns (address)'],
      provider,
    );
    const router = new Contract(
      solidityAddress(config.router),
      ['function getAmountsOut(uint256,address[]) view returns (uint256[])'],
      provider,
    );
    const grouped = new Map<string, bigint>();
    for (const h of holdings) {
      if (!h.eligible) continue;
      let n = BigInt(h.balance);
      if (h.kind === 'native')
        n = n > BigInt(hbarReserved) ? n - BigInt(hbarReserved) : 0n;
      grouped.set(h.token.id, (grouped.get(h.token.id) ?? 0n) + n);
    }
    const pools: Pool[] = [];
    // Sequential calls avoid hammering the public Hedera relay. All EVM reads use one block.
    for (const [id, amount] of grouped) {
      if (id === req.payoutTokenId || !amount) continue;
      try {
        const address = String(
          await factory.getPair(
            solidityAddress(id),
            solidityAddress(req.payoutTokenId),
            { blockTag: block.number },
          ),
        );
        if (address === ZeroAddress) {
          warnings.push(
            `No direct V1 pool for ${id}; this holding is excluded. V2 and multi-hop routes are outside this template's scope.`,
          );
          continue;
        }
        const pair = new Contract(
          address,
          [
            'function token0() view returns (address)',
            'function token1() view returns (address)',
            'function getReserves() view returns (uint112,uint112,uint32)',
          ],
          provider,
        );
        const [token0, token1, reserves, quote] = await Promise.all([
          pair.token0({ blockTag: block.number }),
          pair.token1({ blockTag: block.number }),
          pair.getReserves({ blockTag: block.number }),
          router.getAmountsOut(
            amount,
            [solidityAddress(id), solidityAddress(req.payoutTokenId)],
            { blockTag: block.number },
          ),
        ]);
        const inputIs0 =
          String(token0).toLowerCase() === solidityAddress(id).toLowerCase();
        const outputAddress = inputIs0 ? String(token1) : String(token0);
        if (
          outputAddress.toLowerCase() !==
            solidityAddress(req.payoutTokenId).toLowerCase() ||
          (inputIs0 ? String(token0) : String(token1)).toLowerCase() !==
            solidityAddress(id).toLowerCase()
        )
          throw new Error('Pool token mismatch');
        const pool: Pool = {
          address,
          tokenIn: id,
          reserveIn: reserves[inputIs0 ? 0 : 1].toString(),
          reserveOut: reserves[inputIs0 ? 1 : 0].toString(),
          feeBps: 30,
          quotedInput: amount.toString(),
          routerQuote: quote[1].toString(),
        };
        if (
          !validatePoolQuote(pool) ||
          BigInt(pool.reserveIn) === 0n ||
          BigInt(pool.reserveOut) === 0n
        )
          throw new Error('Router quote does not match reserve calculation');
        pools.push(pool);
      } catch {
        warnings.push(
          `INCOMPLETE: Quote for ${id} could not be validated at block ${block.number}; excluded rather than estimated from a cached price.`,
        );
      }
    }
    sources.push(
      accountUrl,
      `${config.mirror}/api/v1/accounts/${req.accountId}/tokens`,
      `${config.mirror}/api/v1/tokens/${req.payoutTokenId}`,
      `https://hashscan.io/${req.network}/contract/${config.router}`,
      `https://hashscan.io/${req.network}/contract/${config.factory}`,
    );
    warnings.push(
      'Balances and token flags are Mirror Node observations; pool reads share one RPC block. These sources are not an atomic portfolio snapshot.',
      'Coverage is conditional on account control, approvals, token association and execution. Gas, wrap costs, locked funds and other debts are not deducted.',
      'Liquidity stress scales both V1 reserves equally. It is a modeled LP withdrawal, not a forecast or a V2 liquidity simulation.',
    );
    const now = Date.now();
    if (now - observedAt.getTime() > 120000)
      throw new Error(
        'Observation took too long; retry to obtain a fresh snapshot',
      );
    return {
      mode: 'live',
      network: req.network,
      accountId: req.accountId,
      observedAt: observedAt.toISOString(),
      expiresAt: new Date(observedAt.getTime() + 120000).toISOString(),
      blockNumber: block.number,
      blockHash: block.hash,
      balanceTimestamp: account.balance.timestamp,
      payout: {
        id: req.payoutTokenId,
        symbol: payoutMeta.symbol.slice(0, 100),
        decimals: Number(payoutMeta.decimals),
      },
      whbarTokenId: config.whbar,
      hbarReserved,
      holdings,
      pools: pools.sort((a, b) => a.tokenIn.localeCompare(b.tokenIn)),
      warnings,
      sources,
    };
  } finally {
    provider.destroy();
  }
}
