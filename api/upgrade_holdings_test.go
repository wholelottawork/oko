package api

import (
	"net/http"
	"net/http/httptest"
	"oko/config"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHandleUpgradeEligibilityRejectsInvalidAddress(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	s := &Server{}
	router.GET("/wallet/:address/upgrade-eligibility", s.handleUpgradeEligibility)

	req := httptest.NewRequest(http.MethodGet, "/wallet/not-a-real-address/upgrade-eligibility", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", w.Code, http.StatusBadRequest, w.Body.String())
	}
}

func TestHandleUpgradeEligibilityUnconfigured(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	s := &Server{}
	router.GET("/wallet/:address/upgrade-eligibility", s.handleUpgradeEligibility)

	// UPGRADE_TOKEN_ADDRESS is unset in the test environment, so config.Get()
	// returns UpgradeTokenAddress == "" and the handler should short-circuit
	// to the "not configured" branch without ever calling Helius. Set it
	// explicitly to make that intent obvious rather than relying only on the
	// ambient env being unset — this package has no shared test-config setup
	// helper and no test here runs t.Parallel, so mutating the config.Get()
	// singleton directly is safe.
	config.Get().UpgradeTokenAddress = ""

	validSolanaAddress := "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
	req := httptest.NewRequest(http.MethodGet, "/wallet/"+validSolanaAddress+"/upgrade-eligibility", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", w.Code, http.StatusOK, w.Body.String())
	}
	if want := `"configured":false`; !strings.Contains(w.Body.String(), want) {
		t.Fatalf("body = %s, want it to contain %s", w.Body.String(), want)
	}
}
