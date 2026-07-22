# AI Trader: Research Report on Autonomous Trading-Agent Benchmarks

## Abstract

AI Trader is a benchmark for evaluating autonomous language-model agents in live financial-market simulations. It gives each model the same market data, account state, tools, and risk constraints, then compares the quality and consistency of its decisions. The benchmark covers United States equities, mainland Chinese equities, and cryptocurrency markets.

The central design choice is a minimal-information paradigm: an agent receives only information that would have been available at the decision time. This limits data leakage, makes runs easier to compare, and focuses the evaluation on reasoning, tool use, risk control, and adaptation.

## 1. Motivation and goals

General language-model benchmarks do not measure whether a model can manage capital, react to changing markets, or respect operational constraints over a long-running session. This project evaluates those capabilities directly.

The research goals are to:

- compare models under identical market and account conditions;
- measure return, risk, risk-adjusted performance, and trading behavior;
- study how reasoning depth and tool use affect decisions;
- identify market-specific strengths and failure modes; and
- provide reproducible records for later analysis.

## 2. System overview

Each benchmark run combines a model-backed agent, a market adapter, a small Model Context Protocol (MCP) toolset, and a result recorder. Supported models can be extended through provider adapters. Market adapters normalize different trading hours, symbol formats, order restrictions, and settlement rules.

The agent receives:

- the current date and market session state;
- portfolio cash, equity, positions, and open orders;
- a bounded list of tradable assets;
- the available tool schemas; and
- explicit trading and risk rules.

It does not receive future prices or unrestricted historical context.

## 3. Minimal-information paradigm

The benchmark deliberately keeps prompts small and time-correct. The approach is based on four principles:

1. Information must be available at the simulated decision time.
2. Every compared model must receive equivalent inputs.
3. The model should request additional data through auditable tools.
4. Decisions and tool calls must be stored for reproducibility.

This design reduces look-ahead bias and encourages agents to distinguish relevant signals from noise.

## 4. Architecture

```text
Market data ──> Market adapter ──> Agent context
                                      │
                                      v
                               Model reasoning loop
                                      │
                           ┌──────────┴──────────┐
                           v                     v
                    MCP data tools       Trading executor
                           │                     │
                           └──────────┬──────────┘
                                      v
                              Results and metrics
```

The implementation separates orchestration, model providers, trading tools, market rules, and evaluation. This makes it possible to add a provider or market without changing the benchmark contract.

## 5. Agent execution

An agent is initialized with a model adapter, market rules, portfolio state, and tool definitions. During each cycle it:

1. reviews the current portfolio and market context;
2. decides whether more information is needed;
3. calls permitted tools and observes their results;
4. proposes an action with explicit reasoning;
5. validates the action against market and risk rules; and
6. records the decision and execution result.

Transient provider and tool failures use bounded retries. Invalid orders are rejected before reaching the market adapter.

## 6. MCP toolchain

The original benchmark design includes four focused services:

- trade execution, with validation and market-specific restrictions;
- local price lookup for current and recent data;
- information search for public market context; and
- safe mathematical evaluation for calculations.

Keeping these tools separate improves auditability and allows restrictive deployment policies.

## 7. Market adaptation

Market rules are normalized behind adapters while preserving material differences:

- United States equities have exchange sessions and order-size rules.
- Mainland Chinese equities have distinct sessions, lot sizes, and settlement constraints.
- Cryptocurrency markets operate continuously and may support leverage and perpetual contracts.

The system prompt includes only the rules relevant to the selected market.

## 8. Evaluation methodology

Runs are evaluated with:

- total and annualized return;
- volatility, maximum drawdown, and downside risk;
- Sharpe and Sortino ratios;
- win rate, turnover, trade count, and average holding time;
- invalid-action rate and tool-call success rate; and
- decision consistency across comparable states.

Fair comparisons require the same start time, initial capital, asset universe, market data, fee model, and tool availability. Session records are stored in append-friendly JSON Lines files under a model and market hierarchy.

## 9. Experimental design

Datasets should contain survivorship-aware symbol universes and time-correct prices for each supported market. A run configuration identifies the model, market, capital, dates, assets, fees, latency assumptions, and risk limits. Parallel runs may be used when they do not share mutable account state.

## 10. Findings

The study's main qualitative findings were:

- general benchmark strength does not directly predict trading performance;
- robust risk control contributes more to cross-market stability than aggressive return seeking;
- effective and economical tool use correlates with better decisions; and
- deeper reasoning can improve consistency, but excessive reasoning can add latency and noise.

These observations are hypotheses from benchmark behavior, not evidence of guaranteed investment performance.

## 11. Limitations

Simulation cannot fully reproduce liquidity, slippage, partial fills, exchange outages, or psychological pressure. Results are sensitive to asset selection, evaluation window, fees, and prompt design. Public model training data may also overlap with historical market narratives even when future prices are withheld.

## 12. Future work

Near-term work includes stronger execution simulation, broader risk metrics, and more reproducible run manifests. Medium-term work includes additional markets, stress scenarios, and richer attribution. Longer-term research can study multi-agent portfolios, online adaptation, and statistically significant comparisons across many market regimes.

## Disclaimer

This benchmark is for research and engineering evaluation. It is not investment advice, and simulated performance does not imply future results.
