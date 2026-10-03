# ExitCheck agent instructions

## Workspaces and commands

Use npm from the repository root. Next.js lives in `packages/nextjs`, calculations and the live adapter in `packages/core`, and the optional Solidity registry in `packages/hardhat`.

`npm run check` runs lint, strict types, core tests, contract tests and the production build. `npm run smoke` tests running HTTP routes. `npm run template:check` checks the source manifest and project structure. Do not mark live HCS validation complete without a real successful receipt and a matching Mirror Node message.

## Invariants

- Monetary values are decimal strings at boundaries and BigInt during computation. Never calculate financial results with Number or `parseFloat`.
- Unsupported or unavailable routes contribute no assumed proceeds. Preserve explanations and incomplete-state warnings. Never replace a failed live observation with demo data.
- Quotes, pool token order and reserves are checked against the router at one RPC block. Do not silently downgrade to `latest` for one call if pinned-block calls fail.
- Group native HBAR and eligible WHBAR before quoting; preserve an HBAR fee reserve. Reject duplicate pool use and duplicate holdings.
- Keep direct V1-only scope explicit unless implementing and testing a separate V2 or multi-hop adapter with shared-pool state accounting.
- Round proceeds down, multiplied obligations up. Impact excludes the swap fee. Stress scales both V1 reserves proportionally.
- Reports include raw inputs, options and results. The digest covers canonical UTF-8 JSON of the report. Strict schemas must reject unknown committed fields.
- Integrity, freshness and truthfulness are different. Never call a hash verifier an ownership proof or independent certification of financial inputs.
- Browser and API routes remain read-only. Signing belongs in a local CLI. Never add an unauthenticated funded publishing endpoint.

## Secrets and evidence

`.env`, `reports/` and `evidence/` are ignored. Never read or print signing keys while debugging. Local scripts may consume keys for the user's authorized testnet actions. Log only public IDs, transaction hashes, receipts and digests. Error messages must not dump SDK config, provider headers or key material.

The submit-key-protected HCS topic is the primary native-service demonstration. The optional EVM registry is an issuer self-attestation feature, not a proof of data truth. If no funded signer is configured, preserve the working flow and record testnet evidence as pending.

## Extension points

Add new market adapters in `packages/core/src/` with explicit supported networks and provenance. Test upstream error handling, fee assumptions, decimals and shared liquidity before enabling an adapter. Live association records must be paginated and JSON integer values preserved without precision loss. Keep network URL inputs server-configured, not user-controlled request values.

Update README methodology, schema version, verifier and tests together when report meaning changes. Keep internal fixtures runnable without secrets or data providers. The web app reads real accounts only; public reads require no signing key.
