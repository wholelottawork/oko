# Grid Strategy Market-Regime and Risk-Control Design

## Overview

This design improves the grid strategy's ability to distinguish ranging markets from trends. Grid density, range, position limits, and leverage adjust to the detected regime.

## Regime detection

Use three groups of signals:

| Dimension | Indicators | Purpose |
| --- | --- | --- |
| Volatility | ATR14 and Bollinger bandwidth | Estimate range amplitude |
| Trend strength | EMA20/EMA50 distance and MACD | Detect directional movement |
| Momentum | RSI14 and 1-hour/4-hour price change | Detect overbought and oversold conditions |

Add Donchian channels calculated from 1-hour candles:

| Box | Period | Approximate coverage | Use |
| --- | ---: | --- | --- |
| Short | 72 | 3 days | Intraday boundaries |
| Medium | 240 | 10 days | Weekly range |
| Long | 500 | 21 days | Major trend boundaries |

The AI evaluates these indicators, the raw candle sequence, and the current position inside each box.

## Range classification

| Level | Characteristics | Typical evidence |
| --- | --- | --- |
| Narrow | Small movement inside the short box | Bandwidth below 2%, low ATR |
| Standard | Normal movement inside the medium box | Bandwidth 2–3%, normal ATR |
| Wide | Price approaches a medium-box boundary | Bandwidth 3–4%, elevated ATR |
| Volatile | Price approaches a long-box boundary | Bandwidth above 4%, high ATR |

Grid policy by level:

| Level | Density | Range | Per-grid size | Total-position cap | Effective-leverage cap |
| --- | --- | --- | --- | --- | --- |
| Narrow | Dense | Narrow | Small | 30–40% | 2x |
| Standard | Normal | Medium | Normal | 60–70% | 3–4x |
| Wide | Sparse | Wide | Normal | 50–60% | 3x |
| Volatile | Sparsest | Widest | Small | 30–40% | 2x |

Narrow and volatile regimes are intentionally conservative. Standard ranging conditions permit the largest allocation.

## Breakouts and recovery

A breakout is confirmed when three consecutive 1-hour candle closes remain outside a box.

| Breakout | Response |
| --- | --- |
| Short box | Reduce the position to 50% |
| Medium box | Pause the grid and cancel open orders |
| Long box | Pause, cancel open orders, and close all positions |

If price returns inside the box after a false breakout, resume the grid at 50% allocation and scale up only after the regime stabilizes.

## Risk panel

The frontend should display:

- configured, effective, and recommended leverage;
- current position, maximum position, and utilization;
- liquidation price and distance;
- current regime level; and
- short-, medium-, and long-box boundaries and current price position.

## Implementation

Backend work:

1. Add `calculateDonchian(klines, period)` in `market/data.go`.
2. Add box inputs and regime output to the prompt in `kernel/grid_engine.go`.
3. Adjust density, range, position size, and effective leverage in `trader/auto_trader_grid.go`.
4. Implement three-level breakout detection, three-candle confirmation, and recovery.

Model additions:

- `GridConfigModel`: `EffectiveLeverageLimit`, `ShortBoxPeriod`, `MidBoxPeriod`, and `LongBoxPeriod`.
- `GridInstanceModel`: current regime, all box boundaries, breakout status, and confirmation count.

## Risk-control summary

| Control | Mechanism |
| --- | --- |
| Position exposure | Regime-dependent 30–70% cap |
| Leverage | Regime-dependent 2–4x effective cap |
| Breakout protection | Escalating response across three boxes |
| False-breakout recovery | Resume at 50% allocation |
| Liquidation prevention | Display distance and enforce leverage limits |
