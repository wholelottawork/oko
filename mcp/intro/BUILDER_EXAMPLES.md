# RequestBuilder Examples

## Basic request

```go
client := mcp.NewDeepSeekClientWithOptions(
    mcp.WithAPIKey(os.Getenv("DEEPSEEK_API_KEY")),
)

request := mcp.NewRequestBuilder().
    WithSystemPrompt("You are a helpful assistant").
    WithUserPrompt("What is the Go programming language?").
    Build()

result, err := client.CallWithRequest(request)
```

## Conversation history

```go
request := mcp.NewRequestBuilder().
    WithMessages([]mcp.Message{
        mcp.NewSystemMessage("You are a helpful assistant"),
        mcp.NewUserMessage("Hello"),
        mcp.NewAssistantMessage("How can I help?"),
        mcp.NewUserMessage("Explain moving averages"),
    }).
    WithTemperature(0.3).
    Build()
```

## Parameter control

Use low temperature and `top_p` for deterministic code generation:

```go
request := mcp.NewRequestBuilder().
    WithSystemPrompt("You are a Go expert").
    WithUserPrompt("Generate an HTTP server").
    WithTemperature(0.2).
    WithTopP(0.1).
    WithMaxTokens(2000).
    Build()
```

Use higher values for diverse creative output:

```go
request := mcp.NewRequestBuilder().
    WithSystemPrompt("You are a creative writer").
    WithUserPrompt("Write a short science-fiction story").
    WithTemperature(1.2).
    WithTopP(0.95).
    WithPresencePenalty(0.6).
    WithFrequencyPenalty(0.5).
    WithMaxTokens(4000).
    Build()
```

## Function calling

```go
weatherParameters := map[string]any{
    "type": "object",
    "properties": map[string]any{
        "city": map[string]any{"type": "string"},
    },
    "required": []string{"city"},
}

request := mcp.NewRequestBuilder().
    WithUserPrompt("What is the weather in Prague?").
    AddFunction("get_weather", "Get weather for a city", weatherParameters).
    WithToolChoice("auto").
    Build()

response, err := client.CallWithRequest(request)
```

Execute returned tool calls in the application, validate their arguments, and send tool results back as structured messages. Do not let model-generated arguments bypass authorization or input validation.

## Presets

```go
chat := mcp.ForChat().
    WithSystemPrompt("You are a friendly assistant").
    WithUserPrompt("Hello").
    Build()

code := mcp.ForCodeGeneration().
    WithUserPrompt("Generate a REST API in Go").
    Build()

creative := mcp.ForCreativeWriting().
    WithUserPrompt("Write a fantasy story").
    Build()
```

## Build errors

Use `Build()` when invalid user or configuration input should return an error. Use `MustBuild()` only for static requests that are guaranteed valid and where a startup panic is acceptable.
