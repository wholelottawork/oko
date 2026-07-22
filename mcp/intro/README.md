# MCP Client

This package provides a small, extensible client layer for model providers such as DeepSeek and Qwen.

## Features

- provider-specific clients behind a shared interface;
- functional options for dependency injection and configuration;
- configurable timeouts, retries, model parameters, and endpoints;
- replaceable HTTP and logging implementations;
- request-builder support for messages and function calls; and
- backward-compatible constructors.

## Quick start

```go
client := mcp.NewDeepSeekClientWithOptions(
    mcp.WithAPIKey(os.Getenv("DEEPSEEK_API_KEY")),
    mcp.WithTimeout(60*time.Second),
    mcp.WithMaxRetries(3),
)

result, err := client.CallWithMessages(
    "You are a concise assistant.",
    "Explain moving averages.",
)
if err != nil {
    log.Fatal(err)
}
fmt.Println(result)
```

Use `NewQwenClientWithOptions` and `WithAPIKey` for Qwen. Custom OpenAI-compatible deployments may also require `WithBaseURL` and `WithModel`.

## Request builder

```go
request := mcp.NewRequestBuilder().
    WithSystemPrompt("You are a quantitative analyst").
    WithUserPrompt("Analyze BTC/USDT market structure").
    WithTemperature(0.3).
    WithMaxTokens(1500).
    Build()

result, err := client.CallWithRequest(request)
```

See [Builder examples](BUILDER_EXAMPLES.md) for messages, presets, and function calling.

## Configuration

| Option | Purpose |
| --- | --- |
| `WithLogger(logger)` | Supply a custom logger |
| `WithHTTPClient(client)` | Supply an HTTP implementation or test double |
| `WithTimeout(duration)` | Set the request timeout |
| `WithMaxRetries(n)` | Set bounded retry attempts |
| `WithMaxTokens(n)` | Set the output-token limit |
| `WithTemperature(t)` | Set sampling temperature |
| `WithAPIKey(key)` | Set provider credentials |
| `WithBaseURL(url)` | Override the provider endpoint |
| `WithModel(name)` | Override the model |

## Design

Provider clients implement a shared template while keeping authentication and response parsing provider-specific. Small interfaces for HTTP and logging make unit tests deterministic and avoid locking applications to a logging framework.

Legacy constructors remain supported. New code should prefer option-based constructors because their dependencies and runtime behavior are explicit.

## Testing and security

Inject a mock HTTP client and `NewNoopLogger()` in unit tests. Never commit API keys or log authorization headers, request secrets, or unredacted provider responses containing sensitive data.

See the [migration guide](MIGRATION_GUIDE.md) for upgrading existing callers.
