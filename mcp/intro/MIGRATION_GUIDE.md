# MCP Client Migration Guide

## Compatibility

Existing constructors continue to work:

```go
client := mcp.New()
deepSeek := mcp.NewDeepSeekClient()
qwen := mcp.NewQwenClient()
```

No immediate migration is required. Option-based constructors are recommended for new code and when a caller needs explicit dependencies.

## Constructor mapping

| Existing API | Preferred API |
| --- | --- |
| `mcp.New()` | `mcp.NewClient(opts...)` |
| `mcp.NewDeepSeekClient()` | `mcp.NewDeepSeekClientWithOptions(opts...)` |
| `mcp.NewQwenClient()` | `mcp.NewQwenClientWithOptions(opts...)` |

## Basic migration

Before:

```go
client := mcp.NewDeepSeekClient()
client.SetAPIKey(apiKey, customURL, modelName)
```

After:

```go
client := mcp.NewDeepSeekClientWithOptions(
    mcp.WithAPIKey(apiKey),
    mcp.WithBaseURL(customURL),
    mcp.WithModel(modelName),
    mcp.WithTimeout(60*time.Second),
    mcp.WithMaxRetries(5),
)
```

For Qwen, use `NewQwenClientWithOptions` with the same general options.

## Dependency injection

Applications may provide a custom logger:

```go
client := mcp.NewClient(
    mcp.WithDeepSeekConfig(apiKey),
    mcp.WithLogger(customLogger),
)
```

They may also provide an HTTP client, including a proxy-aware client or test double:

```go
httpClient := &http.Client{Timeout: 30 * time.Second}
client := mcp.NewClient(
    mcp.WithDeepSeekConfig(apiKey),
    mcp.WithHTTPClient(httpClient),
)
```

## Suggested rollout

1. Keep working legacy callers unchanged.
2. Migrate one construction site at a time to the option-based API.
3. Add explicit logging, HTTP, timeout, and retry configuration where needed.
4. Run the caller's tests after each migration.
5. Remove old setup code only after equivalent behavior is verified.

## Environment patterns

- Development: human-readable logs and modest retry limits.
- Production: structured, redacted logs; explicit timeouts; bounded retries.
- Tests: deterministic mock HTTP behavior and `NewNoopLogger()`.
- Proxied networks: inject a configured `http.Client` rather than changing package globals.

## Notes

- Do not configure the same setting through both a legacy setter and an option.
- Keep retries bounded and apply a request timeout.
- Never include secrets in logs or test fixtures.
- Validate provider-specific base URLs and model names during startup.
