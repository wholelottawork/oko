package wallet

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

const heliusBaseURL = "https://api.helius.xyz/v1/wallet"

type HeliusClient struct {
	client *http.Client
	apiKey string
}

func NewHeliusClient(apiKey string) *HeliusClient {
	return &HeliusClient{
		client: &http.Client{Timeout: 30 * time.Second},
		apiKey: apiKey,
	}
}

type heliusBalance struct {
	Mint          string   `json:"mint"`
	Symbol        string   `json:"symbol"`
	Name          string   `json:"name"`
	Balance       float64  `json:"balance"`
	Decimals      int      `json:"decimals"`
	PricePerToken *float64 `json:"pricePerToken"`
	UsdValue      *float64 `json:"usdValue"`
	LogoUri       string   `json:"logoUri"`
	TokenProgram  string   `json:"tokenProgram"`
}

type heliusPagination struct {
	Page    int  `json:"page"`
	Limit   int  `json:"limit"`
	HasMore bool `json:"hasMore"`
}

type heliusResponse struct {
	Balances      []heliusBalance  `json:"balances"`
	TotalUsdValue float64          `json:"totalUsdValue"`
	Pagination    heliusPagination `json:"pagination"`
}

// GetAccountBalance fetches Solana token balances and maps them to our unified TokenBalance format.
func (c *HeliusClient) GetAccountBalance(address string) (*AccountBalanceResult, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("helius API key not configured")
	}

	allAssets := make([]TokenBalance, 0)
	totalUsdValue := 0.0
	page := 1

	for {
		url := fmt.Sprintf("%s/%s/balances?api-key=%s&page=%d&limit=100&showZeroBalance=false",
			heliusBaseURL, address, c.apiKey, page)

		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}

		resp, err := c.client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("helius request failed: %w", err)
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("read response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("helius API returned status %d: %s", resp.StatusCode, string(body))
		}

		var hr heliusResponse
		if err := json.Unmarshal(body, &hr); err != nil {
			return nil, fmt.Errorf("parse response: %w", err)
		}

		for _, b := range hr.Balances {
			balUsd := 0.0
			if b.UsdValue != nil {
				balUsd = *b.UsdValue
			}
			price := 0.0
			if b.PricePerToken != nil {
				price = *b.PricePerToken
			}

			totalUsdValue += balUsd

			allAssets = append(allAssets, TokenBalance{
				TokenName:       b.Name,
				TokenSymbol:     b.Symbol,
				Balance:         strconv.FormatFloat(b.Balance, 'f', -1, 64),
				BalanceUsd:      strconv.FormatFloat(balUsd, 'f', 2, 64),
				TokenPrice:      strconv.FormatFloat(price, 'f', -1, 64),
				Blockchain:      "solana",
				ContractAddress: b.Mint,
				Thumbnail:       b.LogoUri,
				TokenDecimals:   b.Decimals,
				TokenType:       b.TokenProgram,
			})
		}

		if !hr.Pagination.HasMore {
			break
		}
		page++
	}

	return &AccountBalanceResult{
		Assets:          allAssets,
		TotalBalanceUsd: strconv.FormatFloat(totalUsdValue, 'f', 2, 64),
	}, nil
}
