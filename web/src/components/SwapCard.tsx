import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { useSendTransaction, useWalletClient, useSwitchChain, useWriteContract, useBalance } from 'wagmi'
import { parseUnits, erc20Abi as _erc20Abi, createPublicClient, http } from 'viem'
import {
  ArrowDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Wallet,
  ExternalLink,
  Info,
} from 'lucide-react'
import {
  fetchTokenList,
  resolveToken,
  getRoute,
  getStatus,
  type SquidToken,
  type SquidRoute,
} from '../lib/squidRouter'

export interface SwapIntent {
  action: string
  fromToken: string
  toToken: string
  amount: string
  fromChain?: string
  toChain?: string
  toAddress?: string
}

interface SwapCardProps {
  intent: SwapIntent
  address: string | undefined
  language?: 'en' | 'zh'
  destAddressOverride?: string
}

type CardState =
  | 'preview'
  | 'resolving'
  | 'quote'
  | 'approving'
  | 'confirming'
  | 'pending'
  | 'success'
  | 'error'

const NATIVE_EVM = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const CHAIN_NAMES: Record<string, string> = {
  '1': 'Ethereum',
  '56': 'BNB Chain',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '10': 'Optimism',
  '8453': 'Base',
  '43114': 'Avalanche',
  '250': 'Fantom',
  '42220': 'Celo',
  'solana-mainnet-beta': 'Solana',
}

const CHAIN_COLORS: Record<string, string> = {
  '1': '#627EEA',
  '56': '#F3BA2F',
  '137': '#8247E5',
  '42161': '#28A0F0',
  '10': '#FF0420',
  '8453': '#0052FF',
  '43114': '#E84142',
  'solana-mainnet-beta': '#9945FF',
}

function TokenLogo({ token, size = 36 }: { token: SquidToken | null; size?: number }) {
  const [err, setErr] = useState(false)
  if (token?.logoURI && !err) {
    return (
      <img
        src={token.logoURI}
        alt={token.symbol}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size, minWidth: size }}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: 'var(--accent-primary)',
        fontSize: size * 0.3,
      }}
    >
      {(token?.symbol ?? '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

function NetworkBadge({ chainId }: { chainId: string | undefined }) {
  if (!chainId) return null
  const name = CHAIN_NAMES[chainId] ?? chainId
  const color = CHAIN_COLORS[chainId] ?? 'var(--accent-primary)'
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
      style={{ background: `${color}22`, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color, minWidth: 6 }}
      />
      {name}
    </span>
  )
}

function TokenPanel({
  label,
  token,
  symbol,
  amount,
  chainId,
  usdValue,
}: {
  label: string
  token: SquidToken | null
  symbol: string
  amount?: string
  chainId?: string
  usdValue?: string
}) {
  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#B0B8BB' }}>
          {label}
        </span>
        {chainId && <NetworkBadge chainId={chainId} />}
      </div>
      <div className="flex items-center gap-3">
        <TokenLogo token={token} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold" style={{ color: '#F6FEFD' }}>
              {amount ?? '—'}
            </span>
            <span className="text-sm font-medium" style={{ color: '#B0B8BB' }}>
              {symbol || (token?.symbol ?? '…')}
            </span>
          </div>
          {token?.name && (
            <div className="text-[10px] mt-0.5 truncate" style={{ color: '#8FA8A5' }}>
              {token.name}
            </div>
          )}
        </div>
        {usdValue && (
          <div className="text-xs text-right" style={{ color: '#B0B8BB' }}>
            {usdValue}
          </div>
        )}
      </div>
    </div>
  )
}

function QuoteRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px]" style={{ color: '#B0B8BB' }}>{label}</span>
      <span
        className="text-[11px] font-medium"
        style={{ color: highlight ? 'var(--accent-primary)' : '#F6FEFD' }}
      >
        {value}
      </span>
    </div>
  )
}

