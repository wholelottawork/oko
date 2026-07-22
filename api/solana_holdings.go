package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"oko/config"
	"oko/wallet"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type solanaTokenBalanceRPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      string        `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

func (s *Server) handleSolanaTokenBalance(c *gin.Context) {
	address := strings.TrimSpace(c.Param("address"))
	mint := strings.TrimSpace(c.Query("mint"))

	if address == "" {
		SafeBadRequest(c, "address is required")
		return
	}
	if mint == "" {
		SafeBadRequest(c, "mint is required")
		return
	}
	if !wallet.IsSolanaAddress(address) {
		SafeBadRequest(c, "address must be a valid Solana address")
		return
	}
	if !wallet.IsSolanaAddress(mint) {
		SafeBadRequest(c, "mint must be a valid Solana address")
		return
	}

	rpcURL := config.Get().EffectiveSolanaRPCURL()
	if rpcURL == "" {
		SafeInternalError(c, "solana rpc service", fmt.Errorf("set SOLANA_RPC_URL or HELIUS_API_KEY in backend environment"))
		return
	}

	totalBalance, err := fetchSolanaTokenBalance(rpcURL, address, mint)
	if err != nil {
		SafeInternalError(c, "fetch solana token balance", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"address":      address,
		"mint":         mint,
		"totalBalance": totalBalance,
	})
}

func fetchSolanaTokenBalance(rpcURL, owner, mint string) (float64, error) {
	payload := solanaTokenBalanceRPCRequest{
		JSONRPC: "2.0",
		ID:      "oko-upgrade-gate",
		Method:  "getTokenAccountsByOwner",
		Params: []interface{}{
			owner,
			map[string]string{"mint": mint},
			map[string]string{"encoding": "jsonParsed"},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, fmt.Errorf("marshal solana rpc request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, rpcURL, bytes.NewReader(body))
	if err != nil {
		return 0, fmt.Errorf("build solana rpc request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 25 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("request solana rpc: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("read solana rpc response: %w", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		return 0, fmt.Errorf("decode solana rpc response: %w", err)
	}

	if errObj, ok := raw["error"].(map[string]interface{}); ok && errObj != nil {
		msg, _ := errObj["message"].(string)
		code := errObj["code"]
		return 0, fmt.Errorf("solana rpc error %v: %s", code, msg)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return 0, fmt.Errorf("solana rpc returned HTTP %d", resp.StatusCode)
	}

	result, ok := raw["result"].(map[string]interface{})
	if !ok || result == nil {
		return 0, nil
	}

	value, ok := result["value"].([]interface{})
	if !ok || value == nil {
		return 0, nil
	}

	total := 0.0
	for _, item := range value {
		acc, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		total += parseTokenAmountFromRPCAccount(acc)
	}

	return total, nil
}

// parseTokenAmountFromRPCAccount sums ui amount from one getTokenAccountsByOwner entry.
// Uses loose typing so different RPCs (Token / Token-2022, number vs string decimals) do not break JSON decode.
func parseTokenAmountFromRPCAccount(acc map[string]interface{}) float64 {
	account, _ := acc["account"].(map[string]interface{})
	if account == nil {
		return 0
	}
	data, _ := account["data"].(map[string]interface{})
	if data == nil {
		return 0
	}
	parsed, _ := data["parsed"].(map[string]interface{})
	if parsed == nil {
		return 0
	}
	info, _ := parsed["info"].(map[string]interface{})
	if info == nil {
		return 0
	}
	tm, _ := info["tokenAmount"].(map[string]interface{})
	if tm == nil {
		return 0
	}

	if s, ok := tm["uiAmountString"].(string); ok && s != "" {
		if f, err := strconv.ParseFloat(s, 64); err == nil {
			return f
		}
	}

	if v, ok := tm["uiAmount"]; ok && v != nil {
		switch x := v.(type) {
		case float64:
			return x
		case string:
			if f, err := strconv.ParseFloat(x, 64); err == nil {
				return f
			}
		}
	}

	amountStr, _ := tm["amount"].(string)
	decimals := decimalsFromInterface(tm["decimals"])
	if amountStr != "" && decimals >= 0 {
		rawAmount, err := strconv.ParseFloat(amountStr, 64)
		if err == nil {
			return rawAmount / math.Pow10(decimals)
		}
	}

	return 0
}

func decimalsFromInterface(v interface{}) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case int:
		return x
	case int64:
		return int(x)
	case json.Number:
		i, err := x.Int64()
		if err == nil {
			return int(i)
		}
	case string:
		n, err := strconv.Atoi(x)
		if err == nil {
			return n
		}
	}
	return 0
}
