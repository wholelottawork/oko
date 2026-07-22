package wallet

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"oko/mcp"
	"oko/provider/binance"
)

// PriceTools are the function definitions for price/history lookups
var PriceTools = []mcp.Tool{
	{
		Type: "function",
		Function: mcp.FunctionDef{
			Name:        "get_crypto_price",
			Description: "Get current price, 24h change percent, volume, high and low for a crypto symbol. Use Binance symbol format (e.g. BTCUSDT, ETHUSDT).",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"symbol": map[string]any{
						"type":        "string",
						"description": "Binance trading pair symbol, e.g. BTCUSDT, ETHUSDT, SOLUSDT",
					},
				},
				"required": []string{"symbol"},
			},
		},
	},
	{
		Type: "function",
		Function: mcp.FunctionDef{
			Name:        "get_historical_prices",
			Description: "Get OHLCV candlestick data for a crypto symbol. Use for price history, charts, or trend analysis.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"symbol": map[string]any{
						"type":        "string",
						"description": "Binance symbol e.g. BTCUSDT",
					},
					"interval": map[string]any{
						"type":        "string",
						"description": "Candle interval: 1h, 4h, 1d, 1w",
						"enum":        []string{"1h", "4h", "1d", "1w"},
					},
					"limit": map[string]any{
						"type":        "integer",
						"description": "Number of candles to fetch (1-100, default 24)",
					},
				},
				"required": []string{"symbol"},
			},
		},
	},
	{
		Type: "function",
		Function: mcp.FunctionDef{
			Name:        "resolve_symbol",
			Description: "Resolve a coin name (e.g. bitcoin, eth, solana) to its Binance USDT symbol. Use before get_crypto_price or get_historical_prices if user mentions a coin by name.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"coin": map[string]any{
						"type":        "string",
						"description": "Coin name or ticker, e.g. bitcoin, btc, ethereum, eth",
					},
				},
				"required": []string{"coin"},
			},
		},
	},
	{
		Type: "function",
		Function: mcp.FunctionDef{
			Name:        "get_trending_coins",
			Description: "Get today's top trending and top-gaining cryptocurrencies. Returns trending coins from CoinGecko and top 24h gainers/losers by volume from Binance. Use when the user asks about trending, hot, or top coins today.",
			Parameters: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
				"required":   []string{},
			},
		},
	},
}

// ResponsesTools are the tool definitions for the xAI Responses API.
// Only includes server-side tools (web_search, x_search) that xAI executes automatically.
var ResponsesTools = []any{
	map[string]any{"type": "web_search"},
	map[string]any{"type": "x_search"},
}

// ExecuteTool runs a tool by name with JSON-encoded arguments and returns the result as a string
func ExecuteTool(name string, argsJSON string) (string, error) {
	var args map[string]any
	if argsJSON != "" {
		if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
			return "", fmt.Errorf("invalid tool arguments: %w", err)
		}
	}
	if args == nil {
		args = make(map[string]any)
	}

	switch name {
	case "get_crypto_price":
		return executeGetPrice(args)
	case "get_historical_prices":
		return executeGetHistorical(args)
	case "resolve_symbol":
		return executeResolveSymbol(args)
	case "get_trending_coins":
		return executeGetTrending()
	default:
		return "", fmt.Errorf("unknown tool: %s", name)
	}
}

func executeGetPrice(args map[string]any) (string, error) {
	sym, _ := args["symbol"].(string)
	sym = strings.TrimSpace(sym)
	if sym == "" {
		// Try resolving from "coin" if provided
		if c, ok := args["coin"].(string); ok && c != "" {
			sym = binance.SearchSymbol(c)
		}
	}
	if sym == "" {
		return "", fmt.Errorf("symbol or coin is required")
	}
	if s := binance.SearchSymbol(sym); s != "" && !strings.HasSuffix(strings.ToUpper(sym), "USDT") {
		sym = s
	}
	res, err := binance.GetPrice(sym)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("Symbol: %s | Price: $%s | 24h Change: %s%% | High: $%s | Low: $%s | Volume: %s",
		res.Symbol, res.LastPrice, res.PriceChangePercent, res.HighPrice, res.LowPrice, res.Volume), nil
}

func executeGetHistorical(args map[string]any) (string, error) {
	sym, _ := args["symbol"].(string)
	sym = strings.TrimSpace(sym)
	if sym == "" {
		if c, ok := args["coin"].(string); ok && c != "" {
			sym = binance.SearchSymbol(c)
		}
	}
	if sym == "" {
		return "", fmt.Errorf("symbol or coin is required")
	}
	if s := binance.SearchSymbol(sym); s != "" && !strings.HasSuffix(strings.ToUpper(sym), "USDT") {
		sym = s
	}
	interval, _ := args["interval"].(string)
	if interval == "" {
		interval = "1d"
	}
	limit := 24
	if v, ok := args["limit"].(float64); ok && v > 0 {
		limit = int(v)
	}
	if limit > 100 {
		limit = 100
	}
	klines, err := binance.GetKlines(sym, interval, limit)
	if err != nil {
		return "", err
	}
	if len(klines) == 0 {
		return fmt.Sprintf("No historical data for %s", sym), nil
	}
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Historical %s (%s, last %d candles):\n", sym, interval, len(klines)))
	for i := len(klines) - 1; i >= 0 && i >= len(klines)-10; i-- {
		k := klines[i]
		sb.WriteString(fmt.Sprintf("  %s: O=%.4f H=%.4f L=%.4f C=%.4f V=%.0f\n",
			binance.FormatKlineTime(k.OpenTime), k.Open, k.High, k.Low, k.Close, k.Volume))
	}
	return sb.String(), nil
}

