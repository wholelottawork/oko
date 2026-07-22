package config

import (
	"oko/experience"
	"oko/mcp"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// Global configuration instance
var global *Config

// Config is the global configuration (loaded from .env)
// Only contains truly global config, trading related config is at trader/strategy level
type Config struct {
	// Service configuration
	APIServerPort       int
	JWTSecret           string
	RegistrationEnabled bool
	MaxUsers            int // Maximum number of users allowed (0 = unlimited, default = 10)

	// Database configuration
	DBType     string // sqlite or postgres
	DBPath     string // SQLite database file path
	DBHost     string // PostgreSQL host
	DBPort     int    // PostgreSQL port
	DBUser     string // PostgreSQL user
	DBPassword string // PostgreSQL password
	DBName     string // PostgreSQL database name
	DBSSLMode  string // PostgreSQL SSL mode

	// Security configuration
	// TransportEncryption enables browser-side encryption for API keys
	// Requires HTTPS or localhost. Set to false for HTTP access via IP.
	TransportEncryption bool

	// Experience improvement (anonymous usage statistics)
	// Helps us understand product usage and improve the experience
	// Set EXPERIENCE_IMPROVEMENT=false to disable
	ExperienceImprovement bool

	// Wallet balance APIs (for AI Wallet Analyzer)
	AnkrAPIToken    string // Ankr Advanced API for EVM chains
	HeliusAPIKey    string // Helius API for Solana
	SolanaRPCURL    string // Solana RPC URL for server-side token balance lookups
	CoinGeckoAPIKey string // CoinGecko API for price stats (24h/7d/30d change, market cap)

	// Market data provider API keys
	AlpacaAPIKey    string // Alpaca API key for US stocks
	AlpacaSecretKey string // Alpaca secret key
	TwelveDataKey   string // TwelveData API key for forex & metals

	// AI provider API keys (system-level, used when user has not configured their own)
	DeepSeekAPIKey string
	OpenAIAPIKey   string
	ClaudeAPIKey   string
	GeminiAPIKey   string
	QwenAPIKey     string
	GrokAPIKey     string
	KimiAPIKey     string

	// AI provider model names (system-level from .env, used when user has not set Custom Model Name in Config)
	// e.g. DEEPSEEK_MODEL=deepseek-chat, CLAUDE_MODEL=claude-opus-4-6
	DeepSeekModel string
	OpenAIModel   string
	ClaudeModel   string
	GeminiModel   string
	QwenModel     string
	GrokModel     string
	KimiModel     string
}

// Init initializes global configuration (from .env)
func Init() {
	cfg := &Config{
		APIServerPort:         8080,
		RegistrationEnabled:   true,
		MaxUsers:              10,   // Default: 10 users allowed
		ExperienceImprovement: true, // Default: enabled to help improve the product
		// Database defaults
		DBType:    "sqlite",
		DBPath:    "data/data.db",
		DBHost:    "localhost",
		DBPort:    5432,
		DBUser:    "postgres",
		DBName:    "oko",
		DBSSLMode: "disable",
	}

	// Load from environment variables
	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.JWTSecret = strings.TrimSpace(v)
	}
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "default-jwt-secret-change-in-production"
	}

	if v := os.Getenv("REGISTRATION_ENABLED"); v != "" {
		cfg.RegistrationEnabled = strings.ToLower(v) == "true"
	}

	if v := os.Getenv("MAX_USERS"); v != "" {
		if maxUsers, err := strconv.Atoi(v); err == nil && maxUsers >= 0 {
			cfg.MaxUsers = maxUsers
		}
	}

	if v := os.Getenv("API_SERVER_PORT"); v != "" {
		if port, err := strconv.Atoi(v); err == nil && port > 0 {
			cfg.APIServerPort = port
		}
	}

	// Transport encryption: default false for easier deployment
	// Set TRANSPORT_ENCRYPTION=true to enable (requires HTTPS or localhost)
	if v := os.Getenv("TRANSPORT_ENCRYPTION"); v != "" {
		cfg.TransportEncryption = strings.ToLower(v) == "true"
	}

	// Experience improvement: anonymous usage statistics
	// Default enabled, set EXPERIENCE_IMPROVEMENT=false to disable
	if v := os.Getenv("EXPERIENCE_IMPROVEMENT"); v != "" {
		cfg.ExperienceImprovement = strings.ToLower(v) != "false"
	}

	// Wallet balance APIs
	cfg.AnkrAPIToken = strings.TrimSpace(os.Getenv("ANKR_API_TOKEN"))
	cfg.HeliusAPIKey = strings.TrimSpace(os.Getenv("HELIUS_API_KEY"))
	cfg.SolanaRPCURL = strings.TrimSpace(os.Getenv("SOLANA_RPC_URL"))
	cfg.CoinGeckoAPIKey = strings.TrimSpace(os.Getenv("COINGECKO_API_KEY"))

	// Market data provider API keys
	cfg.AlpacaAPIKey = os.Getenv("ALPACA_API_KEY")
	cfg.AlpacaSecretKey = os.Getenv("ALPACA_SECRET_KEY")
	cfg.TwelveDataKey = os.Getenv("TWELVEDATA_API_KEY")

	// AI provider API keys (system-level)
	cfg.DeepSeekAPIKey = os.Getenv("DEEPSEEK_API_KEY")
	cfg.OpenAIAPIKey = os.Getenv("OPENAI_API_KEY")
	cfg.ClaudeAPIKey = os.Getenv("CLAUDE_API_KEY")
	cfg.GeminiAPIKey = os.Getenv("GEMINI_API_KEY")
	cfg.QwenAPIKey = os.Getenv("QWEN_API_KEY")
	cfg.GrokAPIKey = os.Getenv("GROK_API_KEY")
	cfg.KimiAPIKey = os.Getenv("KIMI_API_KEY")

	// AI provider model names (system-level from .env, fallback when user has not set Custom Model Name)
	if v := strings.TrimSpace(os.Getenv("DEEPSEEK_MODEL")); v != "" {
		cfg.DeepSeekModel = v
	} else {
		cfg.DeepSeekModel = "deepseek-chat"
	}
	if v := strings.TrimSpace(os.Getenv("OPENAI_MODEL")); v != "" {
		cfg.OpenAIModel = v
	} else {
		cfg.OpenAIModel = "gpt-5.2"
	}
	if v := strings.TrimSpace(os.Getenv("CLAUDE_MODEL")); v != "" {
		cfg.ClaudeModel = v
	} else {
		cfg.ClaudeModel = "claude-opus-4-6"
	}
	if v := strings.TrimSpace(os.Getenv("GEMINI_MODEL")); v != "" {
		cfg.GeminiModel = v
	} else {
		cfg.GeminiModel = "gemini-3-pro-preview"
	}
	if v := strings.TrimSpace(os.Getenv("QWEN_MODEL")); v != "" {
		cfg.QwenModel = v
	} else {
		cfg.QwenModel = "qwen3-max"
	}
	if v := strings.TrimSpace(os.Getenv("GROK_MODEL")); v != "" {
		cfg.GrokModel = v
	} else {
		cfg.GrokModel = "grok-3-latest"
	}
	if v := strings.TrimSpace(os.Getenv("KIMI_MODEL")); v != "" {
		cfg.KimiModel = v
	} else {
		cfg.KimiModel = "moonshot-v1-auto"
	}

	// Database configuration
	if v := os.Getenv("DB_TYPE"); v != "" {
		cfg.DBType = strings.ToLower(v)
	}
	if v := os.Getenv("DB_PATH"); v != "" {
		cfg.DBPath = v
	}
	if v := os.Getenv("DB_HOST"); v != "" {
		cfg.DBHost = v
	}
	if v := os.Getenv("DB_PORT"); v != "" {
		if port, err := strconv.Atoi(v); err == nil && port > 0 {
			cfg.DBPort = port
		}
	}
	if v := os.Getenv("DB_USER"); v != "" {
		cfg.DBUser = v
	}
	if v := os.Getenv("DB_PASSWORD"); v != "" {
		cfg.DBPassword = v
	}
	if v := os.Getenv("DB_NAME"); v != "" {
		cfg.DBName = v
	}
	if v := os.Getenv("DB_SSLMODE"); v != "" {
		cfg.DBSSLMode = v
	}

	global = cfg

	// Initialize experience improvement (installation ID will be set after database init)
	experience.Init(cfg.ExperienceImprovement, "")

	// Set up AI token usage tracking callback
	mcp.TokenUsageCallback = func(usage mcp.TokenUsage) {
		experience.TrackAIUsage(experience.AIUsageEvent{
			ModelProvider: usage.Provider,
			ModelName:     usage.Model,
			InputTokens:   usage.PromptTokens,
			OutputTokens:  usage.CompletionTokens,
		})
	}
}

