package binance

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const baseURL = "https://api.binance.com"

// PriceResult is the 24hr ticker response
type PriceResult struct {
	Symbol             string  `json:"symbol"`
	PriceChange        string  `json:"priceChange"`
	PriceChangePercent string  `json:"priceChangePercent"`
	LastPrice          string  `json:"lastPrice"`
	HighPrice          string  `json:"highPrice"`
	LowPrice           string  `json:"lowPrice"`
	Volume             string  `json:"volume"`
	QuoteVolume        string  `json:"quoteVolume"`
}

// Kline represents a single OHLCV candle
type Kline struct {
	OpenTime  int64   `json:"openTime"`
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    float64 `json:"volume"`
	CloseTime int64   `json:"closeTime"`
}

// GetPrice fetches 24hr ticker for a symbol (e.g. BTCUSDT)
func GetPrice(symbol string) (*PriceResult, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	if symbol == "" {
		return nil, fmt.Errorf("symbol is required")
	}
	u := baseURL + "/api/v3/ticker/24hr?symbol=" + url.QueryEscape(symbol)
	resp, err := http.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("binance api error %d: %s", resp.StatusCode, string(body))
	}
	var out PriceResult
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetKlines fetches OHLCV candlestick data. interval: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M. limit max 1000.
func GetKlines(symbol, interval string, limit int) ([]Kline, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	if symbol == "" {
		return nil, fmt.Errorf("symbol is required")
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	u := fmt.Sprintf("%s/api/v3/klines?symbol=%s&interval=%s&limit=%d",
		baseURL, url.QueryEscape(symbol), url.QueryEscape(interval), limit)
	resp, err := http.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("binance api error %d: %s", resp.StatusCode, string(body))
	}
	var raw [][]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	klines := make([]Kline, 0, len(raw))
	for _, r := range raw {
		if len(r) < 8 {
			continue
		}
		k := Kline{}
		if v, ok := r[0].(float64); ok {
			k.OpenTime = int64(v)
		}
		k.Open = parseFloat(r[1])
		k.High = parseFloat(r[2])
		k.Low = parseFloat(r[3])
		k.Close = parseFloat(r[4])
		k.Volume = parseFloat(r[5])
		if v, ok := r[6].(float64); ok {
			k.CloseTime = int64(v)
		}
		klines = append(klines, k)
	}
	return klines, nil
}

func parseFloat(v interface{}) float64 {
	switch x := v.(type) {
	case string:
		f, _ := strconv.ParseFloat(x, 64)
		return f
	case float64:
		return x
	default:
		return 0
	}
}

// commonSymbols maps coin names to Binance symbols
var commonSymbols = map[string]string{
	"bitcoin": "BTCUSDT", "btc": "BTCUSDT",
	"ethereum": "ETHUSDT", "eth": "ETHUSDT",
	"solana": "SOLUSDT", "sol": "SOLUSDT",
	"bnb": "BNBUSDT", "binance": "BNBUSDT",
	"xrp": "XRPUSDT", "ripple": "XRPUSDT",
	"cardano": "ADAUSDT", "ada": "ADAUSDT",
	"dogecoin": "DOGEUSDT", "doge": "DOGEUSDT",
	"avalanche": "AVAXUSDT", "avax": "AVAXUSDT",
	"polkadot": "DOTUSDT", "dot": "DOTUSDT",
	"chainlink": "LINKUSDT", "link": "LINKUSDT",
	"polygon": "MATICUSDT", "matic": "MATICUSDT",
	"uniswap": "UNIUSDT", "uni": "UNIUSDT",
	"litecoin": "LTCUSDT", "ltc": "LTCUSDT",
	"tron": "TRXUSDT", "trx": "TRXUSDT",
	"pepe": "PEPEUSDT", "shiba": "SHIBUSDT", "shib": "SHIBUSDT",
	"arbitrum": "ARBUSDT", "arb": "ARBUSDT",
	"optimism": "OPUSDT", "op": "OPUSDT",
	"sui": "SUIUSDT", "aptos": "APTUSDT", "apt": "APTUSDT",
	"near": "NEARUSDT", "injective": "INJUSDT", "inj": "INJUSDT",
	"sei": "SEIUSDT", "render": "RENDERUSDT", "rndr": "RENDERUSDT",
	"wld": "WLDUSDT", "worldcoin": "WLDUSDT",
	"fil": "FILUSDT", "filecoin": "FILUSDT",
	"atom": "ATOMUSDT", "cosmos": "ATOMUSDT",
	"stx": "STXUSDT", "stacks": "STXUSDT",
	"ftm": "FTMUSDT", "fantom": "FTMUSDT",
	"hbar": "HBARUSDT", "hedera": "HBARUSDT",
	"vet": "VETUSDT", "vechain": "VETUSDT",
	"algo": "ALGOUSDT", "algorand": "ALGOUSDT",
	"axs": "AXSUSDT", "sand": "SANDUSDT", "mana": "MANAUSDT",
	"usdc": "USDCUSDT", "usdt": "USDTUSDT", "dai": "DAIUSDT",
}

// SearchSymbol maps common coin names to Binance symbols. Returns empty string if not found.
func SearchSymbol(coin string) string {
	coin = strings.ToLower(strings.TrimSpace(coin))
	if coin == "" {
		return ""
	}
	if s, ok := commonSymbols[coin]; ok {
		return s
	}
	// If already looks like a symbol (e.g. BTCUSDT), return uppercased
	if strings.HasSuffix(strings.ToUpper(coin), "USDT") && len(coin) >= 7 {
		return strings.ToUpper(coin)
	}
	// Try appending USDT for short codes
	if len(coin) <= 5 {
		return strings.ToUpper(coin) + "USDT"
	}
	return ""
}

// FormatKlineTime formats a kline timestamp for display
func FormatKlineTime(ts int64) string {
	return time.UnixMilli(ts).UTC().Format("2006-01-02 15:04")
}
