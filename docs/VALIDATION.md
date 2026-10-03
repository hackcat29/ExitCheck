# Validation record

Validated on October 3, 2026.

- Public repository: https://github.com/UncleTom29/ExitCheck
- Successful CI: https://github.com/UncleTom29/ExitCheck/actions/runs/37088966019
- 30 core tests, 4 contract tests and 2 browser tests passed.
- Formatting, manifest validation, lint, type checks and production build passed.
- HTTP smoke checks cover the app, health, analysis, report verification and tampering rejection.
- Desktop and mobile browser checks cover the treasury scenario and report verification.
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
