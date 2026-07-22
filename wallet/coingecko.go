package wallet

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"oko/logger"
)

const coingeckoBaseURL = "https://api.coingecko.com/api/v3"

// Platform mapping from our chain IDs to CoinGecko platform IDs
var platformMap = map[string]string{
	"eth":      "ethereum",
	"bsc":      "binance-smart-chain",
	"polygon":  "polygon-pos",
	"arbitrum": "arbitrum-one",
	"base":     "base",
	"optimism": "optimism",
	"solana":   "solana",
}

// TokenMarketData holds price, 24h change, and market cap from CoinGecko
type TokenMarketData struct {
	Price     float64
	Change24h float64
	MarketCap float64
}

// CoinGeckoClient calls the CoinGecko API for token price data
type CoinGeckoClient struct {
	client *http.Client
	apiKey string
}

// NewCoinGeckoClient creates a CoinGecko client. apiKey can be empty for free tier.
func NewCoinGeckoClient(apiKey string) *CoinGeckoClient {
	return &CoinGeckoClient{
		client: &http.Client{Timeout: 15 * time.Second},
		apiKey: strings.TrimSpace(apiKey),
	}
}

// toCoinGeckoPlatform maps our blockchain ID to CoinGecko platform ID
func toCoinGeckoPlatform(blockchain string) string {
	if p, ok := platformMap[strings.ToLower(blockchain)]; ok {
		return p
	}
	return strings.ToLower(blockchain)
}

