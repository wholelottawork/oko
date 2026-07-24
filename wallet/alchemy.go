package wallet

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/big"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

const (
	alchemyPortfolioBaseURL = "https://api.g.alchemy.com/data/v1"
	alchemyMaxPages         = 2
)

var alchemyNetworks = []string{"robinhood-mainnet", "eth-mainnet", "base-mainnet"}
var globalAlchemyKeySequence atomic.Uint64

type AlchemyClient struct {
	client               *http.Client
	apiKeys              []string
	baseURL              string
	pricesBaseURL        string
	geckoTerminalBaseURL string
	nextKey              *atomic.Uint64
}

func NewAlchemyClient(apiKeys string) *AlchemyClient {
	client := newAlchemyClient(
		apiKeys,
		alchemyPortfolioBaseURL,
		&http.Client{Timeout: 30 * time.Second},
	)
	client.nextKey = &globalAlchemyKeySequence
	return client
}

func newAlchemyClient(apiKeys, baseURL string, client *http.Client) *AlchemyClient {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	baseURL = strings.TrimRight(baseURL, "/")
	return &AlchemyClient{
		client:               client,
		apiKeys:              parseAlchemyAPIKeys(apiKeys),
		baseURL:              baseURL,
		pricesBaseURL:        alchemyPricesBaseURL(baseURL),
		geckoTerminalBaseURL: geckoTerminalAPIBaseURL,
		nextKey:              &atomic.Uint64{},
	}
}

func alchemyPricesBaseURL(portfolioBaseURL string) string {
	const portfolioSuffix = "/data/v1"
	if strings.HasSuffix(portfolioBaseURL, portfolioSuffix) {
		return strings.TrimSuffix(portfolioBaseURL, portfolioSuffix) + "/prices/v1"
	}
	return portfolioBaseURL
}

func parseAlchemyAPIKeys(value string) []string {
	seen := make(map[string]struct{})
	keys := make([]string, 0)
	for _, part := range strings.Split(value, ",") {
		key := strings.TrimSpace(part)
		if key == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		keys = append(keys, key)
	}
	return keys
}

type alchemyPortfolioRequest struct {
	Addresses           []alchemyPortfolioAddress `json:"addresses"`
	WithMetadata        bool                      `json:"withMetadata"`
	WithPrices          bool                      `json:"withPrices"`
	IncludeNativeTokens bool                      `json:"includeNativeTokens"`
	IncludeERC20Tokens  bool                      `json:"includeErc20Tokens"`
	PageKey             string                    `json:"pageKey,omitempty"`
}

type alchemyPortfolioAddress struct {
	Address  string   `json:"address"`
	Networks []string `json:"networks"`
}

