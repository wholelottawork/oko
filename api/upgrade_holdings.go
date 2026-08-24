package api

import (
	"fmt"
	"net/http"
	"oko/config"
	"oko/wallet"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// handleUpgradeEligibility checks the configured SPL token balance on Solana.
// The mint address and threshold are server-owned configuration; clients
// cannot choose a different token to satisfy the gate.
func (s *Server) handleUpgradeEligibility(c *gin.Context) {
	cfg := config.Get()
	address := strings.TrimSpace(c.Param("address"))

	if !wallet.IsSolanaAddress(address) {
		SafeBadRequest(c, "address must be a valid Solana address")
		return
	}

	if cfg.UpgradeTokenAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"configured":   false,
			"address":      address,
			"tokenAddress": "",
			"chainName":    "Solana",
			"threshold":    cfg.UpgradeMinTokenBalance,
			"totalBalance": 0,
			"eligible":     false,
		})
		return
	}
	if !wallet.IsSolanaAddress(cfg.UpgradeTokenAddress) {
		SafeInternalError(c, "upgrade gate configuration", fmt.Errorf("UPGRADE_TOKEN_ADDRESS must be a valid Solana mint address"))
		return
	}
	if cfg.HeliusAPIKey == "" {
		SafeInternalError(c, "upgrade gate configuration", fmt.Errorf("HELIUS_API_KEY is required for the upgrade gate"))
		return
	}

	helius := wallet.NewHeliusClient(cfg.HeliusAPIKey)
	result, err := helius.GetAccountBalance(address)
	if err != nil {
		SafeInternalError(c, "fetch Solana token balance", err)
		return
	}

	var totalBalance float64
	var decimals int
	found := false
	for _, asset := range result.Assets {
		if asset.ContractAddress != cfg.UpgradeTokenAddress {
			continue
		}
		found = true
		decimals = asset.TokenDecimals
		if parsed, parseErr := strconv.ParseFloat(asset.Balance, 64); parseErr == nil {
			totalBalance = parsed
		}
		break
	}
	_ = found // absence just means balance 0, not an error — see comment below

	missingBalance := cfg.UpgradeMinTokenBalance - totalBalance
	if missingBalance < 0 {
		missingBalance = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"configured":     true,
		"address":        address,
		"tokenAddress":   cfg.UpgradeTokenAddress,
		"chainName":      "Solana",
		"decimals":       decimals,
		"threshold":      cfg.UpgradeMinTokenBalance,
		"totalBalance":   totalBalance,
		"missingBalance": missingBalance,
		"eligible":       totalBalance >= cfg.UpgradeMinTokenBalance,
	})
}