// GetTokenMarketData fetches price, 24h change, and market cap for tokens in batch.
// platform is our blockchain ID (eth, bsc, solana, etc). contractAddresses are comma-separated.
func (c *CoinGeckoClient) GetTokenMarketData(platform string, contractAddresses []string) (map[string]TokenMarketData, error) {
	if len(contractAddresses) == 0 {
		return nil, nil
	}

	plat := toCoinGeckoPlatform(platform)
	addrList := make([]string, len(contractAddresses))
	for i, addr := range contractAddresses {
		addrList[i] = strings.ToLower(strings.TrimSpace(addr))
	}
	contractsParam := strings.Join(addrList, ",")

	u, err := url.Parse(coingeckoBaseURL + "/simple/token_price/" + plat)
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("contract_addresses", contractsParam)
	q.Set("vs_currencies", "usd")
	q.Set("include_24hr_change", "true")
	q.Set("include_market_cap", "true")
	u.RawQuery = q.Encode()

	req, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	if c.apiKey != "" {
		req.Header.Set("x-cg-demo-api-key", c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("coingecko request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("coingecko returned %d: %s", resp.StatusCode, string(body))
	}

	var raw map[string]struct {
		Usd          float64 `json:"usd"`
		Usd24hChange float64 `json:"usd_24h_change"`
		UsdMarketCap float64 `json:"usd_market_cap"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("parse coingecko response: %w", err)
	}

	out := make(map[string]TokenMarketData)
	for addr, v := range raw {
		out[addr] = TokenMarketData{
			Price:     v.Usd,
			Change24h: v.Usd24hChange,
			MarketCap: v.UsdMarketCap,
		}
	}
	return out, nil
}

// pricePoint is [timestamp_ms, price]
type pricePoint [2]float64

// marketChartResponse is the response from /coins/{id}/contract/{addr}/market_chart
type marketChartResponse struct {
	Prices [][]float64 `json:"prices"`
}

// GetPriceHistory fetches historical prices for a token. Returns [timestamp_ms, price] pairs.
// Used to compute 7d and 30d change for top holdings.
func (c *CoinGeckoClient) GetPriceHistory(platform string, contractAddress string, days int) ([]pricePoint, error) {
	plat := toCoinGeckoPlatform(platform)
	addr := strings.ToLower(strings.TrimSpace(contractAddress))

	u, err := url.Parse(fmt.Sprintf("%s/coins/%s/contract/%s/market_chart", coingeckoBaseURL, plat, addr))
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("vs_currency", "usd")
	q.Set("days", fmt.Sprintf("%d", days))
	u.RawQuery = q.Encode()

	req, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	if c.apiKey != "" {
		req.Header.Set("x-cg-demo-api-key", c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("coingecko market_chart: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("coingecko market_chart returned %d: %s", resp.StatusCode, string(body))
	}

	var m marketChartResponse
	if err := json.Unmarshal(body, &m); err != nil {
		return nil, fmt.Errorf("parse market_chart: %w", err)
	}

	points := make([]pricePoint, 0, len(m.Prices))
	for _, p := range m.Prices {
		if len(p) >= 2 {
			points = append(points, pricePoint{p[0], p[1]})
		}
	}
	return points, nil
}

// ComputeChangeFromHistory computes percent change over the given duration.
// fromAgo is how far back to measure (e.g. 7*24*time.Hour for 7d, 30*24*time.Hour for 30d).
// Uses the last (newest) point as "now" and finds the closest point to (now - fromAgo) as start.
func ComputeChangeFromHistory(points []pricePoint, fromAgo time.Duration) float64 {
	if len(points) < 2 {
		return 0
	}
	newest := time.UnixMilli(int64(points[len(points)-1][0]))
	targetStart := newest.Add(-fromAgo)
	priceEnd := points[len(points)-1][1]

	var priceStart float64
	var bestDelta int64 = 1 << 62
	for _, p := range points {
		t := time.UnixMilli(int64(p[0]))
		delta := t.Sub(targetStart).Abs().Milliseconds()
		if delta < bestDelta {
			bestDelta = delta
			priceStart = p[1]
		}
	}
	if priceStart == 0 {
		return 0
	}
	return ((priceEnd - priceStart) / priceStart) * 100
}

// EnrichWithCoinGecko adds 24h/7d/30d change and market cap to tokens.
// Only enriches tokens with value >= minTokenValueUsd. If apiKey is empty, no-op.
func EnrichWithCoinGecko(result *AccountBalanceResult, apiKey string) {
	if result == nil || apiKey == "" {
		return
	}

	// Filter and sort by value (same as analyzer)
	assets := make([]*TokenBalance, 0)
	for i := range result.Assets {
		v, _ := strconv.ParseFloat(result.Assets[i].BalanceUsd, 64)
		if v >= minTokenValueUsd && result.Assets[i].ContractAddress != "" {
			assets = append(assets, &result.Assets[i])
		}
	}
	if len(assets) == 0 {
		return
	}
	sort.Slice(assets, func(i, j int) bool {
		vi, _ := strconv.ParseFloat(assets[i].BalanceUsd, 64)
		vj, _ := strconv.ParseFloat(assets[j].BalanceUsd, 64)
		return vi > vj
	})

	cg := NewCoinGeckoClient(apiKey)

	// Group by blockchain
	byChain := make(map[string][]*TokenBalance)
	for _, a := range assets {
		chain := strings.ToLower(a.Blockchain)
		byChain[chain] = append(byChain[chain], a)
	}

	// Batch 24h + market cap per chain
	for chain, tokens := range byChain {
		addrs := make([]string, 0, len(tokens))
		for _, t := range tokens {
			addrs = append(addrs, t.ContractAddress)
		}
		data, err := cg.GetTokenMarketData(chain, addrs)
		if err != nil {
			logger.Infof("CoinGecko GetTokenMarketData %s: %v", chain, err)
			continue
		}
		enriched := 0
		for _, t := range tokens {
			// EVM addresses: CoinGecko returns lowercase. Solana: preserve original case.
			key := t.ContractAddress
			if strings.HasPrefix(key, "0x") {
				key = strings.ToLower(key)
			}
			var found bool
			if d, ok := data[key]; ok {
				t.Change24h = &d.Change24h
				t.MarketCap = &d.MarketCap
				enriched++
				found = true
			}
			// Fallback: try opposite case for Solana (CoinGecko may normalize)
			if !found && !strings.HasPrefix(t.ContractAddress, "0x") {
				keyAlt := strings.ToLower(t.ContractAddress)
				if d, ok := data[keyAlt]; ok {
					t.Change24h = &d.Change24h
					t.MarketCap = &d.MarketCap
					enriched++
				}
			}
		}
		logger.Infof("CoinGecko %s: enriched %d/%d tokens with 24h+mcap", chain, enriched, len(tokens))
	}

	// Top 5: 7d/30d from 30-day history
	topN := 5
	if len(assets) < topN {
		topN = len(assets)
	}
	historyEnriched := 0
	for i := 0; i < topN; i++ {
		a := assets[i]
		points, err := cg.GetPriceHistory(a.Blockchain, a.ContractAddress, 30)
		if err != nil {
			addrPreview := a.ContractAddress
			if len(addrPreview) > 12 {
				addrPreview = addrPreview[:12] + "..."
			}
			logger.Infof("CoinGecko GetPriceHistory %s %s: %v", a.TokenSymbol, addrPreview, err)
			continue
		}
		if len(points) < 2 {
			continue
		}
		ch7 := ComputeChangeFromHistory(points, 7*24*time.Hour)
		ch30 := ComputeChangeFromHistory(points, 30*24*time.Hour)
		a.Change7d = &ch7
		a.Change30d = &ch30
		historyEnriched++
	}
	logger.Infof("CoinGecko: enriched %d top tokens with 7d/30d history", historyEnriched)
}
