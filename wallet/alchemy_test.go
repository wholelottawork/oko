package wallet

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync"
	"testing"
)

func TestAlchemyGetAccountBalanceFiltersNormalizesAndStopsAfterTwoPages(t *testing.T) {
	type capturedRequest struct {
		key  string
		body alchemyPortfolioRequest
	}

	var (
		mu       sync.Mutex
		requests []capturedRequest
	)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request alchemyPortfolioRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Errorf("decode request: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) != 4 {
			t.Errorf("unexpected path %q", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}

		mu.Lock()
		requests = append(requests, capturedRequest{key: parts[0], body: request})
		call := len(requests)
		mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		switch call {
		case 1:
			_, _ = w.Write([]byte(`{
				"data": {
					"tokens": [
						{
							"address": "0xowner",
							"network": "eth-mainnet",
							"tokenAddress": null,
							"tokenBalance": "0xde0b6b3a7640000",
							"tokenMetadata": {"decimals": null, "logo": null, "name": null, "symbol": null},
							"tokenPrices": [{"currency": "usd", "value": "2000"}],
							"error": null
						},
						{
							"address": "0xowner",
							"network": "robinhood-mainnet",
							"tokenAddress": "0xgood",
							"tokenBalance": "0x2625a0",
							"tokenMetadata": {"decimals": 6, "logo": "logo", "name": "Good Token", "symbol": "GOOD"},
							"tokenPrices": [{"currency": "usd", "value": "4"}],
							"error": null
						},
						{
							"network": "eth-mainnet",
							"tokenAddress": "0xdust",
							"tokenBalance": "0x1",
							"tokenMetadata": {"decimals": 6, "name": "Dust", "symbol": "DUST"},
							"tokenPrices": [{"currency": "usd", "value": "1"}]
						},
						{
							"network": "eth-mainnet",
							"tokenAddress": "0xnameless",
							"tokenBalance": "0xf4240",
							"tokenMetadata": {"decimals": 6, "name": "", "symbol": "NONE"},
							"tokenPrices": [{"currency": "usd", "value": "1"}]
						},
						{
							"network": "eth-mainnet",
							"tokenAddress": "0xpriceless",
							"tokenBalance": "0xf4240",
							"tokenMetadata": {"decimals": 6, "name": "Priceless", "symbol": "ZERO"},
							"tokenPrices": [{"currency": "usd", "value": "0"}]
						},
						{
							"network": "eth-mainnet",
							"tokenAddress": "0xzero",
							"tokenBalance": "0x0",
							"tokenMetadata": {"decimals": 6, "name": "Zero Balance", "symbol": "ZERO"},
							"tokenPrices": [{"currency": "usd", "value": "10"}]
						}
					],
					"pageKey": "next-page"
				}
			}`))
		case 2:
			_, _ = w.Write([]byte(`{
				"data": {
					"tokens": [
						{
							"address": "0xowner",
							"network": "base-mainnet",
							"tokenAddress": "0xbase",
							"tokenBalance": "0x12c",
							"tokenMetadata": {"decimals": 2, "name": "Base Token", "symbol": "BASE"},
							"tokenPrices": [{"currency": "USD", "value": "2"}]
						}
					],
					"pageKey": "ignored-third-page"
				}
			}`))
		default:
			t.Errorf("unexpected third request")
			_, _ = w.Write([]byte(`{"data":{"tokens":[]}}`))
		}
	}))
	defer server.Close()

	client := newAlchemyClient(" key-a, key-b, key-a ", server.URL, server.Client())
	result, err := client.GetAccountBalance("0xowner")
	if err != nil {
		t.Fatalf("GetAccountBalance returned error: %v", err)
	}

	if result.TotalBalanceUsd != "2016.00" {
		t.Fatalf("total USD = %q, want 2016.00", result.TotalBalanceUsd)
	}
	if len(result.Assets) != 5 {
		t.Fatalf("asset count = %d, want 5: %#v", len(result.Assets), result.Assets)
	}

	native := result.Assets[0]
	if native.TokenName != "Ether" || native.TokenSymbol != "ETH" || native.Balance != "1" ||
		native.Blockchain != "eth" || native.TokenType != "native" {
		t.Errorf("unexpected native asset: %#v", native)
	}

	robinhood := result.Assets[1]
	if robinhood.Balance != "2.5" || robinhood.BalanceUsd != "10.00" ||
		robinhood.Blockchain != "robinhood" || robinhood.TokenType != "erc20" {
		t.Errorf("unexpected Robinhood asset: %#v", robinhood)
	}

	dust := result.Assets[2]
	if dust.TokenSymbol != "DUST" || dust.Balance != "0.000001" || dust.BalanceUsd != "0.00" {
		t.Errorf("unexpected dust asset: %#v", dust)
	}

	unpriced := result.Assets[3]
	if unpriced.TokenSymbol != "ZERO" || unpriced.TokenPrice != "0" || unpriced.BalanceUsd != "0.00" {
		t.Errorf("unexpected unpriced asset: %#v", unpriced)
	}

	base := result.Assets[4]
	if base.Balance != "3" || base.BalanceUsd != "6.00" || base.Blockchain != "base" {
		t.Errorf("unexpected Base asset: %#v", base)
	}

	mu.Lock()
	defer mu.Unlock()
	if len(requests) != 2 {
		t.Fatalf("request count = %d, want 2", len(requests))
	}
	if requests[0].key != "key-a" || requests[1].key != "key-b" {
		t.Fatalf("rotated keys = %q, %q; want key-a, key-b", requests[0].key, requests[1].key)
	}
	if requests[0].body.PageKey != "" || requests[1].body.PageKey != "next-page" {
		t.Fatalf("page keys = %q, %q", requests[0].body.PageKey, requests[1].body.PageKey)
	}
	if !requests[0].body.WithMetadata || !requests[0].body.WithPrices ||
		!requests[0].body.IncludeNativeTokens || !requests[0].body.IncludeERC20Tokens {
		t.Fatalf("required Portfolio flags were not all enabled: %#v", requests[0].body)
	}
	if got := requests[0].body.Addresses[0].Networks; !reflect.DeepEqual(got, alchemyNetworks) {
		t.Fatalf("networks = %#v, want %#v", got, alchemyNetworks)
	}
}

