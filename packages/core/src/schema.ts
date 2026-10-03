import { z } from 'zod';
export const idSchema = z
  .string()
  .regex(/^0\.0\.(0|[1-9]\d{0,18})$/, 'Use a Hedera ID such as 0.0.12345');
export const uint = z.string().regex(/^(0|[1-9]\d{0,77})$/);
export const optionsSchema = z.object({
  obligation: z
    .string()
    .regex(
      /^(0|[1-9]\d{0,29})(\.\d{1,18})?$/,
      'Enter a positive decimal amount',
    ),
  slippageBps: z.number().int().min(0).max(3000).default(100),
  maxImpactBps: z.number().int().min(100).max(9000).default(1500),
  liquidityBps: z.number().int().min(1000).max(10000).default(10000),
  obligationMultiplierBps: z
    .number()
    .int()
    .min(10000)
    .max(40000)
    .default(10000),
  liquidationBps: z.number().int().min(0).max(10000).default(10000),
});
export const requestSchema = optionsSchema.extend({
  mode: z.enum(['demo', 'live']).default('demo'),
  network: z.enum(['mainnet', 'testnet']).default('mainnet'),
  accountId: idSchema.default('0.0.1062644'),
  payoutTokenId: idSchema.default('0.0.456858'),
  hbarReserve: z
    .string()
    .regex(/^(0|[1-9]\d{0,10})(\.\d{1,8})?$/)
    .default('10'),
});
const token = z
  .object({
    id: idSchema,
    symbol: z.string().max(100),
    decimals: z.number().int().min(0).max(18),
  })
  .strict();
export const holdingSchema = z
  .object({
    id: z.string().max(100),
    token,
    balance: uint,
    kind: z.enum(['native', 'hts']),
    eligible: z.boolean(),
    exclusion: z.string().max(300).optional(),
  })
  .strict();
export const poolSchema = z
  .object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    tokenIn: idSchema,
    reserveIn: uint,
    reserveOut: uint,
    feeBps: z.literal(30),
    routerQuote: uint,
    quotedInput: uint,
  })
  .strict();
export const snapshotSchema = z
  .object({
    mode: z.enum(['demo', 'live']),
    network: z.enum(['mainnet', 'testnet']),
    accountId: idSchema,
    observedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    blockNumber: z.number().int().nonnegative(),
    blockHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    balanceTimestamp: z.string().max(100),
    payout: token,
    whbarTokenId: idSchema,
    hbarReserved: uint,
    holdings: z.array(holdingSchema).max(40),
    pools: z.array(poolSchema).max(40),
    warnings: z.array(z.string().max(500)).max(100),
    sources: z.array(z.string().url()).max(100),
  })
  .strict();
export type Options = z.infer<typeof optionsSchema>;
export type AnalysisRequest = z.infer<typeof requestSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Holding = z.infer<typeof holdingSchema>;
export type Pool = z.infer<typeof poolSchema>;
export const rowSchema = z
  .object({
    tokenId: idSchema,
    symbol: z.string(),
    decimals: z.number(),
    balance: uint,
    sellInput: uint,
    unsold: uint,
    spotValue: uint,
    expectedOutput: uint,
    minimumOutput: uint,
    impactBps: z.number().int(),
    poolAddress: z.string().optional(),
    state: z.enum(['cash', 'quoted', 'limited', 'excluded']),
    reason: z.string().optional(),
  })
  .strict();
export const reportSchema = z
  .object({
    schema: z.literal('exitcheck.report.v1'),
    snapshot: snapshotSchema,
    options: optionsSchema.strict(),
    result: z
      .object({
        obligation: uint,
        minimumProceeds: uint,
        spotValue: uint,
        shortfall: uint,
        surplus: uint,
        coverageBps: z.number().int(),
        status: z.enum(['covered', 'shortfall', 'incomplete']),
        excludedCount: z.number().int(),
        rows: z.array(rowSchema),
      })
      .strict(),
  })
  .strict();
export type Report = z.infer<typeof reportSchema>;
export const envelopeSchema = z
  .object({ report: reportSchema, digest: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export type Envelope = z.infer<typeof envelopeSchema>;
export const commitmentSchema = z
  .object({
    schema: z.literal('exitcheck.commitment.v1'),
    algorithm: z.literal('sha256'),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    reportSchema: z.literal('exitcheck.report.v1'),
    sourceNetwork: z.enum(['mainnet', 'testnet']),
    mode: z.enum(['demo', 'live']),
    observedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    blockNumber: z.number().int(),
    accountId: idSchema,
  })
  .strict();
