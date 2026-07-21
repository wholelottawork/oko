/**
 * SquidRouter API service for programmatic swaps.
 * Uses the same integrator ID as the widget.
 */

const SQUID_BASE = 'https://apiplus.squidrouter.com'
const INTEGRATOR_ID = import.meta.env.VITE_SQUID_INTEGRATOR_ID || 'oko-swap-widget-v1'

export interface SquidToken {
  chainId: string
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

export interface SquidChain {
  chainId: string
  networkIdentifier?: string
  type?: string
}

export interface SquidRouteParams {
  fromAddress: string
  fromChain: string
  fromToken: string
  fromAmount: string
  toChain: string
  toToken: string
  toAddress: string
  slippage?: number
  slippageConfig?: { autoMode?: number }
}

export interface TransactionRequest {
  target: string
  targetAddress?: string
  data: string
  value: string
  gasLimit?: string
}

export interface SquidRouteEstimate {
  fromAmount: string
  toAmount: string
  toAmountMin: string
  exchangeRate?: string
  gasCosts?: Array<{ amount: string; token: { symbol: string } }>
  feeCosts?: Array<{ amount: string; token: { symbol: string } }>
}

export interface SquidRoute {
  quoteId?: string
  estimate: SquidRouteEstimate
  transactionRequest: TransactionRequest
  params?: Record<string, unknown>
}

export interface SquidRouteResponse {
  route: SquidRoute
}

export interface SquidStatusResponse {
  squidTransactionStatus: string
}

let cachedTokens: SquidToken[] | null = null
let cachedChains: SquidChain[] | null = null

function getHeaders(): Record<string, string> {
  return {
    'x-integrator-id': INTEGRATOR_ID,
    'Content-Type': 'application/json',
  }
}

/**
 * Fetch and cache the full token list from SquidRouter
 */
export async function fetchTokenList(): Promise<SquidToken[]> {
  if (cachedTokens) return cachedTokens
  try {
    const res = await fetch(`${SQUID_BASE}/v2/tokens`, { headers: getHeaders() })
    if (!res.ok) throw new Error(`Squid tokens API: ${res.status}`)
    const data = await res.json()
    cachedTokens = Array.isArray(data) ? data : (data.tokens ?? data)
    if (!Array.isArray(cachedTokens)) cachedTokens = []
    return cachedTokens
  } catch (e) {
    throw new Error(`Failed to fetch Squid tokens: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/**
 * Fetch and cache the chain list from SquidRouter
 */
export async function fetchChainList(): Promise<SquidChain[]> {
  if (cachedChains) return cachedChains
  try {
    const res = await fetch(`${SQUID_BASE}/v2/chains`, { headers: getHeaders() })
    if (!res.ok) throw new Error(`Squid chains API: ${res.status}`)
    const data = await res.json()
    cachedChains = Array.isArray(data) ? data : (data.chains ?? data)
    if (!Array.isArray(cachedChains)) cachedChains = []
    return cachedChains
  } catch (e) {
    throw new Error(`Failed to fetch Squid chains: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/**
 * Resolve a token symbol to a SquidToken. Prefers chain hint if provided.
 */
export async function resolveToken(
  symbol: string,
  chainHint?: string
): Promise<SquidToken | null> {
  const tokens = await fetchTokenList()
  const sym = symbol.trim().toUpperCase()
  const matches = tokens.filter((t) => t.symbol?.toUpperCase() === sym)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]
  if (chainHint) {
    const hint = chainHint.toLowerCase()
    const byChain = matches.find(
      (t) =>
        t.chainId?.toLowerCase().includes(hint) ||
        t.chainId === chainHint
    )
    if (byChain) return byChain
  }
  // Prefer common chains: ethereum (1), solana, arbitrum (42161)
  const order = ['1', 'solana-mainnet-beta', '42161', '56', '137', '8453']
  for (const cid of order) {
    const t = matches.find((m) => m.chainId === cid)
    if (t) return t
  }
  return matches[0]
}

/**
 * Get a swap route from SquidRouter
 */
export async function getRoute(
  params: SquidRouteParams
): Promise<{ route: SquidRoute; requestId: string | null }> {
  const res = await fetch(`${SQUID_BASE}/v2/route`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...params,
      slippage: params.slippage ?? 1,
      slippageConfig: params.slippageConfig ?? { autoMode: 1 },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? err.error ?? `Squid route API: ${res.status}`)
  }
  const requestId = res.headers.get('x-request-id')
  const data: SquidRouteResponse = await res.json()
  return { route: data.route, requestId }
}

/**
 * Get swap transaction status
 */
export async function getStatus(
  transactionId: string,
  requestId: string,
  fromChainId: string,
  toChainId: string,
  quoteId?: string
): Promise<SquidStatusResponse> {
  const params = new URLSearchParams({
    transactionId,
    requestId,
    fromChainId,
    toChainId,
    ...(quoteId && { quoteId }),
  })
  const res = await fetch(`${SQUID_BASE}/v2/status?${params}`, { headers: getHeaders() })
  if (!res.ok) throw new Error(`Squid status API: ${res.status}`)
  return res.json()
}
