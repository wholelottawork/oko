package wallet

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	geckoTerminalAPIBaseURL          = "https://api.geckoterminal.com/api/v2"
	geckoTerminalBatchSize           = 30
	geckoTerminalMinPoolLiquidityUSD = 5000.0
	geckoTerminalTimeout             = 5 * time.Second
)

type geckoTerminalPriceResponse struct {
	Data []struct {
		Attributes struct {
			Address  string `json:"address"`
			PriceUSD string `json:"price_usd"`
		} `json:"attributes"`
		Relationships struct {
			TopPools struct {
				Data []struct {
					ID string `json:"id"`
				} `json:"data"`
			} `json:"top_pools"`
		} `json:"relationships"`
	} `json:"data"`
	Included []struct {
		ID         string `json:"id"`
		Type       string `json:"type"`
		Attributes struct {
			ReserveUSD string `json:"reserve_in_usd"`
			VolumeUSD  struct {
				H24 string `json:"h24"`
			} `json:"volume_usd"`
		} `json:"attributes"`
	} `json:"included"`
}

type geckoTerminalEnrichmentResult struct {
	AddedTotalUSD    float64
	CheckedAddresses map[string]struct{}
}

// backfillRobinhoodTokenPrices is deliberately best-effort. GeckoTerminal's
// public API is rate-limited, so any request, status, or decoding failure stops
// enrichment without failing the wallet balances request.
func backfillRobinhoodTokenPrices(client *http.Client, baseURL string, assets []TokenBalance) geckoTerminalEnrichmentResult {
	result := geckoTerminalEnrichmentResult{
		CheckedAddresses: make(map[string]struct{}),
	}
	if client == nil {
		return result
	}

	indicesByAddress := make(map[string][]int)
	addresses := make([]string, 0)
	for i := range assets {
		asset := &assets[i]
		if !strings.EqualFold(asset.Blockchain, "robinhood") ||
			asset.TokenType != "erc20" ||
			!IsEVMAddress(asset.ContractAddress) ||
			hasPositiveTokenPrice(asset.TokenPrice) {
			continue
		}

		address := strings.ToLower(asset.ContractAddress)
		if _, found := indicesByAddress[address]; !found {
			addresses = append(addresses, address)
		}
		indicesByAddress[address] = append(indicesByAddress[address], i)
	}

	for start := 0; start < len(addresses); start += geckoTerminalBatchSize {
		end := start + geckoTerminalBatchSize
		if end > len(addresses) {
			end = len(addresses)
		}

		prices, err := fetchGeckoTerminalPrices(client, baseURL, addresses[start:end])
		if err != nil {
			break
		}
		for _, address := range addresses[start:end] {
			result.CheckedAddresses[address] = struct{}{}
		}

		for address, rawPrice := range prices {
			price, err := strconv.ParseFloat(strings.TrimSpace(rawPrice), 64)
			if err != nil || price <= 0 || math.IsNaN(price) || math.IsInf(price, 0) {
				continue
			}

			for _, index := range indicesByAddress[strings.ToLower(address)] {
				asset := &assets[index]
				if hasPositiveTokenPrice(asset.TokenPrice) {
					continue
				}
				balance, err := strconv.ParseFloat(asset.Balance, 64)
				if err != nil || balance <= 0 {
					continue
				}
				balanceUSD := balance * price
				if math.IsNaN(balanceUSD) || math.IsInf(balanceUSD, 0) {
					continue
				}

				asset.TokenPrice = strconv.FormatFloat(price, 'f', -1, 64)
				asset.BalanceUsd = strconv.FormatFloat(balanceUSD, 'f', 2, 64)
				result.AddedTotalUSD += balanceUSD
			}
		}
	}

	return result
}

func fetchGeckoTerminalPrices(client *http.Client, baseURL string, addresses []string) (map[string]string, error) {
	if len(addresses) == 0 {
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), geckoTerminalTimeout)
	defer cancel()

	endpoint := strings.TrimRight(baseURL, "/") +
		"/networks/robinhood/tokens/multi/" +
		strings.Join(addresses, ",") +
		"?include=top_pools"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create GeckoTerminal request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GeckoTerminal request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4<<10))
		return nil, fmt.Errorf("GeckoTerminal returned status %d", resp.StatusCode)
	}

	var response geckoTerminalPriceResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&response); err != nil {
		return nil, fmt.Errorf("decode GeckoTerminal response: %w", err)
	}

	usablePools := make(map[string]struct{})
	for _, pool := range response.Included {
		if pool.Type != "pool" {
			continue
		}
		liquidity, liquidityErr := strconv.ParseFloat(strings.TrimSpace(pool.Attributes.ReserveUSD), 64)
		volume24h, volumeErr := strconv.ParseFloat(strings.TrimSpace(pool.Attributes.VolumeUSD.H24), 64)
		if liquidityErr != nil || volumeErr != nil ||
			liquidity < geckoTerminalMinPoolLiquidityUSD ||
			volume24h <= 0 ||
			math.IsNaN(liquidity) || math.IsInf(liquidity, 0) ||
			math.IsNaN(volume24h) || math.IsInf(volume24h, 0) {
			continue
		}
		usablePools[pool.ID] = struct{}{}
	}

	prices := make(map[string]string)
	for _, token := range response.Data {
		hasUsablePool := false
		for _, pool := range token.Relationships.TopPools.Data {
			if _, ok := usablePools[pool.ID]; ok {
				hasUsablePool = true
				break
			}
		}
		if hasUsablePool && IsEVMAddress(token.Attributes.Address) {
			prices[strings.ToLower(token.Attributes.Address)] = token.Attributes.PriceUSD
		}
	}
	return prices, nil
}

func hasPositiveTokenPrice(value string) bool {
	price, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	return err == nil && price > 0 && !math.IsNaN(price) && !math.IsInf(price, 0)
}

// removeWalletDust removes priced holdings worth less than $1. Unpriced
// Robinhood ERC-20s are removed only when their GeckoTerminal batch completed,
// so transient API failures never make wallet assets disappear.
func removeWalletDust(assets []TokenBalance, checkedAddresses map[string]struct{}) ([]TokenBalance, float64) {
	filtered := make([]TokenBalance, 0, len(assets))
	removedTotalUSD := 0.0

	for _, asset := range assets {
		price, priceErr := strconv.ParseFloat(strings.TrimSpace(asset.TokenPrice), 64)
		balance, balanceErr := strconv.ParseFloat(strings.TrimSpace(asset.Balance), 64)
		hasPrice := priceErr == nil && price > 0 && !math.IsNaN(price) && !math.IsInf(price, 0)

		if hasPrice && balanceErr == nil && balance >= 0 {
			holdingUSD := balance * price
			if !math.IsNaN(holdingUSD) && !math.IsInf(holdingUSD, 0) && holdingUSD < 1 {
				removedTotalUSD += holdingUSD
				continue
			}
		}

		if !hasPrice &&
			strings.EqualFold(asset.Blockchain, "robinhood") &&
			asset.TokenType == "erc20" {
			address := strings.ToLower(strings.TrimSpace(asset.ContractAddress))
			if _, checked := checkedAddresses[address]; checked {
				continue
			}
		}

		filtered = append(filtered, asset)
	}

	return filtered, removedTotalUSD
}
