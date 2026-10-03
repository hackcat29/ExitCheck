# Scaffold-HBAR submission checklist

- [x] Public MIT repository with credited author: `UncleTom29/ExitCheck`.
- [x] Scaffold command tested against the published public repository.
- [x] Fresh scaffold install, lint, typecheck, tests and build pass.
- [x] App boots; `/`, `/api/health`, `/api/analyze`, `/api/verify` pass smoke checks.
- [x] SaucerSwap live observation documented; exact network and block retained.
- [x] Real testnet transaction receipt and readable HashScan/Mirror Node evidence.
- [x] No `.env` or signing secrets committed.
- [x] README, AGENTS and template manifest present in source repo.
- [ ] Required developer-experience survey completed.
- [ ] Repository and testnet evidence URLs entered in the submission form.

## Judge walkthrough

1. Scaffold, install and boot. No credentials are needed for the synthetic demonstration.
2. Observe a spot-valued treasury whose supported minimum proceeds cannot cover a 5,000-unit payout.
3. Reduce the obligation to 1,000. The same inventory now covers it.
4. Inspect the price-impact cap, unsold inventory, custom-fee exclusion and retained HBAR reserve.
5. Reduce liquidity, apply the scenario and compare the inventory liquidation ladder.
6. Switch to a real Hedera account for on-chain pool/router and HTS observations.
7. Export the report, verify it, alter a result and demonstrate rejection.
8. Show the actual HCS topic message and compare its full commitment using the independent verifier.

## Suggested description

ExitCheck is a reusable liquidity-aware Hedera treasury template. It checks whether supported inventory can cover a specified payout through validated direct SaucerSwap V1 routes, rather than equating token balances with usable liquidity. It combines HTS eligibility checks, integer execution-policy math, proportional reserve stress, raw observation provenance and HCS report commitments. A synthetic demonstration works immediately; live observations and native testnet evidence are separate and explicitly labeled.

Harness was not used. Original code is MIT licensed. This is an analysis template; no treasury trades are executed.

Validation and public transaction evidence are recorded in [VALIDATION.md](VALIDATION.md) and [EVIDENCE.md](EVIDENCE.md). The developer-experience survey and final submission remain for the entrant.
