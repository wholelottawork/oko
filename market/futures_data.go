package market

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"
)

const (
	binanceFuturesBaseURL = "https://fapi.binance.com"
	futuresDataCacheTTL   = 15 * time.Second
)

// FuturesTicker contains the subset of Binance ticker and premium-index data
// used by the data dashboard.
type FuturesTicker struct {
	LastPrice          string `json:"lastPrice"`
	PriceChangePercent string `json:"priceChangePercent"`
	LastFundingRate    string `json:"lastFundingRate,omitempty"`
}

type FuturesOpenInterest struct {
	OpenInterest string `json:"openInterest"`
}

type FuturesLongShortRatio struct {
	LongAccount  string `json:"longAccount"`
	ShortAccount string `json:"shortAccount"`
	Timestamp    int64  `json:"timestamp"`
}

type FuturesTakerRatio struct {
	BuyVol    string `json:"buyVol"`
	SellVol   string `json:"sellVol"`
	Timestamp int64  `json:"timestamp"`
}

type FuturesOIHistory struct {
	SumOpenInterest string `json:"sumOpenInterest"`
	Timestamp       int64  `json:"timestamp"`
}

// LiquidationLevel is an estimate, not exchange-reported liquidation data.
// Binance publishes aggregate open interest but not traders' entry prices and
// leverage distribution, so levels are projected across common leverage bands.
type LiquidationLevel struct {
	Price      float64 `json:"price"`
	Weight     float64 `json:"weight"`
	MaxWeight  float64 `json:"maxWeight"`
	IsLong     bool    `json:"isLong"`
	OIEstimate float64 `json:"oiEstimate"` // USD millions
}

type FuturesData struct {
	Symbol     string                  `json:"sym"`
	Ticker     FuturesTicker           `json:"ticker"`
	OIData     FuturesOpenInterest     `json:"oiData"`
	LSRatio    []FuturesLongShortRatio `json:"lsRatio"`
	TakerRatio []FuturesTakerRatio    `json:"takerRatio"`
	OIHist     []FuturesOIHistory      `json:"oiHist"`
	Levels     []LiquidationLevel      `json:"levels"`
	Estimated  bool                    `json:"estimated"`
}

type futuresCacheEntry struct {
	data      *FuturesData
	fetchedAt time.Time
}

var (
	futuresCacheMu sync.RWMutex
	futuresCache   = make(map[string]futuresCacheEntry)
)

// GetFuturesData returns public Binance futures statistics and estimated
// liquidation levels. No exchange credentials are required.
func GetFuturesData(ctx context.Context, symbol string) (*FuturesData, error) {
	symbol, err := normalizeFuturesSymbol(symbol)
	if err != nil {
		return nil, err
	}

	futuresCacheMu.RLock()
	cached, ok := futuresCache[symbol]
	futuresCacheMu.RUnlock()
	if ok && time.Since(cached.fetchedAt) < futuresDataCacheTTL {
		return cached.data, nil
	}

	query := url.Values{"symbol": {symbol}}
	periodQuery := url.Values{"symbol": {symbol}, "period": {"5m"}, "limit": {"12"}}
	onePeriodQuery := url.Values{"symbol": {symbol}, "period": {"5m"}, "limit": {"1"}}

	var ticker FuturesTicker
	var premium struct {
		LastFundingRate string `json:"lastFundingRate"`
	}
	var oi FuturesOpenInterest
	var lsRatio []FuturesLongShortRatio
	var takerRatio []FuturesTakerRatio
	var oiHist []FuturesOIHistory

	var tickerErr, premiumErr, oiErr, lsErr, takerErr, histErr error
	var wg sync.WaitGroup
	wg.Add(6)
	go func() {
		defer wg.Done()
		tickerErr = fetchBinanceFuturesJSON(ctx, "/fapi/v1/ticker/24hr", query, &ticker)
	}()
	go func() {
		defer wg.Done()
		premiumErr = fetchBinanceFuturesJSON(ctx, "/fapi/v1/premiumIndex", query, &premium)
	}()
	go func() {
		defer wg.Done()
		oiErr = fetchBinanceFuturesJSON(ctx, "/fapi/v1/openInterest", query, &oi)
	}()
	go func() {
		defer wg.Done()
		lsErr = fetchBinanceFuturesJSON(ctx, "/futures/data/globalLongShortAccountRatio", onePeriodQuery, &lsRatio)
	}()
	go func() {
		defer wg.Done()
		takerErr = fetchBinanceFuturesJSON(ctx, "/futures/data/takerlongshortRatio", onePeriodQuery, &takerRatio)
	}()
	go func() {
		defer wg.Done()
		histErr = fetchBinanceFuturesJSON(ctx, "/futures/data/openInterestHist", periodQuery, &oiHist)
	}()
	wg.Wait()

	// Price and current open interest are required to construct the map. The
	// remaining datasets enrich the signal panel and can degrade independently.
	if tickerErr != nil {
		return nil, fmt.Errorf("fetch ticker for %s: %w", symbol, tickerErr)
	}
	if oiErr != nil {
		return nil, fmt.Errorf("fetch open interest for %s: %w", symbol, oiErr)
	}
	if premiumErr == nil {
		ticker.LastFundingRate = premium.LastFundingRate
	}
	if lsErr != nil {
		lsRatio = []FuturesLongShortRatio{}
	}
	if takerErr != nil {
		takerRatio = []FuturesTakerRatio{}
	}
	if histErr != nil {
		oiHist = []FuturesOIHistory{}
	}

	markPrice, err := parsePositiveFloat(ticker.LastPrice)
	if err != nil {
		return nil, fmt.Errorf("invalid ticker price for %s: %w", symbol, err)
	}
	openInterest, err := parsePositiveFloat(oi.OpenInterest)
	if err != nil {
		return nil, fmt.Errorf("invalid open interest for %s: %w", symbol, err)
	}
	longShare := 0.5
	if len(lsRatio) > 0 {
		longValue, longErr := parsePositiveFloat(lsRatio[0].LongAccount)
		shortValue, shortErr := parsePositiveFloat(lsRatio[0].ShortAccount)
		if longErr == nil && shortErr == nil && longValue+shortValue > 0 {
			longShare = longValue / (longValue + shortValue)
		}
	}

	data := &FuturesData{
		Symbol:     symbol,
		Ticker:     ticker,
		OIData:     oi,
		LSRatio:    lsRatio,
		TakerRatio: takerRatio,
		OIHist:     oiHist,
		Levels:     buildLiquidationLevels(markPrice, openInterest*markPrice, longShare),
		Estimated:  true,
	}

	futuresCacheMu.Lock()
	futuresCache[symbol] = futuresCacheEntry{data: data, fetchedAt: time.Now()}
	futuresCacheMu.Unlock()
	return data, nil
}

