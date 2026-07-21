package market

import (
	"encoding/json"
	"nofx/logger"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// TickerUpdate holds the latest price data for one symbol.
type TickerUpdate struct {
	Symbol        string `json:"symbol"`
	Price         string `json:"price"`
	ChangePercent string `json:"changePercent"`
}

// tickerSymbols are the Binance stream symbols to subscribe to.
var tickerSymbols = []string{
	"BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
	"DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
	"POLUSDT", "UNIUSDT", "LTCUSDT", "ATOMUSDT", "NEARUSDT",
	"APTUSDT", "ARBUSDT", "OPUSDT", "INJUSDT", "SUIUSDT",
	"TIAUSDT", "JUPUSDT", "WIFUSDT", "BONKUSDT", "PEPEUSDT",
}

// tickerDisplayNames maps Binance symbol → short display name.
var tickerDisplayNames = map[string]string{
	"BTCUSDT": "BTC", "ETHUSDT": "ETH", "SOLUSDT": "SOL", "BNBUSDT": "BNB",
	"XRPUSDT": "XRP", "DOGEUSDT": "DOGE", "ADAUSDT": "ADA", "AVAXUSDT": "AVAX",
	"LINKUSDT": "LINK", "DOTUSDT": "DOT", "POLUSDT": "MATIC", "UNIUSDT": "UNI",
	"LTCUSDT": "LTC", "ATOMUSDT": "ATOM", "NEARUSDT": "NEAR", "APTUSDT": "APT",
	"ARBUSDT": "ARB", "OPUSDT": "OP", "INJUSDT": "INJ", "SUIUSDT": "SUI",
	"TIAUSDT": "TIA", "JUPUSDT": "JUP", "WIFUSDT": "WIF", "BONKUSDT": "BONK",
	"PEPEUSDT": "PEPE",
}

// tickerService is the singleton fan-out service.
var tickerService = &fanoutService{
	subs: make(map[chan TickerUpdate]struct{}),
}

type fanoutService struct {
	mu      sync.RWMutex
	cache   sync.Map // string → TickerUpdate
	subs    map[chan TickerUpdate]struct{}
}

// Subscribe registers a new subscriber and returns a receive channel plus a
// cancel function that must be called when the subscriber disconnects.
func Subscribe() (<-chan TickerUpdate, func()) {
	ch := make(chan TickerUpdate, 64)
	tickerService.mu.Lock()
	tickerService.subs[ch] = struct{}{}
	tickerService.mu.Unlock()

	cancel := func() {
		tickerService.mu.Lock()
		delete(tickerService.subs, ch)
		tickerService.mu.Unlock()
		// drain to unblock any pending send
		for len(ch) > 0 {
			<-ch
		}
		close(ch)
	}
	return ch, cancel
}

// GetSnapshot returns the latest cached price for every symbol that has been
// received at least once.
func GetSnapshot() []TickerUpdate {
	var out []TickerUpdate
	tickerService.cache.Range(func(_, v any) bool {
		out = append(out, v.(TickerUpdate))
		return true
	})
	return out
}

// StartTickerService starts the persistent Binance WebSocket connection and
// should be called once from main() as a goroutine.
func StartTickerService() {
	logger.Info("📈 Starting live ticker service (Binance WebSocket)...")
	for {
		if err := runTickerConnection(); err != nil {
			logger.Warnf("⚠️ Ticker WebSocket error: %v — reconnecting in 3s", err)
		}
		time.Sleep(3 * time.Second)
	}
}

// runTickerConnection opens one multiplexed Binance miniTicker stream covering
// all configured symbols and fans out every update to subscribers.
func runTickerConnection() error {
	// Build combined stream URL — one connection for all symbols.
	streams := ""
	for i, sym := range tickerSymbols {
		if i > 0 {
			streams += "/"
		}
		streams += lowerStr(sym) + "@miniTicker"
	}
	url := "wss://stream.binance.com:9443/stream?streams=" + streams

	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		return err
	}
	defer conn.Close()
	logger.Info("✅ Ticker WebSocket connected")

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		var envelope struct {
			Data struct {
				S string `json:"s"` // symbol
				C string `json:"c"` // close price
				O string `json:"o"` // open price
			} `json:"data"`
		}
		if jsonErr := json.Unmarshal(msg, &envelope); jsonErr != nil {
			continue
		}
		d := envelope.Data
		if d.S == "" {
			continue
		}

		price := parseTickerFloat(d.C)
		open := parseTickerFloat(d.O)
		var pct float64
		if open != 0 {
			pct = (price - open) / open * 100
		}

		displayName := tickerDisplayNames[d.S]
		if displayName == "" {
			displayName = d.S
		}

		update := TickerUpdate{
			Symbol:        d.S,
			Price:         formatTickerPrice(price),
			ChangePercent: formatPct(pct),
		}

		// Cache latest value
		tickerService.cache.Store(d.S, update)

		// Fan-out to all subscribers (non-blocking — slow clients are dropped)
		tickerService.mu.RLock()
		for ch := range tickerService.subs {
			select {
			case ch <- update:
			default:
				// client too slow — skip this tick rather than block
			}
		}
		tickerService.mu.RUnlock()
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func lowerStr(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}

func parseTickerFloat(s string) float64 {
	f, _ := parseFloat(s) // reuse existing market.parseFloat(interface{}) (float64, error)
	return f
}

func formatTickerPrice(n float64) string {
	if n >= 1000 {
		// e.g. $97,432.10
		return "$" + formatWithCommas(n, 2)
	}
	if n >= 1 {
		return "$" + formatFixed(n, 4)
	}
	return "$" + formatFixed(n, 6)
}

func formatPct(pct float64) string {
	if pct >= 0 {
		return "+" + formatFixed(pct, 2) + "%"
	}
	return formatFixed(pct, 2) + "%"
}

func formatFixed(f float64, decimals int) string {
	// Use strconv-style manual formatting to avoid importing fmt in a hot path.
	// For simplicity and correctness use the stdlib here.
	return formatFloatManual(f, decimals)
}

func formatFloatManual(f float64, decimals int) string {
	// We rely on the standard library via strconv-compatible approach.
	// Import strconv is fine but to avoid a new import in this hot file we do
	// a simple sprintf-equivalent via string conversion.
	neg := f < 0
	if neg {
		f = -f
	}
	intPart := int64(f)
	// multiply to get decimal digits
	mul := int64(1)
	for i := 0; i < decimals; i++ {
		mul *= 10
	}
	fracPart := int64((f-float64(intPart))*float64(mul)+0.5)
	if fracPart >= mul {
		intPart++
		fracPart = 0
	}
	s := int64ToString(intPart)
	if decimals > 0 {
		frac := int64ToString(fracPart)
		for len(frac) < decimals {
			frac = "0" + frac
		}
		s += "." + frac
	}
	if neg {
		return "-" + s
	}
	return s
}

func formatWithCommas(f float64, decimals int) string {
	base := formatFloatManual(f, decimals)
	// Find decimal point position
	dot := -1
	for i, c := range base {
		if c == '.' {
			dot = i
			break
		}
	}
	intStr := base
	fracStr := ""
	if dot >= 0 {
		intStr = base[:dot]
		fracStr = base[dot:]
	}
	// Insert commas every 3 digits from the right
	out := []byte{}
	for i, c := range intStr {
		pos := len(intStr) - i
		if i > 0 && pos%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, byte(c))
	}
	return string(out) + fracStr
}

func int64ToString(n int64) string {
	if n == 0 {
		return "0"
	}
	digits := []byte{}
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
