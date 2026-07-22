package alpaca

import (
	"context"
	"fmt"
	"testing"
)

func TestGetBars(t *testing.T) {
	client := NewClient()

	resp, err := client.GetBars(context.TODO(), "AAPL", "1Day", 5)
	if err != nil {
		t.Fatal(err)
	}

	t.Log("=== AAPL Daily Data (Alpaca IEX feed) ===")
	for i, bar := range resp {
		t.Logf("\n[%d] Time: %s", i, bar.Timestamp.Format("2006-01-02 15:04:05"))
		t.Logf("    Open:       %.2f", bar.Open)
		t.Logf("    High:       %.2f", bar.High)
		t.Logf("    Low:        %.2f", bar.Low)
		t.Logf("    Close:      %.2f", bar.Close)
		t.Logf("    Volume:     %d (shares)", bar.Volume)
		t.Logf("    TradeCount: %d (trades)", bar.TradeCount)
		t.Logf("    VWAP:       %.2f (volume-weighted average price)", bar.VWAP)

		quoteVolume := float64(bar.Volume) * bar.Close
		t.Logf("    Turnover:   %.2f USD (Volume × Close)", quoteVolume)
	}

	fmt.Printf("\n⚠️ Note: the IEX feed contains only IEX exchange data, not full-market data\n")
	fmt.Printf("Full-market data requires the paid SIP feed\n")
}
