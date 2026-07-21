import { Router } from 'express'
import { authMiddleware } from '../auth.js'

const router = Router()

// ─── Shared helpers ──────────────────────────────────────────────────────────

const BINANCE_API = 'https://api.binance.com'
const BINANCE_FAPI = 'https://fapi.binance.com'
const BINANCE_DATA = 'https://fapi.binance.com/futures/data'
const COINGECKO = 'https://api.coingecko.com/api/v3'
const FEAR_GREED = 'https://api.alternative.me/fng'

async function fetchJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

// Simple in-memory cache to respect rate limits
const cache = {}
function cached(key, ttlMs, fetcher) {
  const entry = cache[key]
  if (entry && Date.now() - entry.ts < ttlMs) return Promise.resolve(entry.data)
  return fetcher().then(data => {
    cache[key] = { data, ts: Date.now() }
    return data
  }).catch(err => {
    if (entry) return entry.data
    throw err
  })
}

// ─── Klines (authenticated) ─────────────────────────────────────────────────

router.get('/klines', authMiddleware, async (req, res) => {
  const { symbol = 'BTCUSDT', interval = '4h', limit = 100 } = req.query
  try {
    const data = await cached(`klines:${symbol}:${interval}:${limit}`, 30000, () =>
      fetchJson(`${BINANCE_API}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
    )
    res.json(data.map(k => ({
      time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
    })))
  } catch (err) {
    console.error('Klines fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch klines' })
  }
})

router.get('/orders', authMiddleware, (_req, res) => res.json([]))
router.get('/open-orders', authMiddleware, (_req, res) => res.json([]))
router.get('/trades', authMiddleware, (_req, res) => res.json([]))

router.get('/symbols', (_req, res) => {
  res.json([
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
    'LINKUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
    'ARBUSDT', 'OPUSDT', 'APTUSDT', 'SUIUSDT', 'SEIUSDT',
  ])
})

// ─── SSE Ticker Stream — live from Binance ───────────────────────────────────

const TICKER_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'POLUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT',
  'TIAUSDT', 'JUPUSDT', 'WIFUSDT', 'BONKUSDT', 'PEPEUSDT',
]

async function fetchAllTickers() {
  return cached('binance_tickers', 3000, async () => {
    const all = await fetchJson(`${BINANCE_API}/api/v3/ticker/24hr`)
    const map = {}
    for (const t of all) {
      if (TICKER_SYMBOLS.includes(t.symbol)) {
        map[t.symbol] = {
          price: parseFloat(t.lastPrice) >= 1 ? parseFloat(t.lastPrice).toFixed(2) : parseFloat(t.lastPrice).toFixed(6),
          changePercent: `${parseFloat(t.priceChangePercent) >= 0 ? '+' : ''}${parseFloat(t.priceChangePercent).toFixed(2)}%`,
        }
      }
    }
    return map
  })
}

router.get('/market/tickers', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendAll = async () => {
    try {
      const tickers = await fetchAllTickers()
      for (const [symbol, data] of Object.entries(tickers)) {
        res.write(`data: ${JSON.stringify({ symbol, price: data.price, changePercent: data.changePercent })}\n\n`)
      }
    } catch (err) {
      console.error('Ticker fetch error:', err.message)
    }
  }

  sendAll()
  const interval = setInterval(sendAll, 3000)
  req.on('close', () => clearInterval(interval))
})

// ─── Global Market Data — live from CoinGecko + Fear & Greed ─────────────────

router.get('/market/global', async (_req, res) => {
  try {
    const [globalData, fng] = await Promise.all([
      cached('cg_global', 120000, () => fetchJson(`${COINGECKO}/global`)),
      cached('fear_greed', 300000, () => fetchJson(`${FEAR_GREED}/?limit=1`)),
    ])
    res.json({ global: globalData, fearGreed: fng })
  } catch (err) {
    console.error('Global data fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch global data' })
  }
})

// ─── Top Coins — live from CoinGecko ─────────────────────────────────────────

router.get('/market/coins', async (_req, res) => {
  try {
    const coins = await cached('cg_coins', 60000, () =>
      fetchJson(`${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&sparkline=false&price_change_percentage=7d`)
    )
    res.json(coins)
  } catch (err) {
    console.error('Coins fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch coins' })
  }
})

// ─── Trending — live from CoinGecko ──────────────────────────────────────────

const SYMBOL_TO_BINANCE = {
  btc: 'BTCUSDT', eth: 'ETHUSDT', sol: 'SOLUSDT', bnb: 'BNBUSDT',
  xrp: 'XRPUSDT', doge: 'DOGEUSDT', ada: 'ADAUSDT', avax: 'AVAXUSDT',
  link: 'LINKUSDT', dot: 'DOTUSDT', matic: 'POLUSDT', uni: 'UNIUSDT',
  ltc: 'LTCUSDT', atom: 'ATOMUSDT', near: 'NEARUSDT', apt: 'APTUSDT',
  arb: 'ARBUSDT', op: 'OPUSDT', inj: 'INJUSDT', sui: 'SUIUSDT',
  tia: 'TIAUSDT', jup: 'JUPUSDT', wif: 'WIFUSDT', bonk: 'BONKUSDT',
  pepe: 'PEPEUSDT', rndr: 'RNDRUSDT', render: 'RNDRUSDT', fet: 'FETUSDT',
  sei: 'SEIUSDT', strk: 'STRKUSDT', pendle: 'PENDLEUSDT',
}

router.get('/market/trending', async (_req, res) => {
  try {
    const data = await cached('cg_trending', 120000, () =>
      fetchJson(`${COINGECKO}/search/trending`)
    )
    // Add binance_symbol to each trending coin
    if (data.coins) {
      for (const c of data.coins) {
        const sym = c.item?.symbol?.toLowerCase()
        c.item.binance_symbol = SYMBOL_TO_BINANCE[sym] || `${(sym || '').toUpperCase()}USDT`
      }
    }
    res.json(data)
  } catch (err) {
    console.error('Trending fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch trending' })
  }
})

// ─── Top Gainers — derived from CoinGecko coins data ────────────────────────

router.get('/market/gainers', async (_req, res) => {
  try {
    const coins = await cached('cg_gainers', 60000, () =>
      fetchJson(`${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false`)
    )
    const sorted = coins
      .filter(c => c.price_change_percentage_24h != null)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 7)
      .map(c => ({
        ...c,
        binance_symbol: SYMBOL_TO_BINANCE[c.symbol?.toLowerCase()] || `${(c.symbol || '').toUpperCase()}USDT`,
      }))
    res.json(sorted)
  } catch (err) {
    console.error('Gainers fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch gainers' })
  }
})

// ─── Market Chart — live from CoinGecko ──────────────────────────────────────

router.get('/market/chart', async (_req, res) => {
  try {
    const [mcData, volData] = await Promise.all([
      cached('cg_chart_mc', 600000, () =>
        fetchJson(`${COINGECKO}/coins/bitcoin/market_chart?vs_currency=usd&days=7`)
      ),
      cached('cg_chart_vol', 600000, () =>
        fetchJson(`${COINGECKO}/coins/bitcoin/market_chart?vs_currency=usd&days=1`)
      ),
    ])
    res.json({
      marketCap: { market_caps: mcData.market_caps || [] },
      volume: { total_volumes: volData.total_volumes || [] },
    })
  } catch (err) {
    console.error('Chart fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch chart data' })
  }
})

// ─── Futures / Liquidation Map — live from Binance ───────────────────────────

function buildLiqLevels(price, oi) {
  const LEVELS = 20, RANGE = 0.15
  const step = (price * RANGE * 2) / LEVELS
  const levels = []
  for (let i = 0; i < LEVELS; i++) {
    const liqPrice = price * (1 - RANGE) + i * step
    const dist = Math.abs(liqPrice - price) / price
    const weight = Math.exp(-dist * 12) + Math.exp(-Math.pow(dist - 0.07, 2) * 200) * 0.6
    levels.push({ price: liqPrice, weight, isLong: liqPrice < price })
  }
  const totalWeight = levels.reduce((s, l) => s + l.weight, 0)
  return levels.map(l => ({
    price: l.price,
    weight: l.weight,
    maxWeight: Math.max(...levels.map(x => x.weight)),
    isLong: l.isLong,
    oiEstimate: (oi * l.weight / totalWeight * price / 1e6),
  }))
}

router.get('/market/futures', async (req, res) => {
  const { symbol = 'BTC' } = req.query
  const sym = symbol.toUpperCase()
  const pair = `${sym}USDT`

  try {
    const [ticker, oiData, lsRatio, takerRatio, oiHist, fundingArr] = await Promise.all([
      fetchJson(`${BINANCE_FAPI}/fapi/v1/ticker/24hr?symbol=${pair}`),
      fetchJson(`${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${pair}`),
      fetchJson(`${BINANCE_DATA}/globalLongShortAccountRatio?symbol=${pair}&period=5m&limit=1`),
      fetchJson(`${BINANCE_DATA}/takerlongshortRatio?symbol=${pair}&period=5m&limit=1`),
      fetchJson(`${BINANCE_DATA}/openInterestHist?symbol=${pair}&period=5m&limit=12`),
      fetchJson(`${BINANCE_FAPI}/fapi/v1/fundingRate?symbol=${pair}&limit=1`),
    ])

    const price = parseFloat(ticker.lastPrice)
    const oi = parseFloat(oiData.openInterest)
    const funding = fundingArr[0]?.fundingRate || '0'

    res.json({
      sym,
      ticker: {
        lastPrice: ticker.lastPrice,
        priceChangePercent: ticker.priceChangePercent,
        lastFundingRate: funding,
      },
      oiData: { openInterest: oiData.openInterest },
      lsRatio: lsRatio.map(r => ({ longAccount: r.longAccount, shortAccount: r.shortAccount })),
      takerRatio: takerRatio.map(r => ({ buyVol: r.buyVol, sellVol: r.sellVol })),
      oiHist: oiHist.map(h => ({ sumOpenInterest: h.sumOpenInterest, timestamp: h.timestamp })),
      levels: buildLiqLevels(price, oi),
    })
  } catch (err) {
    console.error('Binance futures fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch live data from Binance' })
  }
})

export default router
