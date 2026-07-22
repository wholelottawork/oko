# PnL Calculation Design

## Definitions

### Initial balance

The initial balance is the account's total equity when a trader is created. It is the baseline for all total-profit calculations and is stored in `traders.initial_balance`.

```text
Initial Balance = Total Wallet Balance + Total Unrealized Profit
```

The system reads this value from the exchange during trader creation. A user may update it manually after a deposit, withdrawal, or intentional baseline reset.

### Current equity

Current equity is the account's live total value:

```text
Current Equity = Total Wallet Balance + Total Unrealized Profit
```

Wallet balance includes realized profit and loss. Unrealized profit is the sum across open positions. Current equity is read from the exchange and is not stored as the baseline.

### Total profit and loss

```text
Total PnL   = Current Equity - Initial Balance
Total PnL % = (Total PnL / Initial Balance) × 100
```

Example:

```text
Initial Balance: 10,000 USDT
Current Equity:  11,500 USDT
Total PnL:        1,500 USDT
Total PnL %:         15%
```

### Position profit and loss

Unrealized PnL for an individual position comes from the exchange. Its percentage is:

```text
Position PnL % = (Unrealized PnL / Margin Used) × 100
Margin Used    = Position Value / Leverage
```

## Design rules

- Capture the initial balance automatically when creating a trader.
- Do not change it during normal trading or configuration updates.
- Allow an explicit manual update when the account funding baseline changes.
- Calculate current equity and total PnL from live exchange data.
- Protect against division by zero when the initial balance or margin is zero.

## Implementation

Trader creation obtains balance data from the temporary exchange client, adds wallet balance and unrealized profit, and stores the result in `InitialBalance`.

Automatic baseline synchronization is disabled. Regular trader updates must not modify `initial_balance` accidentally. The trader update API may change it only when the request explicitly includes a new value.

Example request:

```http
POST /traders/:id
Content-Type: application/json

{
  "initial_balance": 10000.0
}
```

After updating the baseline, reload the trader in memory and return the previous and new values to the client.

## Data flow

```text
Create trader
  └─ Fetch live equity
      └─ Store as initial_balance

Run trading cycles
  ├─ Keep initial_balance unchanged
  ├─ Fetch current equity
  └─ Calculate total PnL from the difference

Deposit, withdrawal, or manual correction
  └─ User explicitly sets a new initial_balance
      └─ Future PnL uses the new baseline
```

## User experience

The creation form does not need an initial-balance field when the exchange connection is available. The trader detail page should display the baseline, current equity, total PnL, and the time of the last baseline update. A manual reset action should explain that it changes historical performance calculations and require confirmation.

## Relevant code

- `api/server.go`: trader creation and update handlers
- `trader/auto_trader.go`: trading-cycle behavior
- database trader records: persistent `initial_balance`

The initial balance is a stable statistical baseline, not a live balance cache.
