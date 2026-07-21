import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { apiUrl } from '../lib/config'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TickerData {
  symbol: string
  price: string
  change: string
  changePercent: string
}

interface GlobalData {
  totalMarketCap: number
  btcDominance: number
  totalVolume: number
  marketCapChange: number
}

interface CoinRow {
  id: string
  rank: number
  name: string
  symbol: string
  image: string
  price: number
  change24h: number
  change7d: number
  marketCap: number
  volume: number
}

interface TrendingCoin {
  id: string
  name: string
  symbol: string
  thumb: string
  price: number
  change24h: number
  rank: number
  binanceSymbol: string
}

interface TopGainer {
  id: string
  name: string
  symbol: string
  image: string
  price: number
  change24h: number
  binanceSymbol: string
}

interface FearGreed {
  value: string
  classification: string
}

interface LiqLevel {
  price: number
  weight: number
  maxWeight: number
  isLong: boolean
  oiEstimate: number
}

interface FuturesData {
  sym: string
  ticker: { lastPrice: string; priceChangePercent: string; lastFundingRate?: string }
  oiData: { openInterest: string }
  lsRatio?: { longAccount: string; shortAccount: string }[]
  takerRatio?: { buyVol: string; sellVol: string }[]
  oiHist?: { sumOpenInterest: string; timestamp: number }[]
  levels: LiqLevel[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKER_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'POLUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT',
  'TIAUSDT', 'JUPUSDT', 'WIFUSDT', 'BONKUSDT', 'PEPEUSDT',
]
const TICKER_DISPLAY: Record<string, string> = {
  BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL', BNBUSDT: 'BNB',
  XRPUSDT: 'XRP', DOGEUSDT: 'DOGE', ADAUSDT: 'ADA', AVAXUSDT: 'AVAX',
  LINKUSDT: 'LINK', DOTUSDT: 'DOT', POLUSDT: 'MATIC', UNIUSDT: 'UNI',
  LTCUSDT: 'LTC', ATOMUSDT: 'ATOM', NEARUSDT: 'NEAR', APTUSDT: 'APT',
  ARBUSDT: 'ARB', OPUSDT: 'OP', INJUSDT: 'INJ', SUIUSDT: 'SUI',
  TIAUSDT: 'TIA', JUPUSDT: 'JUP', WIFUSDT: 'WIF', BONKUSDT: 'BONK', PEPEUSDT: 'PEPE',
}
const CHART_SYMBOLS = [
  'BINANCE:BTCUSDT', 'BINANCE:SOLUSDT', 'BINANCE:ETHUSDT',
  'BINANCE:XRPUSDT', 'BINANCE:BNBUSDT', 'BINANCE:LTCUSDT',
]
const CHART_LABELS = [
  'BTC', 'SOL', 'ETH', 'XRP', 'BNB', 'LTC',
]
const DEFAULT_INTERVAL = '60'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, digits = 2) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(digits)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: digits })}`
}

function fmtPrice(n: number) {
  if (n == null || isNaN(n)) return '$0.00'
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (n >= 1) return `$${n.toFixed(4)}`
  return `$${n.toFixed(6)}`
}

function fearGreedColor(val: string) {
  const n = parseInt(val)
  if (n <= 25) return '#ef4444'
  if (n <= 45) return '#f97316'
  if (n <= 55) return '#eab308'
  if (n <= 75) return '#84cc16'
  return '#0ECB81'
}

// ─── TickerBar ────────────────────────────────────────────────────────────────

function TickerBar() {
  const esRef = useRef<EventSource | null>(null)

  const updateDOM = useCallback((sym: string, data: TickerData) => {
    // Update both copies (original + duplicate for seamless loop)
    ;[`ticker-${sym}-a`, `ticker-${sym}-b`].forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const priceEl = el.querySelector<HTMLSpanElement>('[data-price]')
      const pctEl = el.querySelector<HTMLSpanElement>('[data-pct]')
      if (priceEl) priceEl.textContent = data.price
      if (pctEl) {
        pctEl.textContent = data.changePercent
        pctEl.style.color = data.changePercent.startsWith('+') ? '#0ECB81' : '#ef4444'
      }
    })
  }, [])

  useEffect(() => {
    const es = new EventSource(apiUrl('/api/market/tickers'))
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const update = JSON.parse(e.data) as { symbol: string; price: string; changePercent: string }
        if (!update.symbol) return
        updateDOM(update.symbol, {
          symbol: TICKER_DISPLAY[update.symbol] ?? update.symbol,
          price: update.price,
          change: '',
          changePercent: update.changePercent,
        })
      } catch { /* ignore */ }
    }

    return () => {
      es.close()
    }
  }, [updateDOM])

  // Render static skeleton — DOM is updated directly via updateDOM, no re-renders
  const renderItems = (suffix: 'a' | 'b') =>
    TICKER_SYMBOLS.map(sym => (
      <span
        key={`${sym}-${suffix}`}
        id={`ticker-${sym}-${suffix}`}
        className="inline-flex items-center gap-0.5 text-xs font-medium shrink-0"
      >
        <span style={{ color: 'var(--text-secondary)' }}>{TICKER_DISPLAY[sym] ?? sym}:</span>
        <span data-price style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: '7ch', display: 'inline-block', textAlign: 'right' }}>—</span>
        <span data-pct style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>—</span>
      </span>
    ))

  return (
    <div
      className="w-full overflow-hidden border-b"
      style={{ borderColor: 'var(--panel-border)', background: 'var(--surface-secondary)' }}
    >
      <div className="flex items-center">
        {/* Scrolling tickers */}
        <div className="flex-1 overflow-hidden">
          <div className="ticker-scroll flex gap-8 px-6 py-2.5 whitespace-nowrap">
            {renderItems('a')}
            {renderItems('b')}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TradingView Chart ────────────────────────────────────────────────────────

let tvChartSeq = 0

function TradingViewChart({ symbol, interval, theme }: { symbol: string; interval: string; theme: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`tv_chart_${++tvChartSeq}`)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const id = idRef.current
    containerRef.current.id = id

    const initWidget = () => {
      if (!containerRef.current) return
      // @ts-expect-error TradingView global
      new window.TradingView.widget({
        container_id: id,
        symbol,
        interval,
        timezone: 'Etc/UTC',
        theme: theme === 'light' ? 'light' : 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: theme === 'light' ? '#ffffff' : '#0F1A1F',
        enable_publishing: false,
        hide_side_toolbar: true,
        hide_top_toolbar: true,
        hide_legend: false,
        allow_symbol_change: false,
        save_image: false,
        hide_volume: true,
        height: '100%',
        width: '100%',
        studies: [],
        studies_overrides: {},
        overrides: {
          'paneProperties.background': theme === 'light' ? '#ffffff' : '#0F1A1F',
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': 'transparent',
          'paneProperties.horzGridProperties.color': 'transparent',
          'scalesProperties.lineColor': theme === 'light' ? '#e5e7eb' : '#1a2530',
          'scalesProperties.textColor': theme === 'light' ? '#9ca3af' : '#4a5568',
        },
      })
    }

    // @ts-expect-error TradingView global
    if (window.TradingView) {
      initWidget()
    } else {
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = initWidget
      document.head.appendChild(script)
    }

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [symbol, interval, theme])

  return <div ref={containerRef} className="w-full h-full" />
}

// ─── TradingView Mini Chart (mobile) ──────────────────────────────────────────

function TradingViewMiniChart({ symbol, theme }: { symbol: string; theme: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.height = '100%'
    wrapper.style.width = '100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = 'calc(100% - 32px)'
    inner.style.width = '100%'
    wrapper.appendChild(inner)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: theme === 'light' ? 'light' : 'dark',
      style: '1',
      locale: 'en',
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      gridColor: 'transparent',
      support_host: 'https://www.tradingview.com',
    })
    wrapper.appendChild(script)
    containerRef.current.appendChild(wrapper)

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [symbol, theme])

  return <div ref={containerRef} className="w-full h-full" />
}

// ─── MiniLineChart ────────────────────────────────────────────────────────────

function MiniLineChart({ points, pct = 0, width = 96, height = 40 }: {
  points?: number[]
  pct?: number
  width?: number
  height?: number
}) {
  const data = points && points.length >= 2 ? points : (() => {
    // fallback: fake data shaped by pct
    return Array.from({ length: 14 }, (_, i) => {
      const trend = (pct / 100) * (i / 13)
      const noise = (Math.sin(i * 2.4 + Math.abs(pct) * 0.3) * 0.012) +
                    (Math.cos(i * 1.1 + Math.abs(pct) * 0.7) * 0.008)
      return 1 + trend + noise
    })
  })()

  const first = data[0]
  const last = data[data.length - 1]
  const isPos = last >= first
  const color = isPos ? '#0ECB81' : '#ef4444'
  const fillColor = isPos ? 'rgba(14,203,129,0.15)' : 'rgba(239,68,68,0.15)'

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 0.001
  const pad = 2

  const coords = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - pad * 2) + pad
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return [x, y] as [number, number]
  })

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const fillPath = `${linePath} L${(width - pad).toFixed(1)},${height} L${pad},${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className="shrink-0">
      <path d={fillPath} fill={fillColor} />
      <path d={linePath} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── MiniSparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ change7d }: { change7d: number }) {
  const isPos = change7d >= 0
  const color = isPos ? '#0ECB81' : '#ef4444'
  const bgColor = isPos ? 'rgba(14,203,129,0.12)' : 'rgba(239,68,68,0.12)'
  // Fake sparkline using 7 bars of varying heights based on the overall trend
  const seed = Math.abs(change7d * 137.5) % 100
  const bars = [0.4, 0.6, 0.5, 0.7, 0.55, 0.8, isPos ? 1.0 : 0.3].map((base, i) => {
    const noise = ((seed * (i + 1) * 17) % 30) / 100
    return Math.max(0.15, Math.min(1, base + (isPos ? noise : -noise)))
  })
  return (
    <div className="flex items-end gap-0.5 px-1 py-0.5 rounded" style={{ background: bgColor, width: 56, height: 28 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${h * 20}px`, background: color, opacity: 0.7 + i * 0.04 }}
        />
      ))}
    </div>
  )
}

// ─── ConverterWidget ──────────────────────────────────────────────────────────

function ConverterWidget({ coins }: { coins: CoinRow[]; isEn: boolean }) {
  const [fromAmt, setFromAmt] = useState('1')
  const [fromId, setFromId] = useState('bitcoin')
  const [toId, setToId] = useState('usd')

  const fromCoin = coins.find(c => c.id === fromId)
  const toCoin = coins.find(c => c.id === toId)

  const fromPrice = fromCoin?.price ?? 0
  const toPrice = toId === 'usd' ? 1 : (toCoin?.price ?? 0)
  const result = toPrice > 0 ? (parseFloat(fromAmt || '0') * fromPrice) / toPrice : 0

  const top5 = coins.slice(0, 8)

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* From */}
      <div className="flex gap-2">
        <input
          type="number"
          value={fromAmt}
          min="0"
          onChange={e => setFromAmt(e.target.value)}
          className="min-w-0 flex-1 text-sm px-3 py-2 rounded-lg outline-none tabular-nums"
          style={{ background: 'var(--surface-tertiary)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
        />
        <select
          value={fromId}
          onChange={e => setFromId(e.target.value)}
          className="w-20 shrink-0 text-xs px-2 py-2 rounded-lg outline-none"
          style={{ background: 'var(--surface-tertiary)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
        >
          {top5.map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
        </select>
      </div>
      {/* Arrow */}
      <div className="flex items-center justify-center text-lg" style={{ color: 'var(--text-tertiary)' }}>⇅</div>
      {/* To */}
      <div className="flex gap-2">
        <div
          className="min-w-0 flex-1 text-sm px-3 py-2 rounded-lg tabular-nums font-semibold truncate"
          style={{ background: 'var(--surface-tertiary)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
        >
          {isNaN(result) || !isFinite(result) ? '—' : result >= 1000 ? result.toLocaleString('en-US', { maximumFractionDigits: 2 }) : result.toFixed(toId === 'usd' ? 2 : 4)}
        </div>
        <select
          value={toId}
          onChange={e => setToId(e.target.value)}
          className="w-20 shrink-0 text-xs px-2 py-2 rounded-lg outline-none"
          style={{ background: 'var(--surface-tertiary)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
        >
          <option value="usd">USD</option>
          {top5.map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Liquidation Map + AI Signals ────────────────────────────────────────────

const FUT_SYMS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP']

function fmtLiqPrice(n: number) {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}

function fmtOI(n: number) {
  if (!isFinite(n) || n == null) return '—'
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}B`
  return `$${n.toFixed(1)}M`
}

function LiquidationMapPanel({ isEn }: { isEn: boolean }) {
  const [activeSym, setActiveSym] = useState('BTC')
  const [activeTab, setActiveTab] = useState<'liqmap' | 'inflow'>('liqmap')
  const [futData, setFutData] = useState<FuturesData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchFutData = useCallback(async (sym: string) => {
    try {
      setLoading(true)
      const res = await fetch(apiUrl(`/api/market/futures?symbol=${sym}`))
      const data: FuturesData = await res.json()
      setFutData(data)
    } catch { /* fail silently */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFutData(activeSym) }, [activeSym, fetchFutData])

  useEffect(() => {
    const timer = setInterval(() => fetchFutData(activeSym), 30000)
    return () => clearInterval(timer)
  }, [activeSym, fetchFutData])

  const markPrice = futData ? parseFloat(futData.ticker.lastPrice) : 0
  const totalOI = futData ? parseFloat(futData.oiData.openInterest) : 0

  // AI Signals computation
  const signals = futData ? (() => {
    const ch24 = parseFloat(futData.ticker.priceChangePercent) || 0
    const ls = futData.lsRatio?.[0]
    const lr = ls ? parseFloat(ls.longAccount) : 0.5
    const sr = ls ? parseFloat(ls.shortAccount) : 0.5
    const taker = futData.takerRatio?.[0]
    const takerBuy = taker ? parseFloat(taker.buyVol) / (parseFloat(taker.sellVol) || 1) : 1
    const fr = parseFloat(futData.ticker.lastFundingRate || '0') * 100
    const hist = futData.oiHist || []
    const oiFirst = hist.length ? parseFloat(hist[0].sumOpenInterest) : 0
    const oiLast = hist.length ? parseFloat(hist[hist.length - 1].sumOpenInterest) : 0
    const oiTrend = oiFirst ? ((oiLast - oiFirst) / oiFirst) * 100 : 0

    const items = [
      { name: 'Long/Short Ratio', bull: lr <= 0.52, val: `${(lr * 100).toFixed(1)}% L / ${(sr * 100).toFixed(1)}% S`, body: lr > 0.52 ? 'Longs crowded — watch for squeeze' : 'Shorts heavy — squeeze fuel building' },
      { name: 'Taker Flow', bull: takerBuy >= 1, val: `Buy ${(takerBuy / (1 + takerBuy) * 100).toFixed(0)}%`, body: takerBuy >= 1 ? 'Takers buying aggressively — bullish' : 'Takers selling into bids — bearish' },
      { name: 'Funding', bull: Math.abs(fr) < 0.03, val: `${fr >= 0 ? '+' : ''}${fr.toFixed(4)}%`, body: Math.abs(fr) < 0.03 ? 'Neutral — no leverage extreme' : fr > 0 ? 'Longs paying — crowded longs' : 'Shorts paying — bearish excess' },
      { name: 'OI Momentum', bull: oiTrend > 0, val: `${oiTrend >= 0 ? '+' : ''}${oiTrend.toFixed(2)}%`, body: oiTrend > 0 ? `OI rising ${oiTrend.toFixed(2)}% — new money in` : `OI falling ${Math.abs(oiTrend).toFixed(2)}% — unwinding` },
      { name: '24h Price', bull: ch24 >= 0, val: `${ch24 >= 0 ? '+' : ''}${ch24.toFixed(2)}%`, body: ch24 >= 0 ? 'Bullish trend — continuation bias' : 'Bearish trend — continuation bias' },
    ]
    const bullCount = items.filter(s => s.bull).length
    const verdict = bullCount >= 4 ? 'STRONG BULL' : bullCount >= 3 ? 'BULL LEAN' : bullCount === 2 ? 'NEUTRAL' : bullCount === 1 ? 'BEAR LEAN' : 'STRONG BEAR'
    const verdictColor = bullCount >= 3 ? '#10b981' : bullCount === 2 ? 'var(--text-tertiary)' : '#ef4444'
    return { items, verdict, verdictColor }
  })() : null

  // OI Flow rows
  const oiFlowRows = futData?.oiHist ? (() => {
    const hist = futData.oiHist!
    const px = markPrice
    return [...hist].reverse().map((h, i, arr) => {
      const oi = parseFloat(h.sumOpenInterest)
      const prev = arr[i + 1]
      const delta = prev ? oi - parseFloat(prev.sumOpenInterest) : 0
      const time = new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      return { time, oiUsd: oi * px, delta: delta * px }
    })
  })() : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
      {/* Left: Liquidation Map / OI Flow */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
      >
        {/* Header */}
        <div
          className="px-4 py-2.5 border-b flex items-center gap-2 flex-wrap"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {isEn ? 'Liquidation Map' : '清算地图'}
          </span>
          {/* Symbol pills */}
          <div className="flex gap-1 ml-auto">
            {FUT_SYMS.map(sym => (
              <button
                key={sym}
                onClick={() => setActiveSym(sym)}
                className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                style={{
                  background: activeSym === sym ? '#50d2c1' : 'var(--surface-tertiary)',
                  color: activeSym === sym ? '#000' : 'var(--text-tertiary)',
                  border: 'none',
                }}
              >
                {sym}
              </button>
            ))}
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('liqmap')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all"
              style={{
                background: activeTab === 'liqmap' ? 'var(--surface-tertiary)' : 'transparent',
                color: activeTab === 'liqmap' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: activeTab === 'liqmap' ? '1px solid var(--panel-border)' : '1px solid transparent',
              }}
            >
              Liq Map
            </button>
            <button
              onClick={() => setActiveTab('inflow')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all"
              style={{
                background: activeTab === 'inflow' ? 'var(--surface-tertiary)' : 'transparent',
                color: activeTab === 'inflow' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: activeTab === 'inflow' ? '1px solid var(--panel-border)' : '1px solid transparent',
              }}
            >
              OI Flow
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-3.5 py-3 flex-1" style={{ minHeight: 280 }}>
          {loading && !futData ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
              <span className="text-xs">Loading…</span>
            </div>
          ) : activeTab === 'liqmap' ? (
            /* Liquidation Map bars */
            <div className="flex flex-col gap-[3px]">
              {futData && (() => {
                const levels = [...futData.levels].reverse()
                const markIdx = levels.findIndex(l => l.price <= markPrice)
                return levels.map((l, i) => (
                  <div key={i}>
                    {i === markIdx && (
                      <div className="my-2 flex items-center gap-2">
                        <div className="flex-1 h-px" style={{ background: 'var(--panel-border)' }} />
                        <span className="text-[9px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          ◆ {fmtLiqPrice(markPrice)}
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'var(--panel-border)' }} />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 h-4">
                      <span
                        className="text-[9px] min-w-[64px] text-right shrink-0 tabular-nums"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {fmtLiqPrice(l.price)}
                      </span>
                      <div
                        className="flex-1 h-[7px] rounded-sm overflow-hidden"
                        style={{ background: 'var(--surface-tertiary)' }}
                      >
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${(l.weight / l.maxWeight * 100).toFixed(0)}%`,
                            background: l.isLong ? '#10b981' : '#ef4444',
                          }}
                        />
                      </div>
                      <span
                        className="text-[9px] min-w-[44px] text-right shrink-0 tabular-nums"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        ${l.oiEstimate.toFixed(1)}M
                      </span>
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            /* OI Flow */
            <div>
              <div className="text-[10px] uppercase tracking-wider pb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                OI Flow — 5m intervals
              </div>
              {oiFlowRows.map((row, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 px-1"
                  style={{ borderBottom: i < oiFlowRows.length - 1 ? '1px solid var(--panel-border)' : 'none' }}
                >
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{row.time}</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {fmtOI(row.oiUsd / 1e6)}
                    <span className="ml-1.5 text-[10px]" style={{ color: row.delta >= 0 ? '#10b981' : '#ef4444' }}>
                      {row.delta >= 0 ? '+' : ''}{fmtOI(Math.abs(row.delta) / 1e6)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Signals */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
      >
        <div
          className="px-4 py-2.5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {isEn ? 'AI Signals' : 'AI 信号'}
          </span>
          <span className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>{activeSym}</span>
        </div>
        <div className="px-3 py-2.5 flex flex-col gap-1.5 flex-1 overflow-y-auto">
          {!signals ? (
            <div className="text-xs text-center p-5" style={{ color: 'var(--text-tertiary)' }}>Loading…</div>
          ) : signals.items.map((s, i) => (
            <div
              key={i}
              className="rounded-md px-2.5 py-2"
              style={{ background: 'var(--surface-tertiary)' }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <div
                  className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={{ background: s.bull ? '#10b981' : '#ef4444' }}
                />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                <span
                  className="text-[11px] font-bold ml-auto tabular-nums"
                  style={{ color: s.bull ? '#10b981' : '#ef4444' }}
                >
                  {s.val}
                </span>
              </div>
              <div className="text-[10px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>{s.body}</div>
            </div>
          ))}
        </div>
        {signals && (
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {isEn ? 'AI Signal' : 'AI 信号'}
            </span>
            <span className="text-[13px] font-bold tracking-wide" style={{ color: signals.verdictColor }}>
              {signals.verdict}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main DataPage ────────────────────────────────────────────────────────────

export function DataPage() {
  const { theme } = useTheme()
  const { language } = useLanguage()
  const isEn = language !== 'zh'

  // Chart state
  const [chartSymbol, setChartSymbol] = useState('BINANCE:BTCUSDT')
  const [chartInterval] = useState(DEFAULT_INTERVAL)
  const chartRef = useRef<HTMLDivElement>(null)

  const switchToSymbol = useCallback((binanceSymbol: string) => {
    if (!binanceSymbol) return // stablecoin or unresolved
    setChartSymbol(binanceSymbol)
  }, [])

  // Global market data
  const [global, setGlobal] = useState<GlobalData | null>(null)
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null)

  // Chart history
  const [marketCapPoints, setMarketCapPoints] = useState<number[]>([])
  const [volumePoints, setVolumePoints] = useState<number[]>([])

  // Coins table
  const [coins, setCoins] = useState<CoinRow[]>([])
  const [coinsLoading, setCoinsLoading] = useState(true)

  // Trending
  const [trending, setTrending] = useState<TrendingCoin[]>([])

  // Gainers
  const [gainers, setGainers] = useState<TopGainer[]>([])

  // ── Fetch global + fear & greed ──
  const fetchGlobal = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/market/global'))
      const envelope = await res.json()
      const d = envelope.global?.data
      if (d) {
        setGlobal({
          totalMarketCap: d.total_market_cap.usd,
          btcDominance: d.market_cap_percentage.btc,
          totalVolume: d.total_volume.usd,
          marketCapChange: d.market_cap_change_percentage_24h_usd,
        })
      }
      const fng = envelope.fearGreed?.data?.[0]
      if (fng) {
        setFearGreed({ value: fng.value, classification: fng.value_classification })
      }
    } catch { /* fail silently */ }
  }, [])

  // ── Fetch top coins ──
  const fetchCoins = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/market/coins'))
      const json: Array<{
        id: string; market_cap_rank: number; name: string; symbol: string; image: string
        current_price: number; price_change_percentage_24h: number
        price_change_percentage_7d_in_currency: number
        market_cap: number; total_volume: number
      }> = await res.json()
      setCoins(json.map(c => ({
        id: c.id,
        rank: c.market_cap_rank,
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        image: c.image,
        price: c.current_price,
        change24h: c.price_change_percentage_24h ?? 0,
        change7d: c.price_change_percentage_7d_in_currency ?? 0,
        marketCap: c.market_cap,
        volume: c.total_volume,
      })))
      setCoinsLoading(false)
    } catch { /* fail silently */ }
    setCoinsLoading(false)
  }, [])

  // ── Fetch trending ──
  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/market/trending'))
      const json = await res.json()
      setTrending(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (json.coins as any[]).slice(0, 7).map((c: any) => ({
          id: c.item.id,
          name: c.item.name,
          symbol: c.item.symbol,
          thumb: c.item.thumb,
          price: c.item.data?.price ?? 0,
          change24h: c.item.data?.price_change_percentage_24h?.usd ?? 0,
          rank: c.item.market_cap_rank ?? 0,
          binanceSymbol: c.item.binance_symbol ?? '',
        }))
      )
    } catch { /* fail silently */ }
  }, [])
  const fetchGainers = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/market/gainers'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any[] = await res.json()
      setGainers(json.map(c => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        image: c.image,
        price: c.current_price,
        change24h: c.price_change_percentage_24h ?? 0,
        binanceSymbol: c.binance_symbol ?? '',
      })))
    } catch { /* fail silently */ }
  }, [])

  const fetchChart = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/market/chart'))
      const json = await res.json()
      // marketCap: all 7-day hourly points (~168)
      const mcPts: number[] = (json.marketCap?.market_caps ?? []).map((p: [number, number]) => p[1])
      if (mcPts.length >= 2) setMarketCapPoints(mcPts)
      // volume: same dataset, last 24 points = last ~24 hours
      const volRaw: number[] = (json.volume?.total_volumes ?? []).map((p: [number, number]) => p[1])
      const volPts = volRaw.slice(-24)
      if (volPts.length >= 2) setVolumePoints(volPts)
      if (volPts.length >= 2) setVolumePoints(volPts)
    } catch { /* fail silently */ }
  }, [])

  useEffect(() => {
    fetchGlobal()
    fetchCoins()
    fetchTrending()
    fetchGainers()
    fetchChart()

    const globalTimer = setInterval(fetchGlobal, 120_000)
    const coinsTimer = setInterval(fetchCoins, 60_000)
    const trendingTimer = setInterval(fetchTrending, 120_000)
    const gainersTimer = setInterval(fetchGainers, 120_000)
    const chartTimer = setInterval(fetchChart, 600_000)
    return () => {
      clearInterval(globalTimer)
      clearInterval(coinsTimer)
      clearInterval(trendingTimer)
      clearInterval(gainersTimer)
      clearInterval(chartTimer)
    }
  }, [fetchGlobal, fetchCoins, fetchTrending, fetchGainers, fetchChart])

  const pctColor = (v: number) => (v >= 0 ? '#0ECB81' : '#ef4444')

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'var(--surface-primary)' }}
    >
      {/* No background image on data page */}

      <div className="relative z-10">

        {/* ── Ticker Bar ── */}
        <TickerBar />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* ── Page header ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-end justify-between"
          >
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
            >
              {isEn ? 'Market Overview' : '市场概览'}
            </h1>
          </motion.div>

          {/* ── Highlights: Stat Cards + Trending + Top Gainers ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-3"
          >
            {/* Left column: Market Cap + 24h Volume stacked */}
            <div className="flex flex-col gap-3">
              {/* Market Cap */}
              <div
                className="flex items-center justify-between gap-3 rounded-xl p-4 flex-1 overflow-hidden"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <div
                    className="text-xl font-bold tracking-tight tabular-nums"
                    style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
                  >
                    {global ? fmt(global.totalMarketCap) : '—'}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {isEn ? 'Market Cap' : '总市值'}
                    {global && (
                      <span style={{ color: pctColor(global.marketCapChange) }} className="text-xs font-semibold">
                        {global.marketCapChange >= 0 ? '+' : ''}{global.marketCapChange.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                {global && <MiniLineChart points={marketCapPoints} pct={global.marketCapChange} />}
              </div>

              {/* 24h Volume */}
              <div
                className="flex items-center justify-between gap-3 rounded-xl p-4 flex-1 overflow-hidden"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <div
                    className="text-xl font-bold tracking-tight tabular-nums"
                    style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
                  >
                    {global ? fmt(global.totalVolume) : '—'}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {isEn ? '24h Trading Volume' : '24h 交易量'}
                    {volumePoints.length >= 2 && (() => {
                      const volPct = ((volumePoints[volumePoints.length - 1] - volumePoints[0]) / volumePoints[0]) * 100
                      return (
                        <span style={{ color: pctColor(volPct) }} className="text-xs font-semibold">
                          {volPct >= 0 ? '+' : ''}{volPct.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </div>
                </div>
                {(() => {
                  const volPct = volumePoints.length >= 2
                    ? ((volumePoints[volumePoints.length - 1] - volumePoints[0]) / volumePoints[0]) * 100
                    : global?.marketCapChange ?? 0
                  return <MiniLineChart points={volumePoints} pct={volPct} width={96} height={40} />
                })()}
              </div>

              {/* BTC Dominance + Fear & Greed side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
                >
                  <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {global ? `${global.btcDominance.toFixed(1)}%` : '—'}
                  </div>
                  <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {isEn ? 'BTC Dominance' : 'BTC 主导率'}
                  </div>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
                >
                  <div
                    className="text-lg font-bold tabular-nums"
                    style={{ color: fearGreed ? fearGreedColor(fearGreed.value) : 'var(--text-primary)' }}
                  >
                    {fearGreed ? fearGreed.value : '—'}
                  </div>
                  <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {fearGreed ? fearGreed.classification : (isEn ? 'Fear & Greed' : '恐慌贪婪')}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle column: Trending */}
            <div
              className="rounded-xl"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
            >
              <div className="flex justify-between items-center pt-3.5 mb-2 px-4">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {isEn ? 'Trending' : '热门'}
                </span>
              </div>
              <div>
                {trending.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                      <div className="w-6 h-6 rounded-full shrink-0" style={{ background: 'var(--surface-tertiary)' }} />
                      <div className="flex-1 h-3 rounded" style={{ background: 'var(--surface-tertiary)' }} />
                      <div className="w-12 h-3 rounded" style={{ background: 'var(--surface-tertiary)' }} />
                    </div>
                  ))
                  : trending.slice(0, 5).map(coin => (
                    <div
                      key={coin.id}
                      className="flex justify-between items-center px-4 py-2.5 rounded-lg mx-1 transition-colors cursor-pointer"
                      onClick={() => switchToSymbol(coin.binanceSymbol)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-tertiary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-2 min-w-0 max-w-[55%]">
                        <img src={coin.thumb} alt={coin.symbol} className="w-6 h-6 rounded-full shrink-0" />
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {coin.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {coin.price > 0 ? fmtPrice(coin.price) : '—'}
                        </span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: pctColor(coin.change24h) }}>
                          {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Right column: Top Gainers */}
            <div
              className="rounded-xl"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
            >
              <div className="flex justify-between items-center pt-3.5 mb-2 px-4">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {isEn ? 'Top Gainers' : '涨幅最大'}
                </span>
              </div>
              <div>
                {gainers.length === 0
                  ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                      <div className="w-6 h-6 rounded-full shrink-0" style={{ background: 'var(--surface-tertiary)' }} />
                      <div className="flex-1 h-3 rounded" style={{ background: 'var(--surface-tertiary)' }} />
                      <div className="w-12 h-3 rounded" style={{ background: 'var(--surface-tertiary)' }} />
                    </div>
                  ))
                  : gainers.map(coin => (
                    <div
                      key={coin.id}
                      className="flex justify-between items-center px-4 py-2.5 rounded-lg mx-1 transition-colors cursor-pointer"
                      onClick={() => switchToSymbol(coin.binanceSymbol)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-tertiary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-2 min-w-0 max-w-[55%]">
                        <img src={coin.image} alt={coin.symbol} className="w-6 h-6 rounded-full shrink-0" />
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {coin.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {fmtPrice(coin.price)}
                        </span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: pctColor(coin.change24h) }}>
                          {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </motion.div>

          {/* ── Liquidation Map + AI Signals ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <LiquidationMapPanel isEn={isEn} />
          </motion.div>

          {/* ── Chart + Stats Panel ── */}
          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4"
          >
            {/* Chart card */}
            <div
              className="rounded-2xl overflow-hidden min-w-0"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
            >
              {/* Chart toolbar — hidden on mobile */}
              <div
                className="hidden sm:flex items-center gap-3 px-4 py-3 border-b flex-wrap"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                {/* Custom symbol input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const val = (e.currentTarget.elements.namedItem('symbol') as HTMLInputElement).value.trim().toUpperCase()
                    if (val) setChartSymbol(`BINANCE:${val}USDT`)
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    name="symbol"
                    placeholder="..."
                    className="text-xs px-3 py-1.5 rounded-lg outline-none w-36"
                    style={{
                      background: 'var(--surface-tertiary)',
                      border: '1px solid var(--panel-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="submit"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: 'var(--surface-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}
                  >
                    Load
                  </button>
                </form>
                {/* Scrollable symbol pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide flex-1">
                  {CHART_SYMBOLS.map((sym, i) => (
                    <button
                      key={sym}
                      onClick={() => setChartSymbol(sym)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0"
                      style={{
                        background: chartSymbol === sym ? 'var(--surface-secondary)' : 'transparent',
                        color: chartSymbol === sym ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        border: chartSymbol === sym ? '1px solid var(--panel-border)' : '1px solid transparent',
                      }}
                    >
                      {CHART_LABELS[i]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Full chart on desktop, mini clean chart on mobile */}
              <div className="hidden sm:block" style={{ height: '560px' }}>
                <TradingViewChart symbol={chartSymbol} interval={chartInterval} theme={theme} />
              </div>
              <div className="block sm:hidden" style={{ height: '420px' }}>
                <TradingViewMiniChart symbol={chartSymbol} theme={theme} />
              </div>
            </div>

            {/* Right: Stats + Converter panel */}
            <div className="flex flex-col gap-4 min-w-0">
              {/* Statistics panel */}
              <div
                className="rounded-2xl overflow-hidden flex-1"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--panel-border)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    {isEn ? 'Market Statistics' : '市场数据'}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--panel-border)' }}>
                  {(() => {
                    const btc = coins.find(c => c.id === 'bitcoin') || coins[0]
                    const eth = coins.find(c => c.id === 'ethereum') || coins[1]
                    if (!btc) return null
                    const totalMcap = coins.reduce((s, c) => s + c.marketCap, 0)
                    const rows = [
                      { label: isEn ? 'BTC Price' : 'BTC 价格', value: fmtPrice(btc.price), sub: `${btc.change24h >= 0 ? '+' : ''}${btc.change24h.toFixed(2)}%`, subColor: pctColor(btc.change24h) },
                      { label: isEn ? 'ETH Price' : 'ETH 价格', value: eth ? fmtPrice(eth.price) : '—', sub: eth ? `${eth.change24h >= 0 ? '+' : ''}${eth.change24h.toFixed(2)}%` : '', subColor: eth ? pctColor(eth.change24h) : 'inherit' },
                      { label: isEn ? 'BTC Market Cap' : 'BTC 市值', value: fmt(btc.marketCap), sub: null, subColor: '' },
                      { label: isEn ? 'BTC 24h Volume' : 'BTC 24h 成交量', value: fmt(btc.volume), sub: null, subColor: '' },
                      { label: isEn ? 'Total Market Cap' : '总市值', value: fmt(totalMcap), sub: global ? `${global.marketCapChange >= 0 ? '+' : ''}${global.marketCapChange?.toFixed(2)}%` : null, subColor: global ? pctColor(global.marketCapChange) : '' },
                      { label: isEn ? 'BTC Dominance' : 'BTC 占比', value: global ? `${global.btcDominance.toFixed(1)}%` : '—', sub: null, subColor: '' },
                      { label: isEn ? 'Total Volume 24h' : '24h 总成交量', value: global ? fmt(global.totalVolume) : '—', sub: null, subColor: '' },
                    ]
                    return rows.map((row, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: 'var(--panel-border)' }}>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
                          {row.sub && <span className="text-[10px] font-semibold tabular-nums" style={{ color: row.subColor }}>{row.sub}</span>}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Converter widget */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--panel-border)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    {isEn ? 'Converter' : '换算器'}
                  </span>
                </div>
                <ConverterWidget coins={coins} isEn={isEn} />
              </div>
            </div>
          </motion.div>

          {/* ── Bottom: Top Coins Table ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isEn ? 'Top 20 by Market Cap' : '市值前 20'}
                </h2>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {isEn ? 'Live prices' : '实时价格'}
                </span>
              </div>

              {coinsLoading ? (
                <div className="space-y-0">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 px-5 py-3.5 animate-pulse"
                      style={{ borderBottom: '1px solid var(--panel-border)' }}
                    >
                      <div className="w-5 h-3 rounded" style={{ background: 'var(--surface-tertiary)' }} />
                      <div className="w-6 h-6 rounded-full" style={{ background: 'var(--surface-tertiary)' }} />
                      <div className="w-20 h-3 rounded" style={{ background: 'var(--surface-tertiary)' }} />
                      <div className="flex-1" />
                      <div className="w-16 h-3 rounded" style={{ background: 'var(--surface-tertiary)' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        {[
                          { label: '#', align: 'left', hide: false },
                          { label: isEn ? 'Name' : '名称', align: 'left', hide: false },
                          { label: isEn ? 'Price' : '价格', align: 'right', hide: false },
                          { label: '24h %', align: 'right', hide: false },
                          { label: '7d %', align: 'right', hide: true },
                          { label: isEn ? 'Market Cap' : '市值', align: 'right', hide: true },
                          { label: isEn ? 'Volume (24h)' : '24h 成交量', align: 'right', hide: true },
                          { label: isEn ? '7d Trend' : '7日走势', align: 'center', hide: true },
                        ].map((h, i) => (
                          <th
                            key={i}
                            className={`px-2 sm:px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${h.hide ? 'hidden lg:table-cell' : ''} text-${h.align}`}
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {h.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {coins.map((coin, idx) => (
                        <tr
                          key={coin.id}
                          className="transition-colors cursor-pointer"
                          style={{ borderBottom: idx < coins.length - 1 ? '1px solid var(--panel-border)' : 'none' }}
                          onClick={() => switchToSymbol(coin.symbol.toUpperCase() + 'USDT')}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-tertiary)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="px-2 sm:px-4 py-3.5 text-xs tabular-nums text-left w-6 sm:w-8" style={{ color: 'var(--text-tertiary)' }}>
                            {coin.rank}
                          </td>
                          <td className="px-2 sm:px-4 py-3.5 text-left">
                            <div className="flex items-center gap-2">
                              <img src={coin.image} alt={coin.symbol} className="w-6 h-6 rounded-full shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{coin.name}</div>
                                <div className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>{coin.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3.5 text-xs text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {fmtPrice(coin.price)}
                          </td>
                          <td className="px-2 sm:px-4 py-3.5 text-xs text-right tabular-nums">
                            <span
                              className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
                              style={{
                                background: coin.change24h >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                color: pctColor(coin.change24h),
                              }}
                            >
                              {coin.change24h >= 0 ? '▲' : '▼'} {Math.abs(coin.change24h).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-right tabular-nums hidden lg:table-cell">
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
                              style={{
                                background: coin.change7d >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                color: pctColor(coin.change7d),
                              }}
                            >
                              {coin.change7d >= 0 ? '▲' : '▼'} {Math.abs(coin.change7d).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-right tabular-nums hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                            {fmt(coin.marketCap)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-right tabular-nums hidden lg:table-cell" style={{ color: 'var(--text-tertiary)' }}>
                            <div>{fmt(coin.volume)}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                              {coin.marketCap > 0 ? `${((coin.volume / coin.marketCap) * 100).toFixed(1)}% mcap` : ''}
                            </div>
                          </td>
                          {/* 7d sparkline bar */}
                          <td className="px-4 py-3.5 hidden lg:table-cell">
                            <div className="flex items-center justify-center">
                              <MiniSparkline change7d={coin.change7d} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Ticker scroll animation */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll {
          animation: ticker-scroll 80s linear infinite;
          width: max-content;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
