package api

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestFetchERC20TokenBalance(t *testing.T) {
	owner := common.HexToAddress("0x1111111111111111111111111111111111111111")
	token := common.HexToAddress("0x2222222222222222222222222222222222222222")
	rawBalance := big.NewInt(150_000_250_000)
	rpc := newUpgradeRPCServer(t, "0x1237", 6, rawBalance)
	defer rpc.Close()

	balance, decimals, err := fetchERC20TokenBalance(context.Background(), rpc.URL, 4663, owner, token)
	if err != nil {
		t.Fatalf("fetchERC20TokenBalance returned an error: %v", err)
	}
	if decimals != 6 {
		t.Fatalf("decimals = %d, want 6", decimals)
	}
	if math.Abs(balance-150000.25) > 0.000001 {
		t.Fatalf("balance = %f, want 150000.25", balance)
	}
}

func TestFetchERC20TokenBalanceRejectsWrongChain(t *testing.T) {
	rpc := newUpgradeRPCServer(t, "0x1", 18, big.NewInt(0))
	defer rpc.Close()

	_, _, err := fetchERC20TokenBalance(
		context.Background(),
		rpc.URL,
		4663,
		common.HexToAddress("0x1111111111111111111111111111111111111111"),
		common.HexToAddress("0x2222222222222222222222222222222222222222"),
	)
	if err == nil || !strings.Contains(err.Error(), "expected 4663") {
		t.Fatalf("expected chain mismatch error, got %v", err)
	}
}

func newUpgradeRPCServer(t *testing.T, chainID string, decimals uint8, rawBalance *big.Int) *httptest.Server {
	t.Helper()

	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request upgradeRPCRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Errorf("decode RPC request: %v", err)
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		var result string
		switch request.Method {
		case "eth_chainId":
			result = chainID
		case "eth_call":
			if len(request.Params) == 0 {
				t.Error("eth_call missing params")
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			call, ok := request.Params[0].(map[string]interface{})
			if !ok {
				t.Error("eth_call transaction is not an object")
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			data, _ := call["data"].(string)
			switch {
			case strings.HasPrefix(data, "0x313ce567"):
				result = fmt.Sprintf("0x%064x", decimals)
			case strings.HasPrefix(data, "0x70a08231"):
				result = fmt.Sprintf("0x%064x", rawBalance)
			default:
				t.Errorf("unexpected eth_call data: %s", data)
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
		default:
			t.Errorf("unexpected RPC method: %s", request.Method)
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      request.ID,
			"result":  result,
		}); err != nil {
			t.Errorf("encode RPC response: %v", err)
		}
	}))
}
