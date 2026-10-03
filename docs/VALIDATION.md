# Validation record

Validated on October 3, 2026.

- Public repository: https://github.com/UncleTom29/ExitCheck
- Successful CI: https://github.com/UncleTom29/ExitCheck/actions/runs/37123552302
- 30 core tests, 4 contract tests and 3 browser tests passed.
- Formatting, manifest validation, lint, type checks and production build passed.
- HTTP smoke checks cover the app, health, analysis, report verification and tampering rejection.
- Desktop and mobile browser checks cover payment changes, export blocking for changed inputs, report verification, liquidity assumptions and network-specific live input fields.
- Published Scaffold-HBAR CLI 0.4.1 generated a fresh project from the public repository. Fresh dependency installation, lint, type checks, 34 core/contract tests and production build passed.
- Native testnet HCS evidence was independently verified against Mirror Node; see [EVIDENCE.md](EVIDENCE.md). The historical observation is expired and is not a current execution quote.
- Local environment files and signing credentials are ignored and excluded from the Git archive.

## Reproduce the public scaffold

```sh
npm create scaffold-hbar@latest -- exitcheck --template UncleTom29/ExitCheck --package-manager npm --solidity-framework hardhat --frontend nextjs-app --skip-hedera-skills --skip-install --yes
cd exitcheck
npm ci
npm run check
npm run dev
```

The shipped integration supports validated direct SaucerSwap V1 routes. Synthetic demonstrations, live observations and historical commitments are explicitly distinguished. This template does not execute treasury trades.

## Developer workflow revision

Public revision `aeef3c5` was cloned into a fresh local directory. `npm ci` and `npm run check` passed there. The revised repository also initialized through Scaffold-HBAR with npm flag forwarding (`-- --template`). All three browser tests and HTTP smoke checks passed locally, and the public CI run linked above passed.

The developer demo records actual local commands and app interactions, followed by a fresh live testnet report, a successful HCS commitment, independent comparison with the actual Mirror Node message and HashScan inspection. Only the installation wait is shortened and labeled.
