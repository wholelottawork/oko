# Hook Module

## Overview

The hook package provides typed extension points for behavior that can vary between deployments. Core code calls a named hook; optional modules register an implementation without creating a direct package dependency.

## Basic use

Register implementations during startup, before concurrent application work begins. Callers should use the typed result for each hook and handle the absence of an optional implementation.

## Available extension points

- `GETIP`: resolve a user's client IP address.
- `NEW_BINANCE_TRADER`: customize Binance client creation.
- `NEW_ASTER_TRADER`: customize Aster client creation.

## Registration pattern

```go
func init() {
    hook.Register(hook.GETIP, func(input any) (any, error) {
        request := input.(*http.Request)
        return resolveClientIP(request), nil
    })
}
```

Use the exact function and result types defined by the package; the snippet illustrates the lifecycle rather than replacing the exported API documentation.

## Adding an extension point

1. Define a result type that contains only the data callers need.
2. Add a uniquely named hook constant.
3. Call the hook from the core behavior and handle missing implementations safely.
4. Register the deployment-specific implementation during startup.
5. Add tests for registration, invocation, errors, and the no-handler case.

## Practices

- Keep hook contracts small, typed, and documented.
- Register once during startup; avoid mutation during request processing.
- Return errors instead of silently falling back after a handler has run.
- Do not use hooks as a substitute for ordinary function calls inside one module.
- Avoid circular calls between hooks.
- Make security-sensitive defaults explicit, especially for IP and credential handling.

Search for hook constants and their call sites in this directory to see the authoritative signatures.
