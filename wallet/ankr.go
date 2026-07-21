package wallet

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const ankrBaseURL = "https://rpc.ankr.com/multichain"

// EVM chains supported by Ankr getAccountBalance
var evmChains = []string{"eth", "bsc", "polygon", "arbitrum", "base", "optimism"}

// Solana chain identifier for Ankr
var solanaChains = []string{"solana"}

// TokenBalance represents a single token balance from Ankr
type TokenBalance struct {
	TokenName       string `json:"tokenName"`
	TokenSymbol     string `json:"tokenSymbol"`
	Balance         string `json:"balance"`
	BalanceUsd      string `json:"balanceUsd"`
	TokenPrice      string `json:"tokenPrice"`
	Blockchain      string `json:"blockchain"`
	ContractAddress string `json:"contractAddress"`
	Thumbnail       string `json:"thumbnail"`
	TokenDecimals   int    `json:"tokenDecimals"`
	TokenType       string `json:"tokenType"`
	HolderAddress   string `json:"holderAddress"`
	// CoinGecko enrichment (optional)
	Change24h *float64 `json:"change24h,omitempty"`
	Change7d  *float64 `json:"change7d,omitempty"`
	Change30d *float64 `json:"change30d,omitempty"`
	MarketCap *float64 `json:"marketCap,omitempty"`
}

// AccountBalanceResult is the response from ankr_getAccountBalance
type AccountBalanceResult struct {
	Assets         []TokenBalance `json:"assets"`
	TotalBalanceUsd string        `json:"totalBalanceUsd"`
	NextPageToken  string         `json:"nextPageToken"`
}

// AnkrClient calls Ankr Advanced API
type AnkrClient struct {
	client *http.Client
	token  string
}

// NewAnkrClient creates an Ankr client with the given API token
func NewAnkrClient(token string) *AnkrClient {
	return &AnkrClient{
		client: &http.Client{Timeout: 30 * time.Second},
		token:  token,
	}
}

// ankrRequest is the JSON-RPC request body
type ankrRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  ankrParams    `json:"params"`
	ID      int           `json:"id"`
}

type ankrParams struct {
	WalletAddress   string   `json:"walletAddress"`
	Blockchain      []string `json:"blockchain"`
	OnlyWhitelisted bool     `json:"onlyWhitelisted"`
	PageSize        int      `json:"pageSize,omitempty"`
	PageToken       string   `json:"pageToken,omitempty"`
}

// ankrResponse is the JSON-RPC response
type ankrResponse struct {
	JSONRPC string               `json:"jsonrpc"`
	ID      int                  `json:"id"`
	Result  *AccountBalanceResult `json:"result,omitempty"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// GetAccountBalance fetches token balances for the given address across the specified blockchains
func (c *AnkrClient) GetAccountBalance(address string, blockchains []string) (*AccountBalanceResult, error) {
	if c.token == "" {
		return nil, fmt.Errorf("ankr API token not configured")
	}

	url := ankrBaseURL + "/" + c.token

	allAssets := make([]TokenBalance, 0)
	var totalBalanceUsd string
	pageToken := ""

	for {
		params := ankrParams{
			WalletAddress:   address,
			Blockchain:      blockchains,
			OnlyWhitelisted: true,
			PageSize:        100,
		}
		if pageToken != "" {
			params.PageToken = pageToken
		}

		reqBody := ankrRequest{
			JSONRPC: "2.0",
			Method:  "ankr_getAccountBalance",
			Params:  params,
			ID:      1,
		}

		body, err := json.Marshal(reqBody)
		if err != nil {
			return nil, fmt.Errorf("marshal request: %w", err)
		}

		req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("ankr request failed: %w", err)
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("read response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("ankr API returned status %d: %s", resp.StatusCode, string(respBody))
		}

		var ar ankrResponse
		if err := json.Unmarshal(respBody, &ar); err != nil {
			return nil, fmt.Errorf("parse response: %w", err)
		}

		if ar.Error != nil {
			return nil, fmt.Errorf("ankr API error: %s", ar.Error.Message)
		}

		if ar.Result == nil {
			return nil, fmt.Errorf("ankr API returned empty result")
		}

		allAssets = append(allAssets, ar.Result.Assets...)
		totalBalanceUsd = ar.Result.TotalBalanceUsd
		pageToken = ar.Result.NextPageToken

		if pageToken == "" {
			break
		}
	}

	return &AccountBalanceResult{
		Assets:          allAssets,
		TotalBalanceUsd: totalBalanceUsd,
	}, nil
}

// IsEVMAddress returns true if the address looks like an EVM address (0x + 40 hex chars)
func IsEVMAddress(addr string) bool {
	if len(addr) != 42 {
		return false
	}
	if addr[:2] != "0x" {
		return false
	}
	for _, c := range addr[2:] {
		if (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') {
			continue
		}
		return false
	}
	return true
}

// IsSolanaAddress returns true if the address looks like a Solana base58 address (32-44 chars)
func IsSolanaAddress(addr string) bool {
	if len(addr) < 32 || len(addr) > 44 {
		return false
	}
	for _, c := range addr {
		if (c >= '1' && c <= '9') || (c >= 'A' && c <= 'H') || (c >= 'J' && c <= 'N') ||
			(c >= 'P' && c <= 'Z') || (c >= 'a' && c <= 'k') || (c >= 'm' && c <= 'z') {
			continue
		}
		return false
	}
	return true
}

// IsSupportedAddress returns true if the address is EVM or Solana
func IsSupportedAddress(addr string) bool {
	return IsEVMAddress(addr) || IsSolanaAddress(addr)
}

// ChainsForAddress returns the appropriate Ankr blockchain list for the given address
func ChainsForAddress(addr string) []string {
	if IsSolanaAddress(addr) {
		return append([]string{}, solanaChains...)
	}
	return append([]string{}, evmChains...)
}

// EVMChains returns the default EVM chains to query
func EVMChains() []string {
	return append([]string{}, evmChains...)
}
