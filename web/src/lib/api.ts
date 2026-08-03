import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  TraderConfigData,
  AIModel,
  Exchange,
  CreateTraderRequest,
  CreateExchangeRequest,
  UpdateModelConfigRequest,
  UpdateExchangeConfigRequest,
  CompetitionData,
  BacktestRunsResponse,
  BacktestStartConfig,
  BacktestStatusPayload,
  BacktestEquityPoint,
  BacktestTradeEvent,
  BacktestMetrics,
  BacktestRunMetadata,
  BacktestKlinesResponse,
  Strategy,
  StrategyConfig,
  DebateSession,
  DebateSessionWithDetails,
  CreateDebateRequest,
  DebateMessage,
  DebateVote,
  DebatePersonalityInfo,
  PositionHistoryResponse,
  WalletBalancesResponse,
} from '../types'
import { CryptoService } from './crypto'
import { httpClient } from './httpClient'
import { apiUrl } from './config'

export const API_BASE = '/api'

// Reads the dashboard polls on a timer. They 404 whenever the trader is not
// loaded in memory (stopped, or failed to load), which is a normal state - the
// page renders its own notice instead of a toast per endpoint per interval.
const SILENT_POLL = { silent: true } as const

export interface WalletChatSwapIntent {
  action: string
  fromToken: string
  toToken: string
  amount: string
  fromChain?: string
  toChain?: string
  toAddress?: string
}

export type AssistantMode = 'deep-think'

export interface ChatHistoryEntry {
  role: string
  content: string
}

export interface GeneralChatRequest {
  message: string
  history: ChatHistoryEntry[]
  assistantMode?: AssistantMode
}

export interface WalletChatRequest {
  message: string
  initialAnalysis: string
  history: ChatHistoryEntry[]
  assistantMode?: AssistantMode
}

export interface UpgradeEligibilityResponse {
  configured: boolean
  address: string
  tokenAddress: string
  chainId: number
  chainName: string
  decimals?: number
  threshold: number
  totalBalance: number
  missingBalance?: number
  eligible: boolean
}

// Helper function to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

async function handleJSONResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let message = text || res.statusText
    try {
      const data = text ? JSON.parse(text) : null
      if (data && typeof data === 'object') {
        message = data.error || data.message || message
      }
    } catch {
      /* ignore JSON parse errors */
    }
    throw new Error(message || '')
  }
  if (!text) {
    return {} as T
  }
  return JSON.parse(text) as T
}

