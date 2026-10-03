# Optional ReportAnchor registry

The original Solidity registry lets EVM consumers query issuer-specific report freshness. Compile and test from the root with `npm run contracts:test`. Hardhat uses local solc 0.8.28 and the Paris EVM target. `npm run hardhat:deploy` deploys only to Hedera testnet and requires `HEDERA_EVM_PRIVATE_KEY` in the shell.

Call `publish(bytes32 digest, uint64 observedAt, uint64 expiresAt)` using the exported SHA-256 report digest and Unix-second times. Read `observations(issuer,digest)` or `isFresh(issuer,digest)`. The issuer is `msg.sender`; another publisher cannot occupy the issuer's namespace. Duplicate issuer/digest records are rejected. Publication is a self-attestation, not validation of the report's inputs. HCS remains the primary ExitCheck evidence path.
