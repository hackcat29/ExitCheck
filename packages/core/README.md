# Calculation core

`src/index.ts` implements BigInt payout math and report integrity. `src/schema.ts` defines strict versioned data boundaries. `src/live.ts` obtains public HTS/Mirror observations and pinned-block direct SaucerSwap V1 quotes. `src/demo.ts` provides a synthetic fixture.

Run `npm test` from the root. Import `@exitcheck/core` on Node only (it uses SHA-256 from node:crypto). Browser code imports report types from `@exitcheck/core/schema` and calls the read-only Next.js endpoints. Do not import the signing SDK into this package or the web API.