func TestAlchemyRotatesKeyAfterRateLimit(t *testing.T) {
	var (
		mu   sync.Mutex
		keys []string
	)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := strings.Split(strings.Trim(r.URL.Path, "/"), "/")[0]
		mu.Lock()
		keys = append(keys, key)
		mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		if key == "limited-key" {
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"message":"rate limited"}}`))
			return
		}
		_, _ = w.Write([]byte(`{"data":{"tokens":[]}}`))
	}))
	defer server.Close()

	client := newAlchemyClient("limited-key,healthy-key", server.URL, server.Client())
	if _, err := client.GetAccountBalance("0xowner"); err != nil {
		t.Fatalf("GetAccountBalance returned error: %v", err)
	}

	mu.Lock()
	defer mu.Unlock()
	if !reflect.DeepEqual(keys, []string{"limited-key", "healthy-key"}) {
		t.Fatalf("keys used = %#v", keys)
	}
}

func TestAlchemyBackfillsNativePriceFromAnotherChain(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if r.Method != http.MethodPost {
			t.Errorf("unexpected fallback price request: %s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": {
				"tokens": [
					{
						"address": "0xowner",
						"network": "robinhood-mainnet",
						"tokenAddress": null,
						"tokenBalance": "0x1bc16d674ec80000",
						"tokenMetadata": {"decimals": null, "name": null, "symbol": null},
						"tokenPrices": []
					},
					{
						"address": "0xowner",
						"network": "base-mainnet",
						"tokenAddress": null,
						"tokenBalance": "0xde0b6b3a7640000",
						"tokenMetadata": {"decimals": null, "name": null, "symbol": null},
						"tokenPrices": [{"currency": "usd", "value": "2500"}]
					}
				]
			}
		}`))
	}))
	defer server.Close()

	client := newAlchemyClient("key", server.URL, server.Client())
	result, err := client.GetAccountBalance("0xowner")
	if err != nil {
		t.Fatalf("GetAccountBalance returned error: %v", err)
	}

	if requestCount != 1 {
		t.Fatalf("request count = %d, want 1", requestCount)
	}
	if len(result.Assets) != 2 {
		t.Fatalf("asset count = %d, want 2", len(result.Assets))
	}
	if result.Assets[0].Blockchain != "robinhood" ||
		result.Assets[0].TokenPrice != "2500" ||
		result.Assets[0].BalanceUsd != "5000.00" {
		t.Fatalf("Robinhood native price was not backfilled: %#v", result.Assets[0])
	}
	if result.TotalBalanceUsd != "7500.00" {
		t.Fatalf("total USD = %q, want 7500.00", result.TotalBalanceUsd)
	}
}

