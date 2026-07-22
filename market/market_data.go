package market

import (
	"encoding/json"
	"oko/logger"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// ─── Binance pair resolution ──────────────────────────────────────────────────

// resolveTradingViewSymbol returns a TradingView-compatible symbol for a given
// CoinGecko symbol. We omit the exchange prefix entirely so TradingView auto-picks
// the best/most-liquid market. Stablecoins return "" to be skipped.
func resolveTradingViewSymbol(cgSymbol string) string {
	s := strings.ToUpper(cgSymbol)
	stables := map[string]bool{
		"USDT": true, "USDC": true, "DAI": true, "BUSD": true,
		"TUSD": true, "FDUSD": true, "USDP": true, "FRAX": true,
		"USDD": true, "GUSD": true, "PYUSD": true, "USDE": true,
		"SUSDE": true, "LUSD": true,
	}
	if stables[s] {
		return ""
	}
	return s + "USDT"
}

// ─── Cache ────────────────────────────────────────────────────────────────────

type marketCache struct {
	mu    sync.RWMutex
	data  []byte
	ready bool
}

func (c *marketCache) set(data []byte) {
	c.mu.Lock()
	c.data = data
	c.ready = true
	c.mu.Unlock()
}

func (c *marketCache) get() ([]byte, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if !c.ready {
		return nil, false
	}
	out := make([]byte, len(c.data))
	copy(out, c.data)
	return out, true
}

var (
	globalCache   = &marketCache{}
	coinsCache    = &marketCache{}
	trendingCache = &marketCache{}
	gainersCache  = &marketCache{}
	chartCache    = &marketCache{}
)

// ─── Public accessors ─────────────────────────────────────────────────────────

// GetGlobalData returns cached global market stats + fear & greed as JSON.
func GetGlobalData() ([]byte, bool) { return globalCache.get() }

// GetTopCoins returns cached top-20 coins by market cap as JSON.
func GetTopCoins() ([]byte, bool) { return coinsCache.get() }

// GetTrending returns cached trending coins as JSON.
func GetTrending() ([]byte, bool) { return trendingCache.get() }

// GetTopGainers returns cached top gainers as JSON.
func GetTopGainers() ([]byte, bool) { return gainersCache.get() }

// GetChartData returns cached 7-day market cap + BTC price history as JSON.
func GetChartData() ([]byte, bool) { return chartCache.get() }

// ─── Service entry point ──────────────────────────────────────────────────────

// StartMarketDataService fetches all market data immediately then keeps it
// fresh in the background. Call once from main() as a goroutine.
func StartMarketDataService() {
	logger.Info("📊 Starting market data cache service...")

	// Warm up all caches — staggered to avoid CoinGecko rate limits.
	var wg sync.WaitGroup
	wg.Add(5)
	go func() { defer wg.Done(); refreshGlobal() }()
	go func() { defer wg.Done(); time.Sleep(2 * time.Second); refreshCoins() }()
	go func() { defer wg.Done(); time.Sleep(4 * time.Second); refreshTrending() }()
	go func() { defer wg.Done(); time.Sleep(6 * time.Second); refreshGainers() }()
	go func() { defer wg.Done(); time.Sleep(8 * time.Second); refreshChart() }()
	wg.Wait()
	logger.Info("✅ Market data cache warmed up")

	// Background refresh loops
	go runLoop("global+fng", 2*time.Minute, refreshGlobal)
	go runLoop("top-coins", 60*time.Second, refreshCoins)
	go runLoop("trending", 5*time.Minute, refreshTrending)
	go runLoop("gainers", 5*time.Minute, refreshGainers)
	go runLoop("chart", 10*time.Minute, refreshChart)
}

func runLoop(name string, interval time.Duration, fn func()) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for range t.C {
		fn()
		logger.Infof("📊 Market cache refreshed: %s", name)
	}
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

var httpClient = &http.Client{Timeout: 10 * time.Second}

func fetchURL(url string) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 OKO-Market-Cache/1.0")
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// refreshGlobal fetches CoinGecko global + alternative.me fear & greed and
// merges them into a single JSON object: { global: {...}, fearGreed: {...} }
func refreshGlobal() {
	cgData, err := fetchURL("https://api.coingecko.com/api/v3/global")
	if err != nil {
		logger.Warnf("⚠️ Market cache: CoinGecko global fetch failed: %v", err)
		return
	}

	fngData, err := fetchURL("https://api.alternative.me/fng/?limit=1")
	if err != nil {
		logger.Warnf("⚠️ Market cache: Fear & Greed fetch failed: %v", err)
		// Use empty object so global data still gets served
		fngData = []byte(`{"data":[{"value":"50","value_classification":"Neutral"}]}`)
	}

	// Wrap both payloads in a single envelope so the frontend gets one response.
	merged := append([]byte(`{"global":`), cgData...)
	merged = append(merged, []byte(`,"fearGreed":`)...)
	merged = append(merged, fngData...)
	merged = append(merged, '}')

	globalCache.set(merged)
}

func refreshCoins() {
	data, err := fetchURL(
		"https://api.coingecko.com/api/v3/coins/markets" +
			"?vs_currency=usd&order=market_cap_desc&per_page=20&page=1" +
			"&sparkline=false&price_change_percentage=24h,7d",
	)
	if err != nil {
		logger.Warnf("⚠️ Market cache: CoinGecko coins fetch failed: %v", err)
		return
	}
	coinsCache.set(data)
}

func refreshTrending() {
	data, err := fetchURL("https://api.coingecko.com/api/v3/search/trending")
	if err != nil {
		logger.Warnf("⚠️ Market cache: CoinGecko trending fetch failed: %v", err)
		return
	}

	// Parse and inject binance_symbol into each coin item.
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		// If parsing fails, serve raw data as-is
		trendingCache.set(data)
		return
	}
	if coins, ok := raw["coins"].([]interface{}); ok {
		for _, entry := range coins {
			if e, ok := entry.(map[string]interface{}); ok {
				if item, ok := e["item"].(map[string]interface{}); ok {
					if sym, ok := item["symbol"].(string); ok {
						item["binance_symbol"] = resolveTradingViewSymbol(sym)
					}
				}
			}
		}
	}
	out, err := json.Marshal(raw)
	if err != nil {
		trendingCache.set(data)
		return
	}
	trendingCache.set(out)
}

