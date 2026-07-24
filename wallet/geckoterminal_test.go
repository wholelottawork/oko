package wallet

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestBackfillRobinhoodTokenPrices(t *testing.T) {
	const (
		unpricedAddress = "0x1111111111111111111111111111111111111111"
		pricedAddress   = "0x2222222222222222222222222222222222222222"
		baseAddress     = "0x3333333333333333333333333333333333333333"
	)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("method = %s, want GET", r.Method)
		}
		if !strings.HasSuffix(r.URL.Path, "/"+unpricedAddress) {
			t.Errorf("path = %q, want only unpriced Robinhood address", r.URL.Path)
		}
		if r.URL.Query().Get("include") != "top_pools" {
			t.Errorf("include = %q, want top_pools", r.URL.Query().Get("include"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [{
				"attributes": {
					"address": "0x1111111111111111111111111111111111111111",
					"price_usd": "2.5"
				},
				"relationships": {
					"top_pools": {
						"data": [{"id": "robinhood_0xpool"}]
					}
				}
			}],
			"included": [{
				"id": "robinhood_0xpool",
				"type": "pool",
				"attributes": {
					"reserve_in_usd": "10000",
					"volume_usd": {"h24": "250"}
				}
			}]
		}`))
	}))
	defer server.Close()

	assets := []TokenBalance{
		{
			TokenSymbol:     "MEME",
			Balance:         "2",
			BalanceUsd:      "0.00",
			TokenPrice:      "0",
			Blockchain:      "robinhood",
			ContractAddress: unpricedAddress,
			TokenType:       "erc20",
		},
		{
			TokenSymbol:     "KNOWN",
			Balance:         "3",
			BalanceUsd:      "3.00",
			TokenPrice:      "1",
			Blockchain:      "robinhood",
			ContractAddress: pricedAddress,
			TokenType:       "erc20",
		},
		{
			TokenSymbol:     "BASE",
			Balance:         "4",
			BalanceUsd:      "0.00",
			TokenPrice:      "0",
			Blockchain:      "base",
			ContractAddress: baseAddress,
			TokenType:       "erc20",
		},
	}

	result := backfillRobinhoodTokenPrices(server.Client(), server.URL, assets)
	if result.AddedTotalUSD != 5 {
		t.Fatalf("added total = %v, want 5", result.AddedTotalUSD)
	}
	if _, checked := result.CheckedAddresses[unpricedAddress]; !checked {
		t.Fatalf("successful GeckoTerminal address was not marked checked")
	}
	if assets[0].TokenPrice != "2.5" || assets[0].BalanceUsd != "5.00" {
		t.Fatalf("unpriced Robinhood token was not enriched: %#v", assets[0])
	}
	if assets[1].TokenPrice != "1" || assets[1].BalanceUsd != "3.00" {
		t.Fatalf("existing price was changed: %#v", assets[1])
	}
	if assets[2].TokenPrice != "0" || assets[2].BalanceUsd != "0.00" {
		t.Fatalf("non-Robinhood token was changed: %#v", assets[2])
	}
}

func TestBackfillRejectsIlliquidOrInactiveRobinhoodPrices(t *testing.T) {
	const (
		illiquidAddress = "0x47d1d5c9a4be6d9c7bd8d49e55d52196ffbd7777"
		inactiveAddress = "0x5555555555555555555555555555555555555555"
	)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{
					"attributes": {
						"address": "0x47d1d5c9a4be6d9c7bd8d49e55d52196ffbd7777",
						"price_usd": "93271671507260000"
					},
					"relationships": {
						"top_pools": {"data": [{"id": "robinhood_0xilliquid"}]}
					}
				},
				{
					"attributes": {
						"address": "0x5555555555555555555555555555555555555555",
						"price_usd": "1.25"
					},
					"relationships": {
						"top_pools": {"data": [{"id": "robinhood_0xinactive"}]}
					}
				}
			],
			"included": [
				{
					"id": "robinhood_0xilliquid",
					"type": "pool",
					"attributes": {
						"reserve_in_usd": "0.1936",
						"volume_usd": {"h24": "100"}
					}
				},
				{
					"id": "robinhood_0xinactive",
					"type": "pool",
					"attributes": {
						"reserve_in_usd": "25000",
						"volume_usd": {"h24": "0"}
					}
				}
			]
		}`))
	}))
	defer server.Close()

	assets := []TokenBalance{
		{
			TokenSymbol:     "MESSI",
			Balance:         "165386.728944233319759872",
			BalanceUsd:      "0.00",
			TokenPrice:      "0",
			Blockchain:      "robinhood",
			ContractAddress: illiquidAddress,
			TokenType:       "erc20",
		},
		{
			TokenSymbol:     "STALE",
			Balance:         "10",
			BalanceUsd:      "0.00",
			TokenPrice:      "0",
			Blockchain:      "robinhood",
			ContractAddress: inactiveAddress,
			TokenType:       "erc20",
		},
	}

	result := backfillRobinhoodTokenPrices(server.Client(), server.URL, assets)
	if result.AddedTotalUSD != 0 {
		t.Fatalf("added total = %v, want 0", result.AddedTotalUSD)
	}
	for _, asset := range assets {
		if asset.TokenPrice != "0" || asset.BalanceUsd != "0.00" {
			t.Fatalf("unusable pool price should be rejected: %#v", asset)
		}
	}

	filtered, removedUSD := removeWalletDust(assets, result.CheckedAddresses)
	if len(filtered) != 0 || removedUSD != 0 {
		t.Fatalf("checked unpriced assets were not removed: assets=%#v removedUSD=%v", filtered, removedUSD)
	}
}

