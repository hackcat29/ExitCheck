const assert = require('node:assert/strict');
const { ethers, network } = require('hardhat');
describe('ReportAnchor', () => {
  async function setup() {
    const anchor = await (
      await ethers.getContractFactory('ReportAnchor')
    ).deploy();
    const [issuer, other] = await ethers.getSigners();
    const block = await ethers.provider.getBlock('latest');
    return {
      anchor,
      issuer,
      other,
      time: block.timestamp,
      digest: ethers.sha256(ethers.toUtf8Bytes('ExitCheck report')),
    };
  }
  it('stores an issuer observation and expires freshness', async () => {
    const { anchor, issuer, time, digest } = await setup();
    await anchor.publish(digest, time, time + 120);
    const o = await anchor.observations(issuer.address, digest);
    assert.equal(o.observedAt, BigInt(time));
    assert.equal(await anchor.isFresh(issuer.address, digest), true);
    await network.provider.send('evm_increaseTime', [121]);
    await network.provider.send('evm_mine');
    assert.equal(await anchor.isFresh(issuer.address, digest), false);
  });
  it('rejects duplicate publication by the same issuer', async () => {
    const { anchor, time, digest } = await setup();
    await anchor.publish(digest, time, time + 120);
    await assert.rejects(
      anchor.publish(digest, time, time + 120),
      /DuplicateReport/,
    );
  });
  it('isolates issuers so another publisher cannot occupy your digest', async () => {
    const { anchor, issuer, other, time, digest } = await setup();
    await anchor.connect(other).publish(digest, time, time + 120);
    assert.equal(await anchor.isFresh(issuer.address, digest), false);
    await anchor.publish(digest, time, time + 120);
    assert.equal(await anchor.isFresh(issuer.address, digest), true);
  });
  it('rejects zero digests and invalid observation windows', async () => {
    const { anchor, time, digest } = await setup();
    await assert.rejects(
      anchor.publish(ethers.ZeroHash, time, time + 120),
      /InvalidDigest/,
    );
    await assert.rejects(
      anchor.publish(digest, time + 300, time + 400),
      /InvalidWindow/,
    );
    await assert.rejects(anchor.publish(digest, time, time), /InvalidWindow/);
  });
});