func executeResolveSymbol(args map[string]any) (string, error) {
	coin, _ := args["coin"].(string)
	coin = strings.TrimSpace(coin)
	if coin == "" {
		return "", fmt.Errorf("coin is required")
	}
	sym := binance.SearchSymbol(coin)
	if sym == "" {
		return fmt.Sprintf("Unknown coin: %s. Try using the full Binance symbol (e.g. BTCUSDT).", coin), nil
	}
	return fmt.Sprintf("%s -> %s", coin, sym), nil
}

func executeGetTrending() (string, error) {
	var sb strings.Builder

	// CoinGecko trending (free, no key)
	cgClient := &http.Client{Timeout: 8 * time.Second}
	resp, err := cgClient.Get("https://api.coingecko.com/api/v3/search/trending")
	if err == nil && resp.StatusCode == 200 {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var cgData struct {
			Coins []struct {
				Item struct {
					Name   string  `json:"name"`
					Symbol string  `json:"symbol"`
					Rank   int     `json:"market_cap_rank"`
					Score  float64 `json:"score"`
					Data   struct {
						PriceChangePercent24h float64 `json:"price_change_percentage_24h"`
					} `json:"data"`
				} `json:"item"`
			} `json:"coins"`
		}
		if json.Unmarshal(body, &cgData) == nil && len(cgData.Coins) > 0 {
			sb.WriteString("Trending coins on CoinGecko today:\n")
			for i, c := range cgData.Coins {
				if i >= 7 {
					break
				}
				change := c.Item.Data.PriceChangePercent24h
				sb.WriteString(fmt.Sprintf("  %d. %s (%s) | Rank #%d | 24h: %+.2f%%\n",
					i+1, c.Item.Name, strings.ToUpper(c.Item.Symbol), c.Item.Rank, change))
			}
			sb.WriteString("\n")
		}
	}

	// Binance top 24h gainers by volume (USDT pairs)
	bnResp, err := cgClient.Get("https://api.binance.com/api/v3/ticker/24hr")
	if err == nil && bnResp.StatusCode == 200 {
		defer bnResp.Body.Close()
		body, _ := io.ReadAll(bnResp.Body)
		var tickers []struct {
			Symbol             string `json:"symbol"`
			PriceChangePercent string `json:"priceChangePercent"`
			Volume             string `json:"quoteVolume"`
			LastPrice          string `json:"lastPrice"`
		}
		if json.Unmarshal(body, &tickers) == nil {
			// Filter USDT pairs only, exclude stablecoins
			stables := map[string]bool{"USDT": true, "USDC": true, "BUSD": true, "DAI": true, "TUSD": true, "FDUSD": true}
			var filtered []struct {
				sym    string
				change float64
				vol    float64
				price  string
			}
			for _, tk := range tickers {
				if !strings.HasSuffix(tk.Symbol, "USDT") {
					continue
				}
				base := strings.TrimSuffix(tk.Symbol, "USDT")
				if stables[base] {
					continue
				}
				chg, _ := strconv.ParseFloat(tk.PriceChangePercent, 64)
				vol, _ := strconv.ParseFloat(tk.Volume, 64)
				if vol < 1_000_000 { // skip low-volume pairs
					continue
				}
				filtered = append(filtered, struct {
					sym    string
					change float64
					vol    float64
					price  string
				}{tk.Symbol, chg, vol, tk.LastPrice})
			}
			// Top 5 gainers
			sort.Slice(filtered, func(i, j int) bool { return filtered[i].change > filtered[j].change })
			sb.WriteString("Top 5 Binance gainers (24h, USDT pairs, vol >$1M):\n")
			for i := 0; i < 5 && i < len(filtered); i++ {
				f := filtered[i]
				sb.WriteString(fmt.Sprintf("  %d. %s | $%s | +%.2f%% | Vol $%.0fM\n",
					i+1, f.sym, f.price, f.change, f.vol/1_000_000))
			}
			sb.WriteString("\n")
			// Top 5 by volume
			sort.Slice(filtered, func(i, j int) bool { return filtered[i].vol > filtered[j].vol })
			sb.WriteString("Top 5 Binance by volume (24h):\n")
			for i := 0; i < 5 && i < len(filtered); i++ {
				f := filtered[i]
				sb.WriteString(fmt.Sprintf("  %d. %s | $%s | %.2f%% | Vol $%.0fM\n",
					i+1, f.sym, f.price, f.change, f.vol/1_000_000))
			}
		}
	}

	result := strings.TrimSpace(sb.String())
	if result == "" {
		return "Unable to fetch trending data at this time.", nil
	}
	return result, nil
}
