# CryptoMaster API Reference

## Overview

- Base URL: `https://nofxos.ai`
- Content type: `application/json`
- Authentication: pass `auth=your_api_key` in the query string or `Authorization: Bearer your_api_key` in the request headers.

Successful responses use this envelope:

```json
{
  "success": true,
  "data": {}
}
```

Errors use `success: false` and include an error message.

## Numeric conventions

Price-change ratios are decimals unless a field explicitly says it is already expressed as a percentage. For example, `0.015` represents `1.5%` and must be multiplied by 100 for display. Monetary values are denominated in USDT unless documented otherwise. Open-interest quantities may represent contracts or asset units; `oi_delta_value` is the comparable USDT value.

Supported `duration` values are `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `24h`, `3d`, and `7d`. Endpoints that accept multiple durations use a comma-separated value such as `1h,4h,24h`.

## AI500 scoring

### List recommended assets

```http
GET /api/ai500/list
```

Returns the ranked AI500 asset list and associated scores.

### Get one asset

```http
GET /api/ai500/:symbol
```

Symbols may be supplied as a base asset or pair, for example `BTC` or `ETHUSDT`.

### Get statistics

```http
GET /api/ai500/stats
```

Returns aggregate AI500 statistics.

## Open-interest rankings

### Largest increases

```http
GET /api/oi/top-ranking?limit=50&duration=4h
```

### Largest decreases

```http
GET /api/oi/low-ranking?limit=30&duration=24h
```

Both endpoints accept:

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | integer | `20` | Number of results; maximum 100 |
| `duration` | string | `1h` | Comparison window |

`GET /api/oi/top` remains available as a backward-compatible top-20 endpoint.

## Net-flow rankings

### Largest inflows

```http
GET /api/netflow/top-ranking?limit=30&duration=4h&type=institution&trade=future
```

### Largest outflows

```http
GET /api/netflow/low-ranking?limit=20&duration=1h&type=personal&trade=spot
```

Parameters:

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | integer | `20` | Number of results; maximum 100 |
| `duration` | string | `1h` | Comparison window |
| `type` | string | all | Participant group, such as `institution` or `personal` |
| `trade` | string | all | Market type, such as `future` or `spot` |

Positive values indicate inflow and negative values indicate outflow. `GET /api/netflow/top` remains available for backward compatibility.

## Price-change rankings

```http
GET /api/price/ranking?duration=1h,4h,24h&limit=20
```

The endpoint returns gainers and losers for each requested duration. `limit` applies independently to each ranking and is capped at 100.

## Asset details

```http
GET /api/coin/:symbol
```

Use `include` to limit the returned sections:

```http
GET /api/coin/BTC?include=netflow,oi,price,ai500
GET /api/coin/ETHUSDT?include=netflow,oi
```

Common fields include price changes, participant net flow, exchange open-interest deltas, and AI500 data. Open-interest percentage fields such as `oi_delta_percent` are already percentage values; `0.08` means `0.08%`.

## Examples

Query-string authentication:

```bash
curl "https://nofxos.ai/api/ai500/list?auth=your_api_key"
```

Header authentication:

```bash
curl "https://nofxos.ai/api/ai500/list" \
  -H "Authorization: Bearer your_api_key"
```

Python:

```python
import requests

BASE_URL = "https://nofxos.ai"
API_KEY = "your_api_key"

response = requests.get(
    f"{BASE_URL}/api/price/ranking",
    params={"duration": "1h,4h,24h", "limit": 20},
    headers={"Authorization": f"Bearer {API_KEY}"},
    timeout=30,
)
response.raise_for_status()
print(response.json())
```

TypeScript:

```typescript
const response = await fetch(
  "https://nofxos.ai/api/coin/BTC?include=netflow,oi,price,ai500",
  { headers: { Authorization: "Bearer your_api_key" } },
);

if (!response.ok) throw new Error(`API request failed: ${response.status}`);
const payload = await response.json();
```

## Error handling and limits

Clients should handle invalid authentication, invalid symbols or parameters, upstream-data failures, and rate limiting. Honor `Retry-After` when present and use exponential backoff for transient failures. Cache duration and rate limits may change by deployment; inspect response headers and deployment-specific configuration rather than assuming fixed values.
