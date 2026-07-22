package market

import "testing"

func TestNormalizeFuturesSymbol(t *testing.T) {
	tests := map[string]string{
		"":         "BTCUSDT",
		"btc":      "BTCUSDT",
		"ethusdt":  "ETHUSDT",
		"1000pepe": "1000PEPEUSDT",
	}
	for input, expected := range tests {
		actual, err := normalizeFuturesSymbol(input)
		if err != nil {
			t.Fatalf("normalizeFuturesSymbol(%q): %v", input, err)
		}
		if actual != expected {
			t.Errorf("normalizeFuturesSymbol(%q) = %q, want %q", input, actual, expected)
		}
	}

	if _, err := normalizeFuturesSymbol("BTC/USD"); err == nil {
		t.Fatal("expected invalid symbol to be rejected")
	}
}

func TestBuildLiquidationLevels(t *testing.T) {
	levels := buildLiquidationLevels(100, 1_000_000_000, 0.6)
	if len(levels) != 16 {
		t.Fatalf("got %d levels, want 16", len(levels))
	}
	for i, level := range levels {
		if level.Price <= 0 || level.Weight <= 0 || level.MaxWeight <= 0 || level.OIEstimate <= 0 {
			t.Fatalf("level %d contains a non-positive value: %+v", i, level)
		}
		if i > 0 && levels[i-1].Price > level.Price {
			t.Fatalf("levels are not sorted by price")
		}
	}
	if levels[0].Price >= 100 || levels[len(levels)-1].Price <= 100 {
		t.Fatal("expected levels on both sides of mark price")
	}
}

func TestBuildLiquidationLevelsRejectsMissingMarketData(t *testing.T) {
	if levels := buildLiquidationLevels(0, 1_000, 0.5); len(levels) != 0 {
		t.Fatalf("got %d levels for a zero mark price", len(levels))
	}
}