func fetchBinanceFuturesJSON(ctx context.Context, path string, query url.Values, destination any) error {
	requestURL := binanceFuturesBaseURL + path
	if encoded := query.Encode(); encoded != "" {
		requestURL += "?" + encoded
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "OKO-Futures-Dashboard/1.0")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("Binance returned %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(destination); err != nil {
		return fmt.Errorf("decode Binance response: %w", err)
	}
	return nil
}

func normalizeFuturesSymbol(symbol string) (string, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	if symbol == "" {
		symbol = "BTC"
	}
	if !strings.HasSuffix(symbol, "USDT") {
		symbol += "USDT"
	}
	if len(symbol) < 5 || len(symbol) > 24 {
		return "", fmt.Errorf("invalid futures symbol")
	}
	for _, r := range symbol {
		if !unicode.IsUpper(r) && !unicode.IsDigit(r) {
			return "", fmt.Errorf("invalid futures symbol")
		}
	}
	return symbol, nil
}

func parsePositiveFloat(value string) (float64, error) {
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil || parsed <= 0 || math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return 0, fmt.Errorf("expected a positive number")
	}
	return parsed, nil
}

func buildLiquidationLevels(markPrice, openInterestUSD, longShare float64) []LiquidationLevel {
	if markPrice <= 0 || openInterestUSD <= 0 {
		return []LiquidationLevel{}
	}
	longShare = math.Max(0.05, math.Min(0.95, longShare))
	shortShare := 1 - longShare

	// Approximate liquidation distances for common leverage bands. Weighting is
	// deliberately concentrated around 20x-50x, where crypto perpetual leverage
	// is commonly clustered. These are projections, not observed user positions.
	leverage := []float64{5, 10, 15, 20, 25, 50, 75, 100}
	bucketWeight := []float64{0.04, 0.09, 0.13, 0.17, 0.18, 0.20, 0.12, 0.07}
	levels := make([]LiquidationLevel, 0, len(leverage)*2)
	maxWeight := 0.0

	for i, lev := range leverage {
		// A small maintenance-margin allowance keeps the estimate inside the
		// theoretical 1/leverage bankruptcy distance.
		distance := math.Max(0.003, 1/lev-0.004)
		longOI := openInterestUSD * longShare * bucketWeight[i] / 1e6
		shortOI := openInterestUSD * shortShare * bucketWeight[i] / 1e6
		levels = append(levels,
			LiquidationLevel{Price: markPrice * (1 - distance), Weight: longOI, IsLong: true, OIEstimate: longOI},
			LiquidationLevel{Price: markPrice * (1 + distance), Weight: shortOI, IsLong: false, OIEstimate: shortOI},
		)
		maxWeight = math.Max(maxWeight, math.Max(longOI, shortOI))
	}
	for i := range levels {
		levels[i].MaxWeight = maxWeight
	}
	sort.Slice(levels, func(i, j int) bool { return levels[i].Price < levels[j].Price })
	return levels
}
