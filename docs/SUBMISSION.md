# Scaffold-HBAR submission checklist

- [x] Public MIT repository with credited author: `hackcat29/ExitCheck`.
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

1. Clone the public repository, install dependencies and run checks.
2. Generate a live testnet report from the CLI and verify it.
3. Open the local web app, check a 100 SAUCE payment against a real testnet account, then increase the payment and rerun.
4. Inspect each balance's contribution and its exclusion or conversion limit.
5. Export, verify and alter a report to demonstrate rejection.
6. Generate a fresh live testnet report for a public account and SAUCE payout.
7. Publish its commitment with the local CLI; keep the signer key off screen.
8. Open the actual transaction in HashScan and compare its HCS message with the report.

## Suggested description

ExitCheck is a reusable liquidity-aware Hedera treasury template. It checks whether supported inventory can cover a specified payout through validated direct SaucerSwap V1 routes, rather than equating token balances with usable liquidity. It combines HTS eligibility checks, integer execution-policy math, proportional reserve stress, raw observation provenance and HCS report commitments. The web app reads real accounts only; offline fixtures remain available for internal testing and CLI experimentation.

Harness was not used. Original code is MIT licensed. This is an analysis template; no treasury trades are executed.

Validation and public transaction evidence are recorded in [VALIDATION.md](VALIDATION.md) and [EVIDENCE.md](EVIDENCE.md). The developer-experience survey and final submission remain for the entrant.
