package wallet

import (
	"fmt"

	"nofx/mcp"
)

const maxAgentIterations = 8

// rawCaller is satisfied by *mcp.Client and *mcp.DeepSeekClient (which embeds it)
type rawCaller interface {
	CallRaw(req *mcp.Request) ([]byte, error)
}

// AgentLoop runs the tool-calling loop: call AI, execute any tool_calls, append results, repeat.
// Returns the final text reply or an error. Stops after maxAgentIterations to prevent infinite loops.
func AgentLoop(client mcp.AIClient, req *mcp.Request) (string, error) {
	rc, ok := client.(rawCaller)
	if !ok {
		return client.CallWithRequest(req)
	}
	return agentLoopWithRawClient(rc, req)
}

func agentLoopWithRawClient(rc rawCaller, req *mcp.Request) (string, error) {
	lastContent := ""
	for i := 0; i < maxAgentIterations; i++ {
		body, err := rc.CallRaw(req)
		if err != nil {
			return "", err
		}

		content, toolCalls, err := mcp.ParseChatResponse(body)
		if err != nil {
			return "", err
		}
		if content != "" {
			lastContent = content
		}

		if len(toolCalls) == 0 {
			return content, nil
		}

		assistantMsg := mcp.Message{
			Role:      "assistant",
			ToolCalls: toolCalls,
		}
		req.Messages = append(req.Messages, assistantMsg)

		for _, tc := range toolCalls {
			args := tc.Function.Arguments
			if args == "" {
				args = "{}"
			}
			result, execErr := ExecuteTool(tc.Function.Name, args)
			if execErr != nil {
				result = fmt.Sprintf("Error: %v", execErr)
			}
			req.Messages = append(req.Messages, mcp.NewToolResultMessage(tc.ID, result))
		}
	}

	// Return whatever content the model produced last rather than hard-failing
	if lastContent != "" {
		return lastContent, nil
	}
	return "", fmt.Errorf("agent loop exceeded %d iterations without a text response", maxAgentIterations)
}
