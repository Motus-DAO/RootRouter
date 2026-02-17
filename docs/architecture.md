# RootRouter Architecture

## The Root Pair: Measuring Intent vs Execution

Every agent interaction has two sides: what was asked (the query) and what was delivered (the response). RootRouter embeds both into a shared vector space and computes the **root vector** — the difference between intent and execution. The magnitude of this vector (the root norm) is a direct measurement of how well the agent fulfilled the request. A small norm means tight alignment; a large norm means the agent diverged significantly from the query's intent.

This is not just a quality metric — it's a coordinate in a high-dimensional space. When we collect hundreds of these root vectors, geometric structure emerges: some directions of variation are more important than others, and the space naturally decomposes into regions.

## From PCA to Weyl Chambers

We use Principal Component Analysis to find the **root directions** — the axes along which root vectors vary most. These are computed from scratch using power iteration with deflation on the covariance matrix (no external ML libraries).

The root directions are analogous to **simple roots** in Lie algebra. Just as simple roots generate a root system that decomposes a Lie algebra into weight spaces, our root directions decompose the interaction space into **chambers**. The construction is concrete: for each root vector, we compute its sign pattern — the vector of +1/-1 values indicating which side of each root direction's hyperplane it falls on. Each unique sign pattern defines a chamber, encoded as a binary integer (e.g., sign pattern [+1, -1, +1] becomes chamber 5 = 0b101).

This is superior to arbitrary k-means clustering because:
- Chambers have **algebraic structure**: adjacency is defined by Hamming distance 1 (one bit flip = one Weyl reflection)
- Reflections give us a **complementary retrieval operation**: reflecting a query through a root direction's hyperplane lands in the chamber containing information the query doesn't ask for but may need
- The number of chambers emerges from the data (up to 2^k for k root directions), not from an arbitrary k parameter

## Three-Strategy Context Retrieval

The context filter combines three complementary retrieval strategies:

**Chamber retrieval** selects interactions from the same and adjacent Weyl chambers. These are interactions where the agent faced structurally similar tasks — same qualitative pattern of intent-execution gaps. Adjacent chambers (differing by one sign flip) provide near-similar context.

**Graph retrieval** traverses the interaction knowledge graph. Nodes are interactions; edges encode temporal, topical, agent, and chamber relationships. BFS from the most similar recent interactions finds context that is relationally connected — "query A led to insight B which was handled by agent C" is a path that flat embedding search would miss entirely.

**Reflection retrieval** computes the algebraic reflection of the query vector through each root direction's hyperplane and finds interactions near the reflected vectors. This is the most novel strategy: it retrieves **complementary** information, not similar information. A coding query reflected through the "debugging" root direction hyperplane may land near debugging interactions that provide relevant patterns.

The strategies are merged, deduplicated, ranked by a weighted score, and truncated to the token budget.

## Agent Topology and Swarm Coordination

For multi-agent swarms, the **agent topology graph** tracks which agents specialize in which chambers. Nodes are agents; edges are delegation patterns weighted by performance. When a task is classified into a chamber, the graph identifies the agent with the lowest average root norm in that chamber — the specialist.

This enables emergent task decomposition: complex tasks that span multiple chambers can be automatically split across agents based on their demonstrated competencies, without explicit task-routing rules.

## Celo Integration and On-Chain Trust

RootRouter logs compressed telemetry entries on Celo: chamber ID, root norm, model tier, and tokens saved. Celo's sub-cent transaction fees make high-frequency logging practical — every interaction can be recorded on-chain.

This creates a **verifiable audit trail** of agent decision-making. Other agents can query the telemetry contract to assess RootRouter's historical performance before delegating tasks. ERC-8004 registration makes RootRouter discoverable as a Trustless Agent on the Celo ecosystem.

## Connection to E8 Systems Framework

RootRouter is a practical application of the broader E8 Systems Framework research program, which models collective intelligence using the algebraic structures of exceptional Lie groups. The Weyl chamber decomposition used here is a simplified version of the E8 root system's 696,729,600-element Weyl group. The insight that paired measurements (intent-execution, stimulus-response, conscious-unconscious) produce root vectors whose geometric structure reveals the system's symmetry is the foundational principle. RootRouter demonstrates this principle in the concrete domain of AI agent optimization.