func TestAlchemyBackfillsNativePriceFromPricesAPI(t *testing.T) {
	var requests []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests = append(requests, r.Method+" "+r.URL.Path+"?"+r.URL.RawQuery)
		w.Header().Set("Content-Type", "application/json")

		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/assets/tokens/by-address"):
			_, _ = w.Write([]byte(`{
				"data": {
					"tokens": [{
						"address": "0xowner",
						"network": "robinhood-mainnet",
						"tokenAddress": null,
						"tokenBalance": "0x8ac7230489e80000",
						"tokenMetadata": {"decimals": null, "name": null, "symbol": null},
						"tokenPrices": []
					}]
				}
			}`))
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/tokens/by-symbol"):
			if got := r.URL.Query().Get("symbols"); got != "ETH" {
				t.Errorf("price symbol = %q, want ETH", got)
			}
			_, _ = w.Write([]byte(`{
				"data": [{
					"symbol": "ETH",
					"prices": [{"currency": "USD", "value": "3000"}],
					"error": null
				}]
			}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	client := newAlchemyClient("key", server.URL, server.Client())
	result, err := client.GetAccountBalance("0xowner")
	if err != nil {
		t.Fatalf("GetAccountBalance returned error: %v", err)
	}

	if len(requests) != 2 {
		t.Fatalf("requests = %#v, want Portfolio + Prices API", requests)
	}
	if len(result.Assets) != 1 ||
		result.Assets[0].TokenPrice != "3000" ||
		result.Assets[0].BalanceUsd != "30000.00" {
		t.Fatalf("unexpected Robinhood native asset: %#v", result.Assets)
	}
	if result.TotalBalanceUsd != "30000.00" {
		t.Fatalf("total USD = %q, want 30000.00", result.TotalBalanceUsd)
	}
}

func TestAlchemyRejectsMissingKeys(t *testing.T) {
	client := newAlchemyClient(" , , ", "http://unused", http.DefaultClient)
	if _, err := client.GetAccountBalance("0xowner"); err == nil {
		t.Fatal("expected missing-key error")
	}
}

func TestBuildUserPromptIncludesUnpricedHoldings(t *testing.T) {
	prompt := buildUserPrompt(&AccountBalanceResult{
		TotalBalanceUsd: "10.00",
		Assets: []TokenBalance{
			{
				TokenName:   "Priced",
				TokenSymbol: "USD",
				Balance:     "10",
				BalanceUsd:  "10.00",
				TokenPrice:  "1",
				Blockchain:  "base",
			},
			{
				TokenName:   "Unpriced",
				TokenSymbol: "UNKNOWN",
				Balance:     "25",
				BalanceUsd:  "0.00",
				TokenPrice:  "0",
				Blockchain:  "robinhood",
			},
			{
				TokenName:   "Priced Dust",
				TokenSymbol: "DUST",
				Balance:     "0.01",
				BalanceUsd:  "0.01",
				TokenPrice:  "1",
				Blockchain:  "eth",
			},
		},
	}, "0xowner")

	if !strings.Contains(prompt, "Unpriced (UNKNOWN)") ||
		!strings.Contains(prompt, "Price/value unavailable") {
		t.Fatalf("unpriced holding missing from prompt:\n%s", prompt)
	}
	if strings.Contains(prompt, "Priced Dust (DUST)") {
		t.Fatalf("priced dust should remain excluded:\n%s", prompt)
	}
}
