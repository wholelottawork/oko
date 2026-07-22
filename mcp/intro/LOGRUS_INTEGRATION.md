# Logrus Integration Guide

The MCP client accepts its own small logger interface. An adapter lets applications use Logrus without coupling the MCP package to it.

## Install

```bash
go get github.com/sirupsen/logrus
```

## Adapter

```go
type LogrusLogger struct {
    logger *logrus.Logger
}

func NewLogrusLogger(logger *logrus.Logger) *LogrusLogger {
    return &LogrusLogger{logger: logger}
}

func (l *LogrusLogger) Debugf(format string, args ...any) {
    l.logger.Debugf(format, args...)
}

func (l *LogrusLogger) Infof(format string, args ...any) {
    l.logger.Infof(format, args...)
}

func (l *LogrusLogger) Warnf(format string, args ...any) {
    l.logger.Warnf(format, args...)
}

func (l *LogrusLogger) Errorf(format string, args ...any) {
    l.logger.Errorf(format, args...)
}
```

## Client setup

```go
logger := logrus.New()
logger.SetLevel(logrus.InfoLevel)
logger.SetFormatter(&logrus.JSONFormatter{})

client := mcp.NewDeepSeekClientWithOptions(
    mcp.WithAPIKey(os.Getenv("DEEPSEEK_API_KEY")),
    mcp.WithLogger(NewLogrusLogger(logger)),
    mcp.WithMaxRetries(5),
)
```

Use a text formatter with colors for local development and JSON for production log aggregation. Set fixed application fields at the adapter boundary if the logger interface does not expose structured fields.

## Practices

- Do not log API keys, authorization headers, or sensitive prompts.
- Redact provider responses that can contain user data.
- Use debug logs for request diagnostics and info logs for lifecycle events.
- Preserve error values and request identifiers for troubleshooting.
- Avoid logging full payloads in high-throughput production paths.

For tests that do not inspect logging behavior, inject `mcp.NewNoopLogger()`.
