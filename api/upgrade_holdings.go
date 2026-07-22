package api

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"oko/config"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
)

var (
	erc20BalanceOfSelector = []byte{0x70, 0xa0, 0x82, 0x31}
	erc20DecimalsSelector  = []byte{0x31, 0x3c, 0xe5, 0x67}
)

type upgradeRPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type upgradeRPCResponse struct {
	Result string `json:"result"`
	Error  *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// handleUpgradeEligibility checks the configured ERC-20 balance on Robinhood Chain.
// The contract and threshold are server-owned configuration; clients cannot choose
// a different token to satisfy the gate.
func (s *Server) handleUpgradeEligibility(c *gin.Context) {
	cfg := config.Get()
	address := strings.TrimSpace(c.Param("address"))

	if !common.IsHexAddress(address) {
		SafeBadRequest(c, "address must be a valid EVM address")
		return
	}

	if cfg.UpgradeTokenAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"configured":   false,
			"address":      common.HexToAddress(address).Hex(),
			"tokenAddress": "",
			"chainId":      cfg.UpgradeChainID,
			"chainName":    "Robinhood Chain",
			"threshold":    cfg.UpgradeMinTokenBalance,
			"totalBalance": 0,
			"eligible":     false,
		})
		return
	}
	if !common.IsHexAddress(cfg.UpgradeTokenAddress) {
		SafeInternalError(c, "upgrade gate configuration", fmt.Errorf("UPGRADE_TOKEN_ADDRESS must be a valid EVM contract address"))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
	defer cancel()

	totalBalance, decimals, err := fetchERC20TokenBalance(
		ctx,
		cfg.UpgradeRPCURL,
		cfg.UpgradeChainID,
		common.HexToAddress(address),
		common.HexToAddress(cfg.UpgradeTokenAddress),
	)
	if err != nil {
		SafeInternalError(c, "fetch Robinhood Chain token balance", err)
		return
	}

	missingBalance := cfg.UpgradeMinTokenBalance - totalBalance
	if missingBalance < 0 {
		missingBalance = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"configured":     true,
		"address":        common.HexToAddress(address).Hex(),
		"tokenAddress":   common.HexToAddress(cfg.UpgradeTokenAddress).Hex(),
		"chainId":        cfg.UpgradeChainID,
		"chainName":      "Robinhood Chain",
		"decimals":       decimals,
		"threshold":      cfg.UpgradeMinTokenBalance,
		"totalBalance":   totalBalance,
		"missingBalance": missingBalance,
		"eligible":       totalBalance >= cfg.UpgradeMinTokenBalance,
	})
}

func fetchERC20TokenBalance(
	ctx context.Context,
	rpcURL string,
	expectedChainID int64,
	owner common.Address,
	token common.Address,
) (float64, uint8, error) {
	if rpcURL == "" {
		return 0, 0, fmt.Errorf("UPGRADE_RPC_URL is required")
	}

	client := &http.Client{Timeout: 20 * time.Second}
	chainIDHex, err := callUpgradeRPC(ctx, client, rpcURL, "eth_chainId", nil)
	if err != nil {
		return 0, 0, fmt.Errorf("read upgrade RPC chain ID: %w", err)
	}
	chainID, ok := parseRPCQuantity(chainIDHex)
	if !ok || !chainID.IsInt64() || chainID.Int64() != expectedChainID {
		return 0, 0, fmt.Errorf("upgrade RPC returned chain ID %s, expected %d", chainIDHex, expectedChainID)
	}

	decimalsHex, err := callUpgradeRPC(ctx, client, rpcURL, "eth_call", []interface{}{
		map[string]string{
			"to":   token.Hex(),
			"data": "0x" + hex.EncodeToString(erc20DecimalsSelector),
		},
		"latest",
	})
	if err != nil {
		return 0, 0, fmt.Errorf("call token decimals: %w", err)
	}
	decimalsInt, ok := parseRPCQuantity(decimalsHex)
	if !ok {
		return 0, 0, fmt.Errorf("token decimals returned no data")
	}
	if !decimalsInt.IsUint64() || decimalsInt.Uint64() > 255 {
		return 0, 0, fmt.Errorf("token decimals is out of range")
	}
	decimals := uint8(decimalsInt.Uint64())

	balanceCall := make([]byte, 0, 36)
	balanceCall = append(balanceCall, erc20BalanceOfSelector...)
	balanceCall = append(balanceCall, common.LeftPadBytes(owner.Bytes(), 32)...)
	balanceHex, err := callUpgradeRPC(ctx, client, rpcURL, "eth_call", []interface{}{
		map[string]string{
			"to":   token.Hex(),
			"data": "0x" + hex.EncodeToString(balanceCall),
		},
		"latest",
	})
	if err != nil {
		return 0, 0, fmt.Errorf("call token balanceOf: %w", err)
	}
	rawBalance, ok := parseRPCQuantity(balanceHex)
	if !ok {
		return 0, 0, fmt.Errorf("token balanceOf returned no data")
	}

	divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	humanBalance, _ := new(big.Rat).SetFrac(rawBalance, divisor).Float64()
	return humanBalance, decimals, nil
}

func callUpgradeRPC(
	ctx context.Context,
	client *http.Client,
	rpcURL string,
	method string,
	params []interface{},
) (string, error) {
	payload, err := json.Marshal(upgradeRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  method,
		Params:  params,
	})
	if err != nil {
		return "", fmt.Errorf("encode RPC request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, rpcURL, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("build RPC request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request RPC: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read RPC response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("RPC returned HTTP %d", resp.StatusCode)
	}

	var result upgradeRPCResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("decode RPC response: %w", err)
	}
	if result.Error != nil {
		return "", fmt.Errorf("RPC error %d: %s", result.Error.Code, result.Error.Message)
	}
	if result.Result == "" {
		return "", fmt.Errorf("RPC returned an empty result")
	}
	return result.Result, nil
}

func parseRPCQuantity(value string) (*big.Int, bool) {
	hexValue := strings.TrimPrefix(value, "0x")
	if hexValue == "" {
		return nil, false
	}
	parsed, ok := new(big.Int).SetString(hexValue, 16)
	return parsed, ok
}
