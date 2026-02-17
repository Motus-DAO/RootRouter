// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RootRouterTelemetry
 * @notice On-chain telemetry logger for RootRouter agent infrastructure on Celo.
 * @dev Stores compressed telemetry entries for verifiable agent performance analytics.
 *      Designed for high-frequency, low-cost logging on Celo L2.
 *
 *      Each entry records:
 *      - Which chamber the interaction was classified into
 *      - The root norm (intent-execution gap magnitude)
 *      - Which model tier was used
 *      - How many tokens were saved by context filtering
 *
 *      This creates an auditable, on-chain record of agent decision-making
 *      that can be queried by other agents (via ERC-8004 reputation) or
 *      analyzed for fleet-wide performance optimization.
 */
contract RootRouterTelemetry {

    struct Entry {
        uint32 chamberId;
        uint16 rootNorm;           // Scaled: real_norm * 10000
        uint8 modelTier;           // 0=fast, 1=balanced, 2=powerful
        uint32 tokensSaved;
        uint32 timestamp;
    }

    // Agent address → entries
    mapping(address => Entry[]) public entries;

    // Agent address → cumulative stats
    mapping(address => uint256) public totalTokensSaved;
    mapping(address => uint256) public totalInteractions;
    mapping(address => uint256) public totalCostSavedMicroUsd; // in micro-USD (1e-6)

    event EntryLogged(
        address indexed agent,
        uint32 chamberId,
        uint16 rootNorm,
        uint8 modelTier,
        uint32 tokensSaved
    );

    event BatchLogged(
        address indexed agent,
        uint256 count,
        uint256 batchTokensSaved
    );

    function logEntry(
        uint32 _chamberId,
        uint16 _rootNorm,
        uint8 _modelTier,
        uint32 _tokensSaved
    ) external {
        entries[msg.sender].push(Entry({
            chamberId: _chamberId,
            rootNorm: _rootNorm,
            modelTier: _modelTier,
            tokensSaved: _tokensSaved,
            timestamp: uint32(block.timestamp)
        }));

        totalTokensSaved[msg.sender] += _tokensSaved;
        totalInteractions[msg.sender] += 1;

        emit EntryLogged(msg.sender, _chamberId, _rootNorm, _modelTier, _tokensSaved);
    }

    function logBatch(
        uint32[] calldata _chamberIds,
        uint16[] calldata _rootNorms,
        uint8[] calldata _modelTiers,
        uint32[] calldata _tokensSaved
    ) external {
        uint256 len = _chamberIds.length;
        require(
            len == _rootNorms.length &&
            len == _modelTiers.length &&
            len == _tokensSaved.length,
            "Length mismatch"
        );

        uint256 batchSaved = 0;
        for (uint256 i = 0; i < len; i++) {
            entries[msg.sender].push(Entry({
                chamberId: _chamberIds[i],
                rootNorm: _rootNorms[i],
                modelTier: _modelTiers[i],
                tokensSaved: _tokensSaved[i],
                timestamp: uint32(block.timestamp)
            }));
            batchSaved += _tokensSaved[i];
        }

        totalTokensSaved[msg.sender] += batchSaved;
        totalInteractions[msg.sender] += len;

        emit BatchLogged(msg.sender, len, batchSaved);
    }

    function getEntryCount(address _agent) external view returns (uint256) {
        return entries[_agent].length;
    }

    function getEntry(address _agent, uint256 _index) external view returns (Entry memory) {
        return entries[_agent][_index];
    }

    function getStats(address _agent) external view returns (
        uint256 interactions,
        uint256 tokensSaved
    ) {
        return (totalInteractions[_agent], totalTokensSaved[_agent]);
    }

    function getRecentEntries(address _agent, uint256 _count) external view returns (Entry[] memory) {
        uint256 total = entries[_agent].length;
        uint256 count = _count > total ? total : _count;
        Entry[] memory recent = new Entry[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = entries[_agent][total - count + i];
        }
        return recent;
    }
}
