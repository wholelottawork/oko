# Why the MCP Module Uses a Request Builder

## Motivation

A two-string call is convenient for a system prompt and a user prompt, but it does not scale cleanly to conversation history, sampling controls, stop sequences, function definitions, or provider-specific options. A builder keeps these concerns explicit without introducing a constructor with many positional parameters.

## Comparison

Simple calls remain available:

```go
result, err := client.CallWithMessages(systemPrompt, userPrompt)
```

For richer requests:

```go
request := mcp.NewRequestBuilder().
    WithSystemPrompt(systemPrompt).
    WithUserPrompt(userPrompt).
    WithTemperature(0.3).
    WithMaxTokens(2000).
    Build()

result, err := client.CallWithRequest(request)
```

## Benefits

- Readability: each value has a named method.
- Optional parameters: callers specify only what they need.
- Extensibility: new request fields do not break existing callers.
- Validation: `Build` can reject incomplete or contradictory requests.
- Reuse: presets can configure common workloads consistently.
- Type safety: message and tool definitions remain structured.

## Supported scenarios

### Conversation history

```go
request := mcp.NewRequestBuilder().
    WithMessages([]mcp.Message{
        mcp.NewSystemMessage("You are a trading assistant"),
        mcp.NewUserMessage("Summarize the current position"),
        mcp.NewAssistantMessage("The position is long BTC"),
        mcp.NewUserMessage("What is the main risk?"),
    }).
    Build()
```

### Function calling

```go
request := mcp.NewRequestBuilder().
    WithUserPrompt("Get the current BTC price").
    AddFunction("get_price", "Get an asset price", priceParameters).
    WithToolChoice("auto").
    Build()
```

### Presets

`ForChat`, `ForCodeGeneration`, and `ForCreativeWriting` provide sensible starting parameters. Callers can override individual settings afterward.

## Adoption

Keep `CallWithMessages` for straightforward requests. Use the builder when a request has conversation history, more than one optional parameter, tool definitions, or a reusable preset. Both APIs should delegate to the same validated request and provider-execution path.
