package mcp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// ResponsesRequest is the request body for the xAI Responses API (/v1/responses).
// It uses "input" instead of "messages" and supports server-side tools (web_search, x_search).
type ResponsesRequest struct {
	Model           string   `json:"model"`
	Input           []any    `json:"input"`
	Tools           []any    `json:"tools,omitempty"`
	Store           bool     `json:"store"`
	MaxOutputTokens int      `json:"max_output_tokens,omitempty"`
	Temperature     *float64 `json:"temperature,omitempty"`
}

// ResponsesResult is the top-level response from the xAI Responses API.
type ResponsesResult struct {
	ID     string           `json:"id"`
	Output []ResponseOutput `json:"output"`
	Usage  *ResponsesUsage  `json:"usage,omitempty"`
}

// ResponseOutput represents one item in the Responses API output array.
// Type can be "message" (final text), "web_search_call", "x_search_call", etc.
type ResponseOutput struct {
	Type    string            `json:"type"`
	Role    string            `json:"role,omitempty"`
	Content []ResponseContent `json:"content,omitempty"`
}

// ResponseContent represents a content block inside a "message" output item.
type ResponseContent struct {
	Type string `json:"type"` // "output_text"
	Text string `json:"text"`
}

// ResponsesUsage reports token consumption for a Responses API call.
type ResponsesUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// ResponsesCaller is the interface for calling the xAI Responses API.
type ResponsesCaller interface {
	CallResponses(req *ResponsesRequest) (*ResponsesResult, error)
}

// CallResponses sends a request to the xAI Responses API and returns the parsed result.
func (c *GrokClient) CallResponses(req *ResponsesRequest) (*ResponsesResult, error) {
	if c.APIKey == "" {
		return nil, fmt.Errorf("AI API key not set, please call SetAPIKey first")
	}
	if req.Model == "" {
		req.Model = c.Model
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize Responses request: %w", err)
	}

	url := fmt.Sprintf("%s/responses", c.BaseURL)
	c.logger.Infof("📡 [Grok Responses] POST %s (model=%s, input=%d items, tools=%d)",
		url, req.Model, len(req.Input), len(req.Tools))

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	c.hooks.setAuthHeader(httpReq.Header)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Responses API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result ResponsesResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse Responses API response: %w", err)
	}

	if result.Usage != nil && TokenUsageCallback != nil {
		TokenUsageCallback(TokenUsage{
			Provider:         ProviderGrok,
			Model:            req.Model,
			PromptTokens:     result.Usage.InputTokens,
			CompletionTokens: result.Usage.OutputTokens,
			TotalTokens:      result.Usage.TotalTokens,
		})
	}

	return &result, nil
}

// ExtractText returns the text content from a Responses API result.
// It looks for the last "message" output item and concatenates its text blocks.
func (r *ResponsesResult) ExtractText() string {
	for i := len(r.Output) - 1; i >= 0; i-- {
		item := r.Output[i]
		if item.Type == "message" {
			var text string
			for _, c := range item.Content {
				if c.Type == "output_text" {
					text += c.Text
				}
			}
			return text
		}
	}
	return ""
}
