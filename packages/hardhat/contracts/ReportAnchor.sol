// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Optional self-attested report registry for EVM consumers.
/// @dev A record proves publication by msg.sender, not truthful treasury data.
contract ReportAnchor {
    struct Observation { uint64 observedAt; uint64 expiresAt; }
    mapping(address => mapping(bytes32 => Observation)) public observations;
    event ReportPublished(address indexed issuer, bytes32 indexed digest, uint64 observedAt, uint64 expiresAt);
    error InvalidDigest();
    error InvalidWindow();
    error DuplicateReport();

    function publish(bytes32 digest, uint64 observedAt, uint64 expiresAt) external {
        if (digest == bytes32(0)) revert InvalidDigest();
        if (observedAt == 0 || observedAt > block.timestamp || expiresAt <= observedAt || expiresAt <= block.timestamp) revert InvalidWindow();
        if (observations[msg.sender][digest].observedAt != 0) revert DuplicateReport();
        observations[msg.sender][digest] = Observation(observedAt, expiresAt);
        emit ReportPublished(msg.sender, digest, observedAt, expiresAt);
    }
    function isFresh(address issuer, bytes32 digest) external view returns (bool) {
        return observations[issuer][digest].expiresAt > block.timestamp;
    }
}
