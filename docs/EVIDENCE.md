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

Or import the published report in the dashboard's Verify report screen, expand the optional HCS check, and supply the topic, sequence and payer above.

Verification was performed against the actual Mirror Node message: the digest and all commitment metadata matched. The original two-minute observation window expires; this is retained historical evidence, not a current estimate. An expired report still has verifiable integrity and can match its HCS commitment. The report's payout-token association warning remains explicit, and it does not certify the ability to execute the conversion.

An earlier setup commitment appears as sequence 1 on the same topic. Sequence 2 is the preferred submission evidence because its report includes validated SaucerSwap liquidity.

Only public report data and receipts are committed. The local testnet signing key and environment file are excluded from Git.
