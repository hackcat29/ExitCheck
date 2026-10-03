# Verified testnet evidence

The live report in [published-report.json](evidence/published-report.json) contains a real HBAR-to-SAUCE direct V1 pool observation from Hedera testnet. Its reserve calculation matched the deployed SaucerSwap router quote at block **41285926**.

- Treasury / transaction payer: `0.0.8348691`
- HCS topic: `0.0.10835164` (submit-key protected)
- Message sequence: **2**
- Transaction: `0.0.8348691@1790993047.407401995`
- Receipt: **SUCCESS**
- SHA-256 digest: `61d80b40a78434dd5556d3e0d5221a09014e19aff72261ee5371774167e05754`
- [HashScan transaction](https://hashscan.io/testnet/transaction/0.0.8348691@1790993047.407401995)
- [Actual Mirror Node topic message](https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10835164/messages/2)
- [Public receipt](evidence/hcs-receipt.json)

Independently verify:

```sh
npm run verify -- --file docs/evidence/published-report.json --topic 0.0.10835164 --sequence 2 --payer 0.0.8348691
```

Or import the published report in the local web example’s Verify tool, expand the optional HCS check, and supply the topic, sequence and payer above.

Verification was performed against the actual Mirror Node message: the digest and all commitment metadata matched. The original two-minute observation window expires; this is retained historical evidence, not a current estimate. An expired report still has verifiable integrity and can match its HCS commitment. The report's payout-token association warning remains explicit, and it does not certify the ability to execute the conversion.

An earlier setup commitment appears as sequence 1 on the same topic. Sequence 2 is the preferred submission evidence because its report includes validated SaucerSwap liquidity.

Only public report data and receipts are committed. The local testnet signing key and environment file are excluded from Git.

## Transaction shown in the developer demo

The revised developer demo records a fresh public clone, local setup, a live testnet observation, HCS publication and explorer inspection. Its actual report commitment transaction is:

- [HashScan: successful HCS submit message](https://hashscan.io/testnet/transaction/0.0.8348691@1791031602.579918353)
- [Actual Mirror Node message: topic 0.0.10835164, sequence 3](https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10835164/messages/3)

The new full report and receipt accompany the local demo deliverable. This documentation adds only links to the already-public transaction and message; no new account balance report is added to this repository. Sequence 2 above remains the self-contained public report-verification example.