type alchemyPortfolioResponse struct {
	Data struct {
		Tokens  []alchemyPortfolioToken `json:"tokens"`
		PageKey string                  `json:"pageKey"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type alchemyPortfolioToken struct {
	Address       string               `json:"address"`
	Network       string               `json:"network"`
	TokenAddress  string               `json:"tokenAddress"`
	TokenBalance  string               `json:"tokenBalance"`
	TokenMetadata alchemyTokenMetadata `json:"tokenMetadata"`
	TokenPrices   []alchemyTokenPrice  `json:"tokenPrices"`
	Error         *string              `json:"error"`
}

type alchemyTokenMetadata struct {
	Decimals *int    `json:"decimals"`
	Logo     *string `json:"logo"`
	Name     *string `json:"name"`
	Symbol   *string `json:"symbol"`
}

type alchemyTokenPrice struct {
	Currency string `json:"currency"`
	Value    string `json:"value"`
}

type alchemySymbolPriceResponse struct {
	Data []struct {
		Symbol string              `json:"symbol"`
		Prices []alchemyTokenPrice `json:"prices"`
		Error  *string             `json:"error"`
	} `json:"data"`
}

// GetAccountBalance fetches at most two enriched Portfolio API pages for the
// configured EVM networks and maps them to the wallet analyzer's balance model.
func (c *AlchemyClient) GetAccountBalance(address string) (*AccountBalanceResult, error) {
	if len(c.apiKeys) == 0 {
		return nil, fmt.Errorf("alchemy API key not configured")
	}

	request := alchemyPortfolioRequest{
		Addresses: []alchemyPortfolioAddress{{
			Address:  address,
			Networks: append([]string(nil), alchemyNetworks...),
		}},
		WithMetadata:        true,
		WithPrices:          true,
		IncludeNativeTokens: true,
		IncludeERC20Tokens:  true,
	}

	assets := make([]TokenBalance, 0)
	seen := make(map[string]struct{})
	totalBalanceUSD := 0.0

	for page := 0; page < alchemyMaxPages; page++ {
		response, err := c.fetchPortfolioPage(request)
		if err != nil {
			return nil, err
		}

		for _, token := range response.Data.Tokens {
			asset, balanceUSD, ok := normalizeAlchemyToken(token)
			if !ok {
				continue
			}

			dedupKey := token.Network + ":" + strings.ToLower(token.TokenAddress)
			if token.TokenAddress == "" {
				dedupKey += ":native"
			}
			if _, exists := seen[dedupKey]; exists {
				continue
			}
			seen[dedupKey] = struct{}{}

			assets = append(assets, asset)
			totalBalanceUSD += balanceUSD
		}

		if response.Data.PageKey == "" {
			break
		}
		request.PageKey = response.Data.PageKey
	}

	totalBalanceUSD += c.backfillMissingNativePrices(assets)
	geckoResult := backfillRobinhoodTokenPrices(c.client, c.geckoTerminalBaseURL, assets)
	totalBalanceUSD += geckoResult.AddedTotalUSD
	var removedTotalUSD float64
	assets, removedTotalUSD = removeWalletDust(assets, geckoResult.CheckedAddresses)
	totalBalanceUSD -= removedTotalUSD
	if totalBalanceUSD < 0 {
		totalBalanceUSD = 0
	}

	return &AccountBalanceResult{
		Assets:          assets,
		TotalBalanceUsd: strconv.FormatFloat(totalBalanceUSD, 'f', 2, 64),
	}, nil
}

func (c *AlchemyClient) fetchPortfolioPage(request alchemyPortfolioRequest) (*alchemyPortfolioResponse, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("encode alchemy request: %w", err)
	}

	start := int(c.nextKey.Add(1)-1) % len(c.apiKeys)
	var lastStatus int

	for attempt := 0; attempt < len(c.apiKeys); attempt++ {
		key := c.apiKeys[(start+attempt)%len(c.apiKeys)]
		endpoint := c.baseURL + "/" + url.PathEscape(key) + "/assets/tokens/by-address"
		req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("create alchemy request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.client.Do(req)
		if err != nil {
			if attempt+1 < len(c.apiKeys) {
				continue
			}
			return nil, fmt.Errorf("alchemy request failed")
		}

		responseBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
		resp.Body.Close()
		if readErr != nil {
			if attempt+1 < len(c.apiKeys) {
				continue
			}
			return nil, fmt.Errorf("read alchemy response: %w", readErr)
		}

		lastStatus = resp.StatusCode
		if shouldRotateAlchemyKey(resp.StatusCode) && attempt+1 < len(c.apiKeys) {
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("alchemy API returned status %d: %s", resp.StatusCode, safeAlchemyError(responseBody))
		}

		var result alchemyPortfolioResponse
		if err := json.Unmarshal(responseBody, &result); err != nil {
			return nil, fmt.Errorf("parse alchemy response: %w", err)
		}
		if result.Error != nil {
			return nil, fmt.Errorf("alchemy API error: %s", result.Error.Message)
		}
		return &result, nil
	}

	return nil, fmt.Errorf("alchemy API request failed after rotating keys (last status %d)", lastStatus)
}

// backfillMissingNativePrices makes native ETH valuation consistent across the
// scanned EVM chains. It first reuses a Portfolio price from another chain, then
// falls back to Alchemy's chain-agnostic Prices API by symbol.
func (c *AlchemyClient) backfillMissingNativePrices(assets []TokenBalance) float64 {
	prices := make(map[string]float64)
	missingSymbols := make(map[string]struct{})

	for i := range assets {
		if assets[i].TokenType != "native" {
			continue
		}
		symbol := strings.ToUpper(strings.TrimSpace(assets[i].TokenSymbol))
		price, _ := strconv.ParseFloat(assets[i].TokenPrice, 64)
		if price > 0 && !math.IsNaN(price) && !math.IsInf(price, 0) {
			prices[symbol] = price
		} else {
			missingSymbols[symbol] = struct{}{}
		}
	}

	for symbol := range missingSymbols {
		if _, found := prices[symbol]; found {
			continue
		}
		price, err := c.fetchTokenPriceBySymbol(symbol)
		if err == nil {
			prices[symbol] = price
		}
	}

	addedTotalUSD := 0.0
	for i := range assets {
		if assets[i].TokenType != "native" {
			continue
		}
		currentPrice, _ := strconv.ParseFloat(assets[i].TokenPrice, 64)
		if currentPrice > 0 {
			continue
		}
		price, found := prices[strings.ToUpper(strings.TrimSpace(assets[i].TokenSymbol))]
		if !found {
			continue
		}
		balance, err := strconv.ParseFloat(assets[i].Balance, 64)
		if err != nil || balance <= 0 {
			continue
		}
		balanceUSD := balance * price
		if math.IsNaN(balanceUSD) || math.IsInf(balanceUSD, 0) {
			continue
		}
		assets[i].TokenPrice = strconv.FormatFloat(price, 'f', -1, 64)
		assets[i].BalanceUsd = strconv.FormatFloat(balanceUSD, 'f', 2, 64)
		addedTotalUSD += balanceUSD
	}
	return addedTotalUSD
}

func (c *AlchemyClient) fetchTokenPriceBySymbol(symbol string) (float64, error) {
	start := int(c.nextKey.Add(1)-1) % len(c.apiKeys)
	var lastStatus int

	for attempt := 0; attempt < len(c.apiKeys); attempt++ {
		key := c.apiKeys[(start+attempt)%len(c.apiKeys)]
		endpoint, err := url.Parse(c.pricesBaseURL + "/" + url.PathEscape(key) + "/tokens/by-symbol")
		if err != nil {
			return 0, fmt.Errorf("create alchemy price URL: %w", err)
		}
		query := endpoint.Query()
		query.Add("symbols", symbol)
		endpoint.RawQuery = query.Encode()

		req, err := http.NewRequest(http.MethodGet, endpoint.String(), nil)
		if err != nil {
			return 0, fmt.Errorf("create alchemy price request: %w", err)
		}

		resp, err := c.client.Do(req)
		if err != nil {
			if attempt+1 < len(c.apiKeys) {
				continue
			}
			return 0, fmt.Errorf("alchemy price request failed")
		}

		responseBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		resp.Body.Close()
		if readErr != nil {
			if attempt+1 < len(c.apiKeys) {
				continue
			}
			return 0, fmt.Errorf("read alchemy price response: %w", readErr)
		}

		lastStatus = resp.StatusCode
		if shouldRotateAlchemyKey(resp.StatusCode) && attempt+1 < len(c.apiKeys) {
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return 0, fmt.Errorf("alchemy Prices API returned status %d: %s", resp.StatusCode, safeAlchemyError(responseBody))
		}

		var result alchemySymbolPriceResponse
		if err := json.Unmarshal(responseBody, &result); err != nil {
			return 0, fmt.Errorf("parse alchemy price response: %w", err)
		}
		for _, token := range result.Data {
			if !strings.EqualFold(token.Symbol, symbol) ||
				(token.Error != nil && strings.TrimSpace(*token.Error) != "") {
				continue
			}
			if price, ok := alchemyUSDPrice(token.Prices); ok {
				return price, nil
			}
		}
		return 0, fmt.Errorf("alchemy Prices API returned no USD price for %s", symbol)
	}

	return 0, fmt.Errorf("alchemy price request failed after rotating keys (last status %d)", lastStatus)
}

func shouldRotateAlchemyKey(status int) bool {
	return status == http.StatusUnauthorized ||
		status == http.StatusForbidden ||
		status == http.StatusRequestTimeout ||
		status == http.StatusTooManyRequests ||
		status >= http.StatusInternalServerError
}

func safeAlchemyError(body []byte) string {
	var response alchemyPortfolioResponse
	if err := json.Unmarshal(body, &response); err == nil && response.Error != nil {
		return truncateAlchemyError(response.Error.Message)
	}
	return truncateAlchemyError(strings.TrimSpace(string(body)))
}

func truncateAlchemyError(message string) string {
	const maxLength = 512
	if len(message) <= maxLength {
		return message
	}
	return message[:maxLength] + "..."
}

func normalizeAlchemyToken(token alchemyPortfolioToken) (TokenBalance, float64, bool) {
	if token.Error != nil && strings.TrimSpace(*token.Error) != "" {
		return TokenBalance{}, 0, false
	}

	name := stringValue(token.TokenMetadata.Name)
	symbol := stringValue(token.TokenMetadata.Symbol)
	decimals := token.TokenMetadata.Decimals
	tokenType := "erc20"

	if token.TokenAddress == "" {
		nativeName, nativeSymbol, nativeDecimals, ok := alchemyNativeMetadata(token.Network)
		if !ok {
			return TokenBalance{}, 0, false
		}
		if name == "" {
			name = nativeName
		}
		if symbol == "" {
			symbol = nativeSymbol
		}
		if decimals == nil {
			decimals = &nativeDecimals
		}
		tokenType = "native"
	}

	if name == "" || symbol == "" || decimals == nil || *decimals < 0 || *decimals > 255 {
		return TokenBalance{}, 0, false
	}

	rawBalance, ok := parseAlchemyBalance(token.TokenBalance)
	if !ok || rawBalance.Sign() <= 0 {
		return TokenBalance{}, 0, false
	}

	balance, balanceFloat, ok := formatAlchemyBalance(rawBalance, *decimals)
	if !ok || balanceFloat <= 0 {
		return TokenBalance{}, 0, false
	}

	price := 0.0
	balanceUSD := 0.0
	if usdPrice, hasPrice := alchemyUSDPrice(token.TokenPrices); hasPrice {
		price = usdPrice
		balanceUSD = balanceFloat * price
		if math.IsNaN(balanceUSD) || math.IsInf(balanceUSD, 0) {
			balanceUSD = 0
		}
	}

	blockchain, ok := alchemyBlockchain(token.Network)
	if !ok {
		return TokenBalance{}, 0, false
	}

	return TokenBalance{
		TokenName:       name,
		TokenSymbol:     symbol,
		Balance:         balance,
		BalanceUsd:      strconv.FormatFloat(balanceUSD, 'f', 2, 64),
		TokenPrice:      strconv.FormatFloat(price, 'f', -1, 64),
		Blockchain:      blockchain,
		ContractAddress: token.TokenAddress,
		Thumbnail:       stringValue(token.TokenMetadata.Logo),
		TokenDecimals:   *decimals,
		TokenType:       tokenType,
		HolderAddress:   token.Address,
	}, balanceUSD, true
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func parseAlchemyBalance(value string) (*big.Int, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, false
	}
	base := 10
	if strings.HasPrefix(value, "0x") || strings.HasPrefix(value, "0X") {
		value = value[2:]
		base = 16
	}
	if value == "" {
		return nil, false
	}
	balance, ok := new(big.Int).SetString(value, base)
	return balance, ok
}

func formatAlchemyBalance(raw *big.Int, decimals int) (string, float64, bool) {
	divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	ratio := new(big.Rat).SetFrac(raw, divisor)
	asFloat, _ := ratio.Float64()
	if math.IsNaN(asFloat) || math.IsInf(asFloat, 0) {
		return "", 0, false
	}

	if decimals == 0 {
		return raw.String(), asFloat, true
	}
	digits := raw.String()
	if len(digits) <= decimals {
		digits = strings.Repeat("0", decimals-len(digits)+1) + digits
	}
	point := len(digits) - decimals
	formatted := strings.TrimRight(digits[:point]+"."+digits[point:], "0")
	formatted = strings.TrimRight(formatted, ".")
	return formatted, asFloat, true
}

func alchemyUSDPrice(prices []alchemyTokenPrice) (float64, bool) {
	for _, price := range prices {
		if !strings.EqualFold(strings.TrimSpace(price.Currency), "usd") {
			continue
		}
		value, err := strconv.ParseFloat(strings.TrimSpace(price.Value), 64)
		if err == nil && value > 0 && !math.IsNaN(value) && !math.IsInf(value, 0) {
			return value, true
		}
	}
	return 0, false
}

func alchemyBlockchain(network string) (string, bool) {
	switch network {
	case "robinhood-mainnet":
		return "robinhood", true
	case "eth-mainnet":
		return "eth", true
	case "base-mainnet":
		return "base", true
	default:
		return "", false
	}
}

func alchemyNativeMetadata(network string) (string, string, int, bool) {
	switch network {
	case "robinhood-mainnet", "eth-mainnet", "base-mainnet":
		return "Ether", "ETH", 18, true
	default:
		return "", "", 0, false
	}
}