func refreshGainers() {
	// Fetch top 100 by market cap (free tier), then sort by 24h change server-side.
	data, err := fetchURL(
		"https://api.coingecko.com/api/v3/coins/markets" +
			"?vs_currency=usd&order=market_cap_desc&per_page=100&page=1" +
			"&sparkline=false&price_change_percentage=24h",
	)
	if err != nil {
		logger.Warnf("⚠️ Market cache: CoinGecko gainers fetch failed: %v", err)
		return
	}

	// Guard: CoinGecko returns an error object on rate limit instead of an array.
	if len(data) == 0 || data[0] != '[' {
		logger.Warnf("⚠️ Market cache: gainers unexpected response (rate limited?): %.120s", string(data))
		return
	}

	// Parse, sort by price_change_percentage_24h desc, keep top 5.
	var coins []map[string]interface{}
	if err := json.Unmarshal(data, &coins); err != nil {
		logger.Warnf("⚠️ Market cache: gainers parse failed: %v", err)
		return
	}
	sort.Slice(coins, func(i, j int) bool {
		vi, _ := coins[i]["price_change_percentage_24h"].(float64)
		vj, _ := coins[j]["price_change_percentage_24h"].(float64)
		return vi > vj
	})
	if len(coins) > 5 {
		coins = coins[:5]
	}
	// Inject resolved Binance symbol for the frontend chart switcher.
	for _, c := range coins {
		if sym, ok := c["symbol"].(string); ok {
			c["binance_symbol"] = resolveTradingViewSymbol(sym)
		}
	}
	out, err := json.Marshal(coins)
	if err != nil {
		logger.Warnf("⚠️ Market cache: gainers marshal failed: %v", err)
		return
	}
	gainersCache.set(out)
}

// refreshChart fetches 7-day BTC data in a single request and uses it for both charts.
// market_caps array → Market Cap chart; total_volumes (last 24 pts) → 24h Volume chart.
func refreshChart() {
	btc7d, err := fetchURL(
		"https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7",
	)
	if err != nil {
		logger.Warnf("⚠️ Market cache: chart fetch failed: %v", err)
		return
	}

	// Single request, same data used for both charts — frontend slices what it needs
	merged := append([]byte(`{"marketCap":`), btc7d...)
	merged = append(merged, []byte(`,"volume":`)...)
	merged = append(merged, btc7d...)
	merged = append(merged, '}')
	chartCache.set(merged)
}