export function SwapCard({ intent, address, language = 'en', destAddressOverride }: SwapCardProps) {
  const [state, setState] = useState<CardState>('preview')
  const [error, setError] = useState<string | null>(null)
  const [route, setRoute] = useState<SquidRoute | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [fromResolved, setFromResolved] = useState<SquidToken | null>(null)
  const [toResolved, setToResolved] = useState<SquidToken | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [destAddress, setDestAddress] = useState(destAddressOverride ?? '')
  const [needsDestAddress, setNeedsDestAddress] = useState(false)

  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const { mutateAsync: sendTransactionAsync } = useSendTransaction()
  const { writeContractAsync } = useWriteContract()
  const { open: openWalletModal } = useAppKit()

  const isAllAmount = ['all', 'max', 'everything'].includes(intent.amount?.toLowerCase?.() ?? '')

  // Fetch native balance when amount is "all"/"max"
  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: isAllAmount && !!address },
  })

  // Resolve "all"/"max" to the actual on-chain balance string.
  // For native tokens uses wagmi's useBalance; for ERC-20 tokens
  // the balance is resolved imperatively inside fetchQuote.
  const resolveAmount = useCallback((token: SquidToken | null): string => {
    if (!isAllAmount) return intent.amount
    const isNative = !token?.address || token.address.toLowerCase() === NATIVE_EVM.toLowerCase()
    if (isNative && nativeBalance) {
      // Leave 0.5% buffer for gas on native tokens
      const raw = nativeBalance.value * 995n / 1000n
      return (Number(raw) / 10 ** nativeBalance.decimals).toFixed(nativeBalance.decimals)
    }
    return intent.amount // fallback — fetchQuote resolves ERC-20 imperatively
  }, [isAllAmount, intent.amount, nativeBalance])

  const isTransfer = !!(intent.toAddress && intent.fromToken === intent.toToken)

  const t = {
      you_pay: 'You Pay',
      you_receive: 'You Receive',
      recipient: 'Recipient',
      getQuote: 'Refresh Quote',
      send: 'Send',
      swap: 'Confirm Swap',
      approveAndSwap: 'Approve & Swap',
      connectWallet: 'Connect Wallet',
      success: isTransfer ? 'Transfer Complete' : 'Swap Complete',
      viewTx: 'View on Explorer',
      retry: 'Try Again',
      resolving: 'Resolving tokens…',
      fetching: 'Fetching best route…',
      approving: 'Approving token…',
      confirming: 'Confirm in wallet',
      pending: 'Transaction submitted…',
      min_received: 'Minimum received',
      rate: 'Rate',
      gas: 'Estimated gas',
      slippage: 'Slippage',
      route_via: 'Route via',
      powered_by: '',
    }

  const isEvmChain = (chainId: string) => !chainId.includes('solana') && !isNaN(parseInt(chainId, 10))
  const isSolanaChain = (chainId: string) => chainId.toLowerCase().includes('solana')
  const isEvmAddress = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr)
  const isSolanaAddress = (addr: string) => !addr.startsWith('0x') && addr.length >= 32
  const chainTypesMatch = (a: string, b: string) =>
    (isEvmChain(a) && isEvmChain(b)) || (isSolanaChain(a) && isSolanaChain(b))

  const executeDirect = useCallback(async () => {
    if (!address || !walletClient) { setError(t.connectWallet); setState('error'); return }
    const to = (intent.toAddress || destAddress).trim() as `0x${string}`
    if (!to) { setError('Missing destination address'); setState('error'); return }

    const NATIVE_TOKENS: Record<string, { chainId: number; decimals: number }> = {
      ETH: { chainId: 1, decimals: 18 }, BNB: { chainId: 56, decimals: 18 },
      MATIC: { chainId: 137, decimals: 18 }, POL: { chainId: 137, decimals: 18 },
      AVAX: { chainId: 43114, decimals: 18 }, FTM: { chainId: 250, decimals: 18 },
      ARB: { chainId: 42161, decimals: 18 }, OP: { chainId: 10, decimals: 18 },
      BASE: { chainId: 8453, decimals: 18 }, CELO: { chainId: 42220, decimals: 18 },
    }
    const sym = intent.fromToken.toUpperCase()
    const native = NATIVE_TOKENS[sym]

    try {
      setState('confirming')
      if (native && switchChainAsync) {
        try { await switchChainAsync({ chainId: native.chainId }) } catch { /* ignore */ }
      }
      const decimals = native?.decimals ?? 18
      const resolvedAmt = resolveAmount(native ? null : null) // balance resolved from nativeBalance for native
      const amountRaw = parseUnits(resolvedAmt, decimals)
      let hash: `0x${string}`
      if (native) {
        hash = await sendTransactionAsync({ to, value: amountRaw, chainId: native.chainId })
      } else {
        setState('resolving')
        await fetchTokenList()
        const resolved = await resolveToken(intent.fromToken, intent.fromChain)
        if (!resolved?.address) { setError('Could not resolve token contract address'); setState('error'); return }
        setFromResolved(resolved)
        setState('confirming')
        hash = await writeContractAsync({
          address: resolved.address as `0x${string}`,
          abi: _erc20Abi,
          functionName: 'transfer',
          args: [to, parseUnits(resolveAmount(resolved), resolved.decimals)],
        })
      }
      setTxHash(hash)
      setState('success')
    } catch (e) {
      setError(friendlyError(e))
      setState('error')
    }
  }, [address, walletClient, intent, destAddress, switchChainAsync, sendTransactionAsync, writeContractAsync, t.connectWallet])

  const fetchQuote = useCallback(async () => {
    if (!address) { setError(t.connectWallet); setState('error'); return }
    setState('resolving')
    setError(null)
    setResolveError(null)
    try {
      await fetchTokenList()
      const from = await resolveToken(intent.fromToken, intent.fromChain)
      const to = await resolveToken(intent.toToken, intent.toChain)
      if (!from || !to) { setResolveError('Could not resolve tokens'); setState('error'); return }
      setFromResolved(from)
      setToResolved(to)
      if (isEvmChain(from.chainId) && !isEvmAddress(address)) {
        setError(`${intent.fromToken} is on an EVM chain — connect an EVM wallet (e.g. MetaMask)`); setState('error'); return
      }
      if (isSolanaChain(from.chainId) && !isSolanaAddress(address)) {
        setError(`${intent.fromToken} is on Solana — connect a Solana wallet (e.g. Phantom)`); setState('error'); return
      }
      const crossChain = !chainTypesMatch(from.chainId, to.chainId)
      if (crossChain && !destAddress) { setNeedsDestAddress(true); setState('preview'); return }
      const toAddr = crossChain ? destAddress : address

      // Resolve "all"/"max" — for ERC-20 read balance imperatively via public client
      let resolvedAmt = resolveAmount(from)
      if (isAllAmount && resolvedAmt === intent.amount && from.address && from.address.toLowerCase() !== NATIVE_EVM.toLowerCase()) {
        try {
          const chainId = parseInt(from.chainId, 10)
          const RPC: Record<number, string> = {
            1: 'https://eth.llamarpc.com', 56: 'https://bsc-dataseed.binance.org',
            137: 'https://polygon-rpc.com', 42161: 'https://arb1.arbitrum.io/rpc',
            10: 'https://mainnet.optimism.io', 8453: 'https://mainnet.base.org',
            43114: 'https://api.avax.network/ext/bc/C/rpc',
          }
          if (RPC[chainId]) {
            const publicClient = createPublicClient({ transport: http(RPC[chainId]) })
            const bal = await publicClient.readContract({
              address: from.address as `0x${string}`,
              abi: _erc20Abi,
              functionName: 'balanceOf',
              args: [address as `0x${string}`],
            })
            resolvedAmt = (Number(bal as bigint) / 10 ** from.decimals).toFixed(from.decimals)
          }
        } catch { /* fall through */ }
      }

      const amountRaw = parseUnits(resolvedAmt, from.decimals).toString()
      setState('quote')
      setError(null)
      const { route: r, requestId: rid } = await getRoute({
        fromAddress: address, fromChain: from.chainId, fromToken: from.address,
        fromAmount: amountRaw, toChain: to.chainId, toToken: to.address,
        toAddress: toAddr, slippage: 1, slippageConfig: { autoMode: 1 },
      })
      setRoute(r)
      setRequestId(rid)
    } catch (e) {
      setError(friendlyError(e))
      setState('error')
    }
  }, [address, intent, language, destAddress, isAllAmount, resolveAmount])

  // Auto-fetch quote for swaps (not transfers) as soon as wallet is connected
  const autoFetched = useRef(false)
  useEffect(() => {
    if (isTransfer || autoFetched.current || state !== 'preview') return
    if (!address) return
    autoFetched.current = true
    fetchQuote()
  }, [address, isTransfer, state, fetchQuote])

  const needsApproval = (): boolean => {
    if (!fromResolved || !route) return false
    const addr = fromResolved.address?.toLowerCase()
    if (!addr || addr === NATIVE_EVM) return false
    if (fromResolved.chainId?.includes('solana')) return false
    return true
  }

  const executeSwap = useCallback(async () => {
    if (!walletClient || !route || !address || !fromResolved) {
      const missing = [!walletClient && 'walletClient', !route && 'route', !address && 'address', !fromResolved && 'fromResolved'].filter(Boolean)
      setError(`Missing: ${missing.join(', ')}`)
      setState('error')
      return
    }
    const txReq = route.transactionRequest
    const txTarget = txReq?.target || txReq?.targetAddress
    if (!txTarget || !txReq?.data) {
      setError(`Invalid transaction request — target: ${txTarget}, data: ${txReq?.data ? 'ok' : 'missing'}`)
      setState('error')
      return
    }
    const chainId = parseInt(fromResolved.chainId, 10)
    if (isNaN(chainId)) { setError('Chain not supported'); setState('error'); return }
    try {
      if (walletClient.chain?.id !== chainId && switchChainAsync) await switchChainAsync({ chainId })
      if (needsApproval() && writeContractAsync) {
        setState('approving')
        await writeContractAsync({
          address: fromResolved.address as `0x${string}`,
          abi: [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }] as const,
          functionName: 'approve',
          args: [txTarget as `0x${string}`, parseUnits(resolveAmount(fromResolved), fromResolved.decimals)],
        })
      }
      setState('confirming')
      const hash = await sendTransactionAsync({
        to: txTarget as `0x${string}`,
        data: txReq.data as `0x${string}`,
        value: txReq.value ? BigInt(txReq.value) : 0n,
        gas: txReq.gasLimit ? BigInt(txReq.gasLimit) : undefined,
      })
      setTxHash(hash)
      setState('pending')
      if (requestId && fromResolved && toResolved) {
        const done = ['success', 'partial_success', 'needs_gas', 'not_found']
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 3000))
          try {
            const status = await getStatus(hash, requestId, fromResolved.chainId, toResolved.chainId, route.quoteId)
            if (done.includes(status.squidTransactionStatus)) { setState('success'); return }
          } catch { /* keep polling */ }
        }
      }
      setState('success')
    } catch (e) {
      setError(friendlyError(e))
      setState('error')
    }
  }, [walletClient, route, address, fromResolved, toResolved, intent, requestId, switchChainAsync, sendTransactionAsync, writeContractAsync, language])

  const friendlyError = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied') || msg.toLowerCase().includes('user cancelled'))
      return 'Cancelled'
    return msg
  }

  const blockExplorerUrl = (hash: string): string => {
    const map: Record<string, string> = {
      '1': 'https://etherscan.io', '42161': 'https://arbiscan.io', '56': 'https://bscscan.com',
      '137': 'https://polygonscan.com', '8453': 'https://basescan.org', '10': 'https://optimistic.etherscan.io',
    }
    const base = (fromResolved?.chainId && map[fromResolved.chainId]) || 'https://etherscan.io'
    return `${base}/tx/${hash}`
  }

  const isEVM = fromResolved?.chainId && !fromResolved.chainId.includes('solana') && !isNaN(parseInt(fromResolved.chainId, 10))
  const canExecute = !!walletClient && isEVM

  // ── Quote details ──────────────────────────────────────────────
  // Resolved "from" amount — substitutes actual balance when intent.amount is "all"/"max"
  const displayFromAmount = isAllAmount ? resolveAmount(fromResolved) : intent.amount

  const toAmountFormatted = route && toResolved
    ? (Number(route.estimate.toAmount) / 10 ** toResolved.decimals).toLocaleString(undefined, { maximumFractionDigits: 6 })
    : null
  const toAmountMinFormatted = route && toResolved
    ? (Number(route.estimate.toAmountMin) / 10 ** toResolved.decimals).toLocaleString(undefined, { maximumFractionDigits: 6 })
    : null
  const rateStr = (() => {
    if (!route || !toResolved || !fromResolved) return null
    const toAmt = Number(route.estimate.toAmount) / 10 ** toResolved.decimals
    const fromAmt = Number(displayFromAmount)
    if (!fromAmt || isNaN(toAmt) || isNaN(fromAmt)) return null
    const rate = toAmt / fromAmt
    return `1 ${intent.fromToken} ≈ ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${intent.toToken}`
  })()
  const gasStr = route?.estimate?.gasCosts?.[0]
    ? `${(Number(route.estimate.gasCosts[0].amount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${route.estimate.gasCosts[0].token.symbol}`
    : null

  // ── Inline styles ─────────────────────────────────────────────
  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(21,34,40,0.95) 0%, rgba(15,26,31,0.98) 100%)',
    border: '1px solid rgba(51,153,140,0.25)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(51,153,140,0.08)',
  }
  const btnPrimary = {
    background: 'linear-gradient(135deg, #33998C 0%, #2A7A6D 100%)',
    color: '#F6FEFD',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: 14,
    padding: '12px 20px',
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.15s, transform 0.1s',
  } as const

  // ── Success state ─────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div style={cardStyle} className="p-5">
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(14,203,129,0.15)' }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: '#0ECB81' }} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm" style={{ color: '#F6FEFD' }}>{t.success}</div>
            {txHash && (
              <a
                href={blockExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 mt-1 text-xs hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                {t.viewTx}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (state === 'error') {
    const isCancelled = (resolveError || error || '').toLowerCase() === 'cancelled' || (resolveError || error || '').toLowerCase() === ''
    return (
      <div style={cardStyle} className="p-5">
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: isCancelled ? 'rgba(255,255,255,0.06)' : 'rgba(246,70,93,0.12)' }}
          >
            {isCancelled
              ? <span style={{ fontSize: 24 }}>✕</span>
              : <AlertCircle className="w-7 h-7" style={{ color: '#F6465D' }} />}
          </div>
          <div className="text-center max-w-[280px]">
            <div className="font-semibold text-sm mb-1" style={{ color: isCancelled ? '#B0B8BB' : '#F6465D' }}>
              {isCancelled
                ? ('Cancelled')
                : ('Something went wrong')}
            </div>
            {!isCancelled && (
              <div className="text-[11px] leading-relaxed" style={{ color: '#B0B8BB' }}>
                {resolveError || error}
              </div>
            )}
          </div>
          <button
            onClick={() => { autoFetched.current = false; setState('preview'); setError(null); setResolveError(null); setRoute(null); setNeedsDestAddress(false); setDestAddress('') }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: 'var(--accent-primary)', border: '1px solid rgba(51,153,140,0.3)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.retry}
          </button>
        </div>
      </div>
    )
  }

  // ── In-progress states ────────────────────────────────────────
  if (state === 'approving' || state === 'confirming' || state === 'pending') {
    const stepLabel = state === 'approving' ? t.approving : state === 'confirming' ? t.confirming : t.pending
    return (
      <div style={cardStyle} className="p-5">
        <div className="flex flex-col items-center gap-4 py-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(51,153,140,0.12)' }}
          >
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="text-center">
            <div className="font-medium text-sm" style={{ color: '#F6FEFD' }}>{stepLabel}</div>
            <div className="text-[11px] mt-1" style={{ color: '#B0B8BB' }}>
              {intent.amount} {intent.fromToken}
              {!isTransfer && ` → ${intent.toToken}`}
            </div>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-2 text-[10px]" style={{ color: '#B0B8BB' }}>
            {needsApproval() && (
              <>
                <span style={{ color: state === 'approving' ? 'var(--accent-primary)' : '#0ECB81' }}>
                  {state !== 'approving' ? '✓ ' : ''}{'Approve'}
                </span>
                <span>→</span>
              </>
            )}
            <span style={{ color: state === 'confirming' ? 'var(--accent-primary)' : state === 'pending' ? '#0ECB81' : '#B0B8BB' }}>
              {state === 'pending' ? '✓ ' : ''}{'Confirm'}
            </span>
            {!isTransfer && (
              <>
                <span>→</span>
                <span style={{ color: state === 'pending' ? 'var(--accent-primary)' : '#B0B8BB' }}>
                  {'Processing'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Resolving / fetching route ────────────────────────────────
  if (state === 'resolving' || (state === 'quote' && !route)) {
    return (
      <div style={cardStyle} className="p-5">
        <div className="flex flex-col items-center gap-4 py-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(51,153,140,0.08)' }}
          >
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="text-sm font-medium" style={{ color: '#B0B8BB' }}>
            {state === 'resolving' ? t.resolving : t.fetching}
          </div>
        </div>
      </div>
    )
  }

  // ── Send / transfer layout ────────────────────────────────────
  if (isTransfer) {
    const dest = intent.toAddress || destAddress
    return (
      <div style={cardStyle} className="p-4 space-y-3">
        {/* From panel */}
        <TokenPanel
          label={t.you_pay}
          token={fromResolved}
          symbol={intent.fromToken}
          amount={displayFromAmount}          chainId={fromResolved?.chainId ?? undefined}
        />

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(51,153,140,0.15)', border: '1px solid rgba(51,153,140,0.25)' }}
          >
            <Send className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
          </div>
        </div>

        {/* Recipient */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#B0B8BB' }}>
            {t.recipient}
          </div>
          <div className="font-mono text-sm break-all" style={{ color: '#F6FEFD' }}>
            {dest || <span style={{ color: '#B0B8BB' }}>—</span>}
          </div>
        </div>

        {/* Action */}
        <div className="pt-1">
          {!address ? (
            <button style={btnPrimary} onClick={() => openWalletModal()}>
              <Wallet className="w-4 h-4" />
              {t.connectWallet}
            </button>
          ) : (
            <button style={btnPrimary} onClick={executeDirect}>
              <Send className="w-4 h-4" />
              {t.send} {intent.amount} {intent.fromToken}
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-1 pt-0.5">
          <span className="text-[9px]" style={{ color: '#8FA8A5' }}>{t.powered_by}</span>
        </div>
      </div>
    )
  }

  // ── Swap: preview + cross-chain dest address ──────────────────
  if (state === 'preview') {
    return (
      <div style={cardStyle} className="p-4 space-y-3">
        {/* From */}
        <TokenPanel
          label={t.you_pay}
          token={fromResolved}
          symbol={intent.fromToken}
          amount={displayFromAmount}          chainId={fromResolved?.chainId ?? (intent.fromChain ?? undefined)}
        />

        {/* Swap arrow */}
        <div className="flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(51,153,140,0.15)', border: '1px solid rgba(51,153,140,0.25)' }}
          >
            <ArrowDown className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          </div>
        </div>

        {/* To */}
        <TokenPanel
          label={t.you_receive}
          token={toResolved}
          symbol={intent.toToken}
          amount="?"
          chainId={toResolved?.chainId ?? (intent.toChain ?? undefined)}
        />

        {/* Cross-chain destination address input */}
        {needsDestAddress && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#B0B8BB' }}>
              <Info className="w-3 h-3" />
              {'Cross-chain swap: enter your destination address'}
            </div>
            <input
              type="text"
              value={destAddress}
              onChange={(e) => setDestAddress(e.target.value)}
              placeholder={'Destination address (0x...)'}
              className="w-full px-3 py-2.5 rounded-xl text-xs outline-none"
              style={{
                background: 'rgba(15,26,31,0.8)', border: '1px solid rgba(51,153,140,0.3)',
                color: '#F6FEFD',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(51,153,140,0.7)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(51,153,140,0.3)' }}
            />
          </div>
        )}

        {/* Action */}
        <div className="pt-1">
          {!address ? (
            <button style={btnPrimary} onClick={() => openWalletModal()}>
              <Wallet className="w-4 h-4" />
              {t.connectWallet}
            </button>
          ) : needsDestAddress ? (
            <button
              style={{ ...btnPrimary, opacity: !destAddress.trim() ? 0.5 : 1, cursor: !destAddress.trim() ? 'not-allowed' : 'pointer' }}
              onClick={fetchQuote}
              disabled={!destAddress.trim()}
            >
              {t.getQuote}
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-1 pt-0.5">
          <span className="text-[9px]" style={{ color: '#8FA8A5' }}>{t.powered_by}</span>
        </div>
      </div>
    )
  }

  // ── Swap: quote ready ─────────────────────────────────────────
  return (
    <div style={cardStyle} className="p-4 space-y-3">
      {/* From */}
      <TokenPanel
        label={t.you_pay}
        token={fromResolved}
        symbol={intent.fromToken}
        amount={displayFromAmount}
        chainId={fromResolved?.chainId}
      />

      {/* Arrow */}
      <div className="flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(51,153,140,0.15)', border: '1px solid rgba(51,153,140,0.25)' }}
        >
          <ArrowDown className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
        </div>
      </div>

      {/* To — with resolved amount */}
      <TokenPanel
        label={t.you_receive}
        token={toResolved}
        symbol={intent.toToken}
        amount={toAmountFormatted ?? '…'}
        chainId={toResolved?.chainId}
      />

      {/* Quote details */}
      <div
        className="rounded-xl px-3 py-2.5 space-y-0.5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {rateStr && <QuoteRow label={t.rate} value={rateStr} />}
        {toAmountMinFormatted && <QuoteRow label={t.min_received} value={`${toAmountMinFormatted} ${intent.toToken}`} />}
        {gasStr && <QuoteRow label={t.gas} value={gasStr} />}
        <QuoteRow label={t.slippage} value="1% auto" />
      </div>

      {/* Action */}
      <div className="pt-1">
        {!canExecute ? (
          <button style={btnPrimary} onClick={() => openWalletModal()}>
            <Wallet className="w-4 h-4" />
            {t.connectWallet}
          </button>
        ) : (
          <button style={btnPrimary} onClick={executeSwap}>
            {needsApproval() ? t.approveAndSwap : t.swap}
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 pt-0.5">
        <span className="text-[9px]" style={{ color: '#8FA8A5' }}>{t.powered_by}</span>
      </div>
    </div>
  )
}