export const api = {
  // AI trader management interface
  async getTraders(): Promise<TraderInfo[]> {
    const result = await httpClient.get<TraderInfo[]>(`${API_BASE}/my-traders`)
    if (!result.success) throw new Error('trader')
    return Array.isArray(result.data) ? result.data : []
  },

  // Get a list of public traders (no certification required)
  async getPublicTraders(): Promise<any[]> {
    const result = await httpClient.get<any[]>(`${API_BASE}/traders`)
    if (!result.success) throw new Error('trader')
    return result.data!
  },

  // Wallet Analyzer - token balances (no auth required)
  async getWalletBalances(address: string): Promise<WalletBalancesResponse> {
    const result = await httpClient.get<WalletBalancesResponse>(
      `${API_BASE}/wallet/${encodeURIComponent(address)}/balances`
    )
    if (!result.success)
      throw new Error(result.message || 'Failed to fetch wallet balances')
    return result.data ?? { assets: [], totalBalanceUsd: '0' }
  },

  async getUpgradeEligibility(
    address: string
  ): Promise<UpgradeEligibilityResponse> {
    const result = await httpClient.get<UpgradeEligibilityResponse>(
      `${API_BASE}/wallet/${encodeURIComponent(address)}/upgrade-eligibility`
    )
    if (!result.success)
      throw new Error(result.message || 'Failed to check upgrade eligibility')
    return result.data ?? {
      configured: false,
      address,
      tokenAddress: '',
      chainId: 4663,
      chainName: 'Robinhood Chain',
      threshold: 150_000,
      totalBalance: 0,
      eligible: false,
    }
  },

  // General chat (no wallet context) - for crypto Q&A, prices, etc.
  async postGeneralChat(
    body: GeneralChatRequest,
    lang?: string
  ): Promise<{ reply: string; swapIntent?: WalletChatSwapIntent }> {
    const url = lang
      ? `${API_BASE}/chat?lang=${encodeURIComponent(lang)}`
      : `${API_BASE}/chat`
    const result = await httpClient.post<{
      reply: string
      swapIntent?: WalletChatSwapIntent
    }>(url, body)
    if (!result.success)
      throw new Error(result.message || 'Chat request failed')
    return result.data ?? { reply: '' }
  },

  // Wallet Analyzer - chat with AI about wallet analysis (follow-up questions)
  async postWalletChat(
    address: string,
    body: WalletChatRequest,
    lang?: string
  ): Promise<{ reply: string; swapIntent?: WalletChatSwapIntent }> {
    let url = `${API_BASE}/wallet/${encodeURIComponent(address)}/chat`
    if (lang) url += `?lang=${encodeURIComponent(lang)}`
    const result = await httpClient.post<{
      reply: string
      swapIntent?: WalletChatSwapIntent
    }>(url, body)
    if (!result.success)
      throw new Error(result.message || 'Chat request failed')
    return result.data ?? { reply: '' }
  },

  async createTrader(request: CreateTraderRequest): Promise<TraderInfo> {
    const result = await httpClient.post<TraderInfo>(
      `${API_BASE}/traders`,
      request
    )
    if (!result.success) throw new Error(result.message || '')
    return result.data!
  },

  async deleteTrader(traderId: string): Promise<void> {
    const result = await httpClient.delete(`${API_BASE}/traders/${traderId}`)
    if (!result.success) throw new Error(result.message || '')
  },

  async startTrader(traderId: string): Promise<void> {
    const result = await httpClient.post(
      `${API_BASE}/traders/${traderId}/start`
    )
    if (!result.success) throw new Error(result.message || '')
  },

  async stopTrader(traderId: string): Promise<void> {
    const result = await httpClient.post(`${API_BASE}/traders/${traderId}/stop`)
    if (!result.success) throw new Error(result.message || '')
  },

  async toggleCompetition(
    traderId: string,
    showInCompetition: boolean
  ): Promise<void> {
    const result = await httpClient.put(
      `${API_BASE}/traders/${traderId}/competition`,
      { show_in_competition: showInCompetition }
    )
    if (!result.success) throw new Error(result.message || '')
  },

  async closePosition(
    traderId: string,
    symbol: string,
    side: string
  ): Promise<{ message: string }> {
    const result = await httpClient.post<{ message: string }>(
      `${API_BASE}/traders/${traderId}/close-position`,
      { symbol, side }
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async updateTraderPrompt(
    traderId: string,
    customPrompt: string
  ): Promise<void> {
    const result = await httpClient.put(
      `${API_BASE}/traders/${traderId}/prompt`,
      { custom_prompt: customPrompt }
    )
    if (!result.success) throw new Error('')
  },

  async getTraderConfig(traderId: string): Promise<TraderConfigData> {
    const result = await httpClient.get<TraderConfigData>(
      `${API_BASE}/traders/${traderId}/config`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async updateTrader(
    traderId: string,
    request: CreateTraderRequest
  ): Promise<TraderInfo> {
    const result = await httpClient.put<TraderInfo>(
      `${API_BASE}/traders/${traderId}`,
      request
    )
    if (!result.success) throw new Error(result.message || '')
    return result.data!
  },

  // AI model configuration interface
  async getModelConfigs(): Promise<AIModel[]> {
    const result = await httpClient.get<AIModel[]>(`${API_BASE}/models`)
    if (!result.success) throw new Error('')
    return Array.isArray(result.data) ? result.data : []
  },

  // Get the list of AI models supported by the system (no certification required)
  async getSupportedModels(): Promise<AIModel[]> {
    const result = await httpClient.get<AIModel[]>(
      `${API_BASE}/supported-models`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async getPromptTemplates(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/prompt-templates`)
    if (!res.ok) throw new Error('')
    const data = await res.json()
    if (Array.isArray(data.templates)) {
      return data.templates.map((item: { name: string }) => item.name)
    }
    return []
  },

  async updateModelConfigs(request: UpdateModelConfigRequest): Promise<void> {
    // Check if transport encryption is enabled
    const config = await CryptoService.fetchCryptoConfig()

    if (!config.transport_encryption) {
      // When transmission encryption is disabled, plain text is sent directly.
      const result = await httpClient.put(`${API_BASE}/models`, request)
      if (!result.success) throw new Error('')
      return
    }

    // Get RSA public key
    const publicKey = await CryptoService.fetchPublicKey()

    // Initialize encryption service
    await CryptoService.initialize(publicKey)

    // Get user information (from localStorage or elsewhere)
    const userId = localStorage.getItem('user_id') || ''
    const sessionId = sessionStorage.getItem('session_id') || ''

    // Encrypt sensitive data
    const encryptedPayload = await CryptoService.encryptSensitiveData(
      JSON.stringify(request),
      userId,
      sessionId
    )

    // Send encrypted data
    const result = await httpClient.put(`${API_BASE}/models`, encryptedPayload)
    if (!result.success) throw new Error('')
  },

  // Exchange configuration interface
  async getExchangeConfigs(): Promise<Exchange[]> {
    const result = await httpClient.get<Exchange[]>(`${API_BASE}/exchanges`)
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get a list of exchanges supported by the system (no certification required)
  async getSupportedExchanges(): Promise<Exchange[]> {
    const result = await httpClient.get<Exchange[]>(
      `${API_BASE}/supported-exchanges`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async updateExchangeConfigs(
    request: UpdateExchangeConfigRequest
  ): Promise<void> {
    const result = await httpClient.put(`${API_BASE}/exchanges`, request)
    if (!result.success) throw new Error('')
  },

  // Create new exchange account
  async createExchange(
    request: CreateExchangeRequest
  ): Promise<{ id: string }> {
    const result = await httpClient.post<{ id: string }>(
      `${API_BASE}/exchanges`,
      request
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Create new exchange account (encrypted transfer)
  async createExchangeEncrypted(
    request: CreateExchangeRequest
  ): Promise<{ id: string }> {
    // Check if transport encryption is enabled
    const config = await CryptoService.fetchCryptoConfig()

    if (!config.transport_encryption) {
      // When transmission encryption is disabled, plain text is sent directly.
      const result = await httpClient.post<{ id: string }>(
        `${API_BASE}/exchanges`,
        request
      )
      if (!result.success) throw new Error('')
      return result.data!
    }

    // Get RSA public key
    const publicKey = await CryptoService.fetchPublicKey()

    // Initialize encryption service
    await CryptoService.initialize(publicKey)

    // Get user information
    const userId = localStorage.getItem('user_id') || ''
    const sessionId = sessionStorage.getItem('session_id') || ''

    // Encrypt sensitive data
    const encryptedPayload = await CryptoService.encryptSensitiveData(
      JSON.stringify(request),
      userId,
      sessionId
    )

    // Send encrypted data
    const result = await httpClient.post<{ id: string }>(
      `${API_BASE}/exchanges`,
      encryptedPayload
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Delete exchange account
  async deleteExchange(exchangeId: string): Promise<void> {
    const result = await httpClient.delete(
      `${API_BASE}/exchanges/${exchangeId}`
    )
    if (!result.success) throw new Error('')
  },

  // Update exchange configuration with encrypted transfers (automatically detects whether encryption is enabled)
  async updateExchangeConfigsEncrypted(
    request: UpdateExchangeConfigRequest
  ): Promise<void> {
    // Check if transport encryption is enabled
    const config = await CryptoService.fetchCryptoConfig()

    if (!config.transport_encryption) {
      // When transmission encryption is disabled, plain text is sent directly.
      const result = await httpClient.put(`${API_BASE}/exchanges`, request)
      if (!result.success) throw new Error('')
      return
    }

    // Get RSA public key
    const publicKey = await CryptoService.fetchPublicKey()

    // Initialize encryption service
    await CryptoService.initialize(publicKey)

    // Get user information (from localStorage or elsewhere)
    const userId = localStorage.getItem('user_id') || ''
    const sessionId = sessionStorage.getItem('session_id') || ''

    // Encrypt sensitive data
    const encryptedPayload = await CryptoService.encryptSensitiveData(
      JSON.stringify(request),
      userId,
      sessionId
    )

    // Send encrypted data
    const result = await httpClient.put(
      `${API_BASE}/exchanges`,
      encryptedPayload
    )
    if (!result.success) throw new Error('')
  },

  // Get system status (supports trader_id)
  async getStatus(traderId?: string): Promise<SystemStatus> {
    const url = traderId
      ? `${API_BASE}/status?trader_id=${traderId}`
      : `${API_BASE}/status`
    // Polled by the dashboard - stay silent so a stopped trader does not
    // produce a toast per endpoint per refresh (see SILENT_POLL).
    const result = await httpClient.get<SystemStatus>(url, undefined, undefined, SILENT_POLL)
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get account information (supports trader_id)
  async getAccount(traderId?: string): Promise<AccountInfo> {
    const url = traderId
      ? `${API_BASE}/account?trader_id=${traderId}`
      : `${API_BASE}/account`
    const result = await httpClient.get<AccountInfo>(url, undefined, undefined, SILENT_POLL)
    if (!result.success) throw new Error('')
    console.log('Account data fetched:', result.data)
    return result.data!
  },

  // Get the position list (supports trader_id)
  async getPositions(traderId?: string): Promise<Position[]> {
    const url = traderId
      ? `${API_BASE}/positions?trader_id=${traderId}`
      : `${API_BASE}/positions`
    const result = await httpClient.get<Position[]>(url, undefined, undefined, SILENT_POLL)
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get decision log (supports trader_id)
  async getDecisions(traderId?: string): Promise<DecisionRecord[]> {
    const url = traderId
      ? `${API_BASE}/decisions?trader_id=${traderId}`
      : `${API_BASE}/decisions`
    const result = await httpClient.get<DecisionRecord[]>(url)
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get the latest decision (supports trader_id and limit parameters)
  async getLatestDecisions(
    traderId?: string,
    limit: number = 5
  ): Promise<DecisionRecord[]> {
    const params = new URLSearchParams()
    if (traderId) {
      params.append('trader_id', traderId)
    }
    params.append('limit', limit.toString())

    const result = await httpClient.get<DecisionRecord[]>(
      `${API_BASE}/decisions/latest?${params}`,
      undefined,
      undefined,
      SILENT_POLL
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get statistics (supports trader_id)
  async getStatistics(traderId?: string): Promise<Statistics> {
    const url = traderId
      ? `${API_BASE}/statistics?trader_id=${traderId}`
      : `${API_BASE}/statistics`
    const result = await httpClient.get<Statistics>(url, undefined, undefined, SILENT_POLL)
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get historical return data (trader_id supported)
  async getEquityHistory(traderId?: string): Promise<any[]> {
    const url = traderId
      ? `${API_BASE}/equity-history?trader_id=${traderId}`
      : `${API_BASE}/equity-history`
    const result = await httpClient.get<any[]>(url)
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Obtain historical data of multiple traders in batches (no authentication required)
  // hours: Optional parameter, obtain the data of the last N hours (0 means all data)
  // Common values: 24=1 day, 72=3 days, 168=7 days, 720=30 days, 0=all
  async getEquityHistoryBatch(
    traderIds: string[],
    hours?: number
  ): Promise<any> {
    const result = await httpClient.post<any>(
      `${API_BASE}/equity-history-batch`,
      { trader_ids: traderIds, hours: hours || 0 }
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get data of top 5 traders (no authentication required)
  async getTopTraders(): Promise<any[]> {
    const result = await httpClient.get<any[]>(`${API_BASE}/top-traders`)
    if (!result.success) throw new Error('5')
    return result.data!
  },

  // Get public trader configuration (no authentication required)
  async getPublicTraderConfig(traderId: string): Promise<any> {
    const result = await httpClient.get<any>(
      `${API_BASE}/trader/${traderId}/config`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get competition data (no authentication required)
  async getCompetition(): Promise<CompetitionData> {
    const result = await httpClient.get<CompetitionData>(
      `${API_BASE}/competition`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Get server IP (requires authentication, used for whitelist configuration)
  async getServerIP(): Promise<{
    public_ip: string
    message: string
  }> {
    const result = await httpClient.get<{
      public_ip: string
      message: string
    }>(`${API_BASE}/server-ip`)
    if (!result.success) throw new Error('IP')
    return result.data!
  },

  // Backtest APIs
  async getBacktestRuns(params?: {
    state?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<BacktestRunsResponse> {
    const query = new URLSearchParams()
    if (params?.state) query.set('state', params.state)
    if (params?.search) query.set('search', params.search)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    const res = await fetch(
      `${API_BASE}/backtest/runs${query.toString() ? `?${query}` : ''}`,
      {
        headers: getAuthHeaders(),
      }
    )
    return handleJSONResponse<BacktestRunsResponse>(res)
  },

  async startBacktest(
    config: BacktestStartConfig
  ): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ config }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async pauseBacktest(runId: string): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async resumeBacktest(runId: string): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async stopBacktest(runId: string): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/stop`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async updateBacktestLabel(
    runId: string,
    label: string
  ): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/label`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId, label }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async deleteBacktestRun(runId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/backtest/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    if (!res.ok) {
      throw new Error(await res.text())
    }
  },

  async getBacktestStatus(runId: string): Promise<BacktestStatusPayload> {
    const res = await fetch(`${API_BASE}/backtest/status?run_id=${runId}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestStatusPayload>(res)
  },

  async getBacktestEquity(
    runId: string,
    timeframe?: string,
    limit?: number
  ): Promise<BacktestEquityPoint[]> {
    const query = new URLSearchParams({ run_id: runId })
    if (timeframe) query.set('tf', timeframe)
    if (limit) query.set('limit', String(limit))
    const res = await fetch(`${API_BASE}/backtest/equity?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestEquityPoint[]>(res)
  },

  async getBacktestTrades(
    runId: string,
    limit = 200
  ): Promise<BacktestTradeEvent[]> {
    const query = new URLSearchParams({
      run_id: runId,
      limit: String(limit),
    })
    const res = await fetch(`${API_BASE}/backtest/trades?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestTradeEvent[]>(res)
  },

  async getBacktestMetrics(runId: string): Promise<BacktestMetrics> {
    const res = await fetch(`${API_BASE}/backtest/metrics?run_id=${runId}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestMetrics>(res)
  },

  async getBacktestKlines(
    runId: string,
    symbol: string,
    timeframe?: string
  ): Promise<BacktestKlinesResponse> {
    const query = new URLSearchParams({ run_id: runId, symbol })
    if (timeframe) query.set('timeframe', timeframe)
    const res = await fetch(`${API_BASE}/backtest/klines?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestKlinesResponse>(res)
  },

  async getBacktestTrace(
    runId: string,
    cycle?: number
  ): Promise<DecisionRecord> {
    const query = new URLSearchParams({ run_id: runId })
    if (cycle) query.set('cycle', String(cycle))
    const res = await fetch(`${API_BASE}/backtest/trace?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<DecisionRecord>(res)
  },

  async getBacktestDecisions(
    runId: string,
    limit = 20,
    offset = 0
  ): Promise<DecisionRecord[]> {
    const query = new URLSearchParams({
      run_id: runId,
      limit: String(limit),
      offset: String(offset),
    })
    const res = await fetch(`${API_BASE}/backtest/decisions?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<DecisionRecord[]>(res)
  },

  async getBacktestConfig(runId: string): Promise<BacktestStartConfig> {
    const res = await fetch(`${API_BASE}/backtest/config?run_id=${runId}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestStartConfig>(res)
  },

  async exportBacktest(runId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/backtest/export?run_id=${runId}`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const text = await res.text()
      try {
        const data = text ? JSON.parse(text) : null
        throw new Error(
          data?.error || data?.message || text || '，'
        )
      } catch (err) {
        if (err instanceof Error && err.message) {
          throw err
        }
        throw new Error(text || '，')
      }
    }
    return res.blob()
  },

  // Strategy APIs
  async getStrategies(): Promise<Strategy[]> {
    const result = await httpClient.get<{ strategies: Strategy[] }>(
      `${API_BASE}/strategies`
    )
    if (!result.success) throw new Error('')
    const strategies = result.data?.strategies
    return Array.isArray(strategies) ? strategies : []
  },

  async getStrategy(strategyId: string): Promise<Strategy> {
    const result = await httpClient.get<Strategy>(
      `${API_BASE}/strategies/${strategyId}`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async getActiveStrategy(): Promise<Strategy> {
    const result = await httpClient.get<Strategy>(
      `${API_BASE}/strategies/active`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async getDefaultStrategyConfig(): Promise<StrategyConfig> {
    const result = await httpClient.get<StrategyConfig>(
      `${API_BASE}/strategies/default-config`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async createStrategy(data: {
    name: string
    description: string
    config: StrategyConfig
  }): Promise<Strategy> {
    const result = await httpClient.post<Strategy>(
      `${API_BASE}/strategies`,
      data
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async updateStrategy(
    strategyId: string,
    data: {
      name?: string
      description?: string
      config?: StrategyConfig
    }
  ): Promise<Strategy> {
    const result = await httpClient.put<Strategy>(
      `${API_BASE}/strategies/${strategyId}`,
      data
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async deleteStrategy(strategyId: string): Promise<void> {
    const result = await httpClient.delete(
      `${API_BASE}/strategies/${strategyId}`
    )
    if (!result.success) throw new Error('')
  },

  async activateStrategy(strategyId: string): Promise<Strategy> {
    const result = await httpClient.post<Strategy>(
      `${API_BASE}/strategies/${strategyId}/activate`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async duplicateStrategy(strategyId: string): Promise<Strategy> {
    const result = await httpClient.post<Strategy>(
      `${API_BASE}/strategies/${strategyId}/duplicate`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  // Debate Arena APIs
  async getDebates(): Promise<DebateSession[]> {
    const result = await httpClient.get<DebateSession[]>(`${API_BASE}/debates`)
    if (!result.success) throw new Error('')
    return Array.isArray(result.data) ? result.data : []
  },

  async getDebate(debateId: string): Promise<DebateSessionWithDetails> {
    const result = await httpClient.get<DebateSessionWithDetails>(
      `${API_BASE}/debates/${debateId}`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async createDebate(
    request: CreateDebateRequest
  ): Promise<DebateSessionWithDetails> {
    const result = await httpClient.post<DebateSessionWithDetails>(
      `${API_BASE}/debates`,
      request
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async startDebate(debateId: string): Promise<void> {
    const result = await httpClient.post(
      `${API_BASE}/debates/${debateId}/start`
    )
    if (!result.success) throw new Error('')
  },

  async cancelDebate(debateId: string): Promise<void> {
    const result = await httpClient.post(
      `${API_BASE}/debates/${debateId}/cancel`
    )
    if (!result.success) throw new Error('')
  },

  async executeDebate(
    debateId: string,
    traderId: string
  ): Promise<DebateSessionWithDetails> {
    const result = await httpClient.post<{
      message: string
      session: DebateSessionWithDetails
    }>(`${API_BASE}/debates/${debateId}/execute`, { trader_id: traderId })
    if (!result.success) throw new Error('')
    return result.data!.session
  },

  async deleteDebate(debateId: string): Promise<void> {
    const result = await httpClient.delete(`${API_BASE}/debates/${debateId}`)
    if (!result.success) throw new Error('')
  },

  async getDebateMessages(debateId: string): Promise<DebateMessage[]> {
    const result = await httpClient.get<DebateMessage[]>(
      `${API_BASE}/debates/${debateId}/messages`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async getDebateVotes(debateId: string): Promise<DebateVote[]> {
    const result = await httpClient.get<DebateVote[]>(
      `${API_BASE}/debates/${debateId}/votes`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },

  async getDebatePersonalities(): Promise<DebatePersonalityInfo[]> {
    const result = await httpClient.get<DebatePersonalityInfo[]>(
      `${API_BASE}/debates/personalities`
    )
    if (!result.success) throw new Error('AI')
    return result.data!
  },

  // SSE stream for live debate updates
  createDebateStream(debateId: string): EventSource {
    const token = localStorage.getItem('auth_token')
    return new EventSource(
      apiUrl(`${API_BASE}/debates/${debateId}/stream?token=${token}`)
    )
  },

  // Position History API
  async getPositionHistory(
    traderId: string,
    limit: number = 100
  ): Promise<PositionHistoryResponse> {
    const result = await httpClient.get<PositionHistoryResponse>(
      `${API_BASE}/positions/history?trader_id=${traderId}&limit=${limit}`
    )
    if (!result.success) throw new Error('')
    return result.data!
  },
}