// Get returns the global configuration
func Get() *Config {
	if global == nil {
		Init()
	}
	return global
}

// GetSystemAPIKey returns the system-level API key for the given AI provider.
// Returns empty string if no key is configured.
func (c *Config) GetSystemAPIKey(provider string) string {
	switch strings.ToLower(provider) {
	case "deepseek":
		return c.DeepSeekAPIKey
	case "openai":
		return c.OpenAIAPIKey
	case "claude":
		return c.ClaudeAPIKey
	case "gemini":
		return c.GeminiAPIKey
	case "qwen":
		return c.QwenAPIKey
	case "grok":
		return c.GrokAPIKey
	case "kimi":
		return c.KimiAPIKey
	default:
		return ""
	}
}

// GetSystemModelName returns the system-level model name for the given AI provider.
// Used when user has not set Custom Model Name in Config. Values come from .env
// (e.g. DEEPSEEK_MODEL, CLAUDE_MODEL) or built-in defaults.
func (c *Config) GetSystemModelName(provider string) string {
	switch strings.ToLower(provider) {
	case "deepseek":
		return c.DeepSeekModel
	case "openai":
		return c.OpenAIModel
	case "claude":
		return c.ClaudeModel
	case "gemini":
		return c.GeminiModel
	case "qwen":
		return c.QwenModel
	case "grok":
		return c.GrokModel
	case "kimi":
		return c.KimiModel
	default:
		return ""
	}
}

// EffectiveSolanaRPCURL returns SOLANA_RPC_URL, or a Helius mainnet JSON-RPC URL when HELIUS_API_KEY is set.
// Used for server-side token balance checks when no dedicated RPC URL is configured.
func (c *Config) EffectiveSolanaRPCURL() string {
	if strings.TrimSpace(c.SolanaRPCURL) != "" {
		return strings.TrimSpace(c.SolanaRPCURL)
	}
	if strings.TrimSpace(c.HeliusAPIKey) != "" {
		return "https://mainnet.helius-rpc.com/?api-key=" + url.QueryEscape(strings.TrimSpace(c.HeliusAPIKey))
	}
	return ""
}
