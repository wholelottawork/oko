# Adaptive Grid-Trading Repair Plan

## Goal

Fix critical grid-trading defects and add enforceable risk controls between AI decisions and order execution.

## Priorities

| Priority | Problem | Task |
| --- | --- | --- |
| P0 | Leverage is not applied | 1 |
| P0 | Order cancellation is incorrect | 2 |
| P0 | No total-position limit | 3 |
| P1 | Stop losses are not enforced | 4 |
| P1 | No breakout detection | 5 |
| P1 | `MaxDrawdown` is not enforced | 6 |
| P1 | `DailyLossLimit` is not enforced | 7 |
| P2 | Grid parameters do not adapt | 8 |
| P2 | Order-state synchronization is incorrect | 9 |

## Task 1: Apply leverage

In `GridTraderAdapter.PlaceLimitOrder`, call `SetLeverage` before placing an order when the requested leverage is positive. Log unsupported exchange behavior without hiding genuine order failures. Also set leverage during `InitializeGrid` so the exchange is configured before the first cycle.

Add tests that verify the requested symbol and leverage reach the exchange adapter.

## Task 2: Correct cancellation

Make `CancelOrder` use the actual exchange order identifier and return errors to the caller. Do not report success when the exchange rejects or cannot find an order. Add tests for success, already-closed orders, unknown orders, and upstream failures.

## Task 3: Enforce total exposure

Before placing a grid order, calculate current position exposure plus outstanding order exposure. Reject or resize the order when it would exceed the configured total-position cap. Apply the check to both long and short paths.

## Task 4: Enforce stop losses

During state synchronization, compare current price and position state with the configured stop. Cancel incompatible open orders, submit the required close, and record the risk event. Stop-loss execution must not depend on a later AI decision.

## Task 5: Detect breakouts

Detect prices that leave the active grid range. Require confirmation to avoid reacting to a single wick. Once confirmed, cancel stale grid orders and pause or rebuild the grid according to policy.

## Task 6: Enforce maximum drawdown

Calculate drawdown from peak equity on every cycle. When `MaxDrawdown` is breached, stop new orders, cancel open orders, and transition the grid to a risk-paused state.

## Task 7: Enforce the daily loss limit

Track the day's starting equity in the configured timezone. Stop trading when realized and unrealized daily loss reaches `DailyLossLimit`. Reset the baseline only at the next trading day boundary.

## Task 8: Add automatic grid adjustment

Detect when price becomes materially skewed toward a grid boundary. Recenter or rebuild only after a cooldown and only when doing so will not violate exposure constraints. Persist adjustment state so restarts cannot trigger repeated rebuilds.

## Task 9: Repair order synchronization

Map every local order to its exchange state and handle partial fills, cancellation, rejection, and unknown status explicitly. Synchronization must be idempotent and must not duplicate fills or replacement orders.

## Validation

```bash
go build ./...
go test ./...
go test -race ./trader/... ./kernel/...
```

Review checklist:

- all risk controls are enforced in code, not only in prompts;
- long and short behavior is symmetrical;
- calculations include outstanding orders;
- exchange errors remain observable;
- state transitions are persistent and idempotent;
- every P0 and P1 path has tests; and
- logs explain which limit caused a pause or rejection.

Implement each task as a focused change and validate it before starting the next one.