func TestRemoveWalletDustKeepsUncheckedUnpricedAssets(t *testing.T) {
	const (
		checkedAddress   = "0x6666666666666666666666666666666666666666"
		uncheckedAddress = "0x7777777777777777777777777777777777777777"
	)
	assets := []TokenBalance{
		{
			TokenSymbol:     "DUST",
			Balance:         "0.5",
			BalanceUsd:      "0.50",
			TokenPrice:      "1",
			Blockchain:      "base",
			ContractAddress: "0x8888888888888888888888888888888888888888",
			TokenType:       "erc20",
		},
		{
			TokenSymbol:     "CHECKED",
			Balance:         "100",
			BalanceUsd:      "0.00",
			TokenPrice:      "0",
			Blockchain:      "robinhood",
			ContractAddress: checkedAddress,
			TokenType:       "erc20",
		},
		{
			TokenSymbol:     "RATE_LIMITED",
			Balance:         "100",
			BalanceUsd:      "0.00",
			TokenPrice:      "0",
			Blockchain:      "robinhood",
			ContractAddress: uncheckedAddress,
			TokenType:       "erc20",
		},
	}

	filtered, removedUSD := removeWalletDust(assets, map[string]struct{}{checkedAddress: {}})
	if removedUSD != 0.5 {
		t.Fatalf("removed USD = %v, want 0.5", removedUSD)
	}
	if len(filtered) != 1 || filtered[0].ContractAddress != uncheckedAddress {
		t.Fatalf("unexpected filtered assets: %#v", filtered)
	}
}

func TestAlchemyIgnoresGeckoTerminalRateLimit(t *testing.T) {
	const tokenAddress = "0x4444444444444444444444444444444444444444"
	geckoRequests := 0

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/assets/tokens/by-address"):
			_, _ = w.Write([]byte(`{
				"data": {
					"tokens": [{
						"address": "0xowner",
						"network": "robinhood-mainnet",
						"tokenAddress": "0x4444444444444444444444444444444444444444",
						"tokenBalance": "0xde0b6b3a7640000",
						"tokenMetadata": {"decimals": 18, "name": "Meme", "symbol": "MEME"},
						"tokenPrices": []
					}]
				}
			}`))
		case r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/networks/robinhood/tokens/multi/"):
			geckoRequests++
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"errors":[{"status":"429","title":"Rate limited"}]}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	client := newAlchemyClient("key", server.URL, server.Client())
	client.geckoTerminalBaseURL = server.URL
	result, err := client.GetAccountBalance("0xowner")
	if err != nil {
		t.Fatalf("rate-limited GeckoTerminal must not fail balances: %v", err)
	}

	if geckoRequests != 1 {
		t.Fatalf("GeckoTerminal request count = %d, want 1", geckoRequests)
	}
	if len(result.Assets) != 1 ||
		result.Assets[0].ContractAddress != tokenAddress ||
		result.Assets[0].TokenPrice != "0" ||
		result.Assets[0].BalanceUsd != "0.00" {
		t.Fatalf("rate-limited token should remain unpriced: %#v", result.Assets)
	}
	if result.TotalBalanceUsd != "0.00" {
		t.Fatalf("total USD = %q, want 0.00", result.TotalBalanceUsd)
	}
}
