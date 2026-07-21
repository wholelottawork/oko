import { Router } from 'express'
import { authMiddleware } from '../auth.js'

const router = Router()

router.get('/klines', authMiddleware, (req, res) => {
  const { symbol = 'BTCUSDT', interval = '4h', limit = 100 } = req.query
  const intervalMs = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 }
  const ms = intervalMs[interval] || 14400000
  const now = Date.now()
  const klines = []
  let price = symbol.includes('BTC') ? 67000 : symbol.includes('ETH') ? 3456 : 178
  for (let i = parseInt(limit) - 1; i >= 0; i--) {
    const t = now - i * ms
    const change = (Math.random() - 0.5) * price * 0.02
    const open = price
    price += change
    const high = Math.max(open, price) * (1 + Math.random() * 0.005)
    const low = Math.min(open, price) * (1 - Math.random() * 0.005)
    klines.push({ time: t, open, high, low, close: price, volume: Math.random() * 1000 })
  }
  res.json(klines)
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

// SSE ticker stream — sends individual ticker updates per symbol
router.get('/market/tickers', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const prices = {
    BTCUSDT: 67234.5, ETHUSDT: 3456.78, SOLUSDT: 178.92, BNBUSDT: 612.34,
    XRPUSDT: 0.6234, DOGEUSDT: 0.1523, ADAUSDT: 0.4812, AVAXUSDT: 38.56,
    LINKUSDT: 14.82, DOTUSDT: 7.23, POLUSDT: 0.58, UNIUSDT: 9.45,
    LTCUSDT: 84.32, ATOMUSDT: 9.12, NEARUSDT: 6.78, APTUSDT: 8.92,
    ARBUSDT: 1.12, OPUSDT: 2.34, INJUSDT: 28.45, SUIUSDT: 1.56,
    TIAUSDT: 8.34, JUPUSDT: 1.23, WIFUSDT: 2.67, BONKUSDT: 0.0000234, PEPEUSDT: 0.0000156,
  }

  const sendAll = () => {
    for (const [symbol, basePrice] of Object.entries(prices)) {
      const change = (Math.random() - 0.5) * 0.002
      prices[symbol] = basePrice * (1 + change)
      const pct = ((Math.random() - 0.3) * 5).toFixed(2)
      const pctStr = parseFloat(pct) >= 0 ? `+${pct}%` : `${pct}%`
      res.write(`data: ${JSON.stringify({
        symbol,
        price: prices[symbol] >= 1 ? prices[symbol].toFixed(2) : prices[symbol].toFixed(6),
        changePercent: pctStr,
      })}\n\n`)
    }
  }

  sendAll()
  const interval = setInterval(sendAll, 3000)
  req.on('close', () => clearInterval(interval))
})

// CoinGecko-style global data
router.get('/market/global', (_req, res) => {
  res.json({
    global: {
      data: {
        total_market_cap: { usd: 2450000000000 },
        total_volume: { usd: 89000000000 },
        market_cap_percentage: { btc: 52.3, eth: 17.8 },
        market_cap_change_percentage_24h_usd: 1.23,
        active_cryptocurrencies: 12500,
      },
    },
    fearGreed: {
      data: [{ value: '62', value_classification: 'Greed' }],
    },
  })
})

// CoinGecko-style coin list
router.get('/market/coins', (_req, res) => {
  res.json([
    { id: 'bitcoin', market_cap_rank: 1, name: 'Bitcoin', symbol: 'btc', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', current_price: 67234.5, price_change_percentage_24h: 2.34, price_change_percentage_7d_in_currency: 5.12, market_cap: 1320000000000, total_volume: 28500000000 },
    { id: 'ethereum', market_cap_rank: 2, name: 'Ethereum', symbol: 'eth', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', current_price: 3456.78, price_change_percentage_24h: 1.56, price_change_percentage_7d_in_currency: 3.45, market_cap: 415000000000, total_volume: 15200000000 },
    { id: 'binancecoin', market_cap_rank: 3, name: 'BNB', symbol: 'bnb', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', current_price: 612.34, price_change_percentage_24h: -0.87, price_change_percentage_7d_in_currency: 1.23, market_cap: 92000000000, total_volume: 1800000000 },
    { id: 'solana', market_cap_rank: 4, name: 'Solana', symbol: 'sol', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', current_price: 178.92, price_change_percentage_24h: 4.21, price_change_percentage_7d_in_currency: 8.67, market_cap: 82000000000, total_volume: 3200000000 },
    { id: 'ripple', market_cap_rank: 5, name: 'XRP', symbol: 'xrp', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', current_price: 0.6234, price_change_percentage_24h: 3.12, price_change_percentage_7d_in_currency: 2.34, market_cap: 34000000000, total_volume: 2100000000 },
    { id: 'dogecoin', market_cap_rank: 6, name: 'Dogecoin', symbol: 'doge', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', current_price: 0.1523, price_change_percentage_24h: 1.89, price_change_percentage_7d_in_currency: -0.45, market_cap: 22000000000, total_volume: 1200000000 },
    { id: 'cardano', market_cap_rank: 7, name: 'Cardano', symbol: 'ada', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', current_price: 0.4812, price_change_percentage_24h: 0.92, price_change_percentage_7d_in_currency: 3.21, market_cap: 17000000000, total_volume: 800000000 },
    { id: 'avalanche-2', market_cap_rank: 8, name: 'Avalanche', symbol: 'avax', image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', current_price: 38.56, price_change_percentage_24h: 2.67, price_change_percentage_7d_in_currency: 6.78, market_cap: 15000000000, total_volume: 600000000 },
    { id: 'chainlink', market_cap_rank: 9, name: 'Chainlink', symbol: 'link', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', current_price: 14.82, price_change_percentage_24h: 1.45, price_change_percentage_7d_in_currency: 4.56, market_cap: 9000000000, total_volume: 500000000 },
    { id: 'polkadot', market_cap_rank: 10, name: 'Polkadot', symbol: 'dot', image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png', current_price: 7.23, price_change_percentage_24h: -0.34, price_change_percentage_7d_in_currency: 1.89, market_cap: 10000000000, total_volume: 400000000 },
  ])
})

// CoinGecko-style trending
router.get('/market/trending', (_req, res) => {
  res.json({
    coins: [
      { item: { id: 'pepe', name: 'Pepe', symbol: 'PEPE', thumb: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg', data: { price: 0.0000156, price_change_percentage_24h: { usd: 15.6 } }, market_cap_rank: 24, binance_symbol: 'PEPEUSDT' } },
      { item: { id: 'dogwifhat', name: 'dogwifhat', symbol: 'WIF', thumb: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg', data: { price: 2.67, price_change_percentage_24h: { usd: 12.3 } }, market_cap_rank: 52, binance_symbol: 'WIFUSDT' } },
      { item: { id: 'render-token', name: 'Render', symbol: 'RNDR', thumb: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png', data: { price: 8.45, price_change_percentage_24h: { usd: 8.9 } }, market_cap_rank: 28, binance_symbol: 'RNDRUSDT' } },
      { item: { id: 'jupiter', name: 'Jupiter', symbol: 'JUP', thumb: 'https://assets.coingecko.com/coins/images/34188/small/jup.png', data: { price: 1.23, price_change_percentage_24h: { usd: 7.8 } }, market_cap_rank: 45, binance_symbol: 'JUPUSDT' } },
      { item: { id: 'sui', name: 'Sui', symbol: 'SUI', thumb: 'https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png', data: { price: 1.56, price_change_percentage_24h: { usd: 6.5 } }, market_cap_rank: 30, binance_symbol: 'SUIUSDT' } },
      { item: { id: 'injective', name: 'Injective', symbol: 'INJ', thumb: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png', data: { price: 28.45, price_change_percentage_24h: { usd: 5.2 } }, market_cap_rank: 35, binance_symbol: 'INJUSDT' } },
      { item: { id: 'celestia', name: 'Celestia', symbol: 'TIA', thumb: 'https://assets.coingecko.com/coins/images/31967/small/tia.jpg', data: { price: 8.34, price_change_percentage_24h: { usd: 4.1 } }, market_cap_rank: 42, binance_symbol: 'TIAUSDT' } },
    ],
  })
})

// CoinGecko-style gainers
router.get('/market/gainers', (_req, res) => {
  res.json([
    { id: 'pepe', name: 'Pepe', symbol: 'pepe', image: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg', current_price: 0.0000156, price_change_percentage_24h: 15.6, binance_symbol: 'PEPEUSDT' },
    { id: 'dogwifhat', name: 'dogwifhat', symbol: 'wif', image: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg', current_price: 2.67, price_change_percentage_24h: 12.3, binance_symbol: 'WIFUSDT' },
    { id: 'render-token', name: 'Render', symbol: 'rndr', image: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png', current_price: 8.45, price_change_percentage_24h: 8.9, binance_symbol: 'RNDRUSDT' },
    { id: 'bonk', name: 'Bonk', symbol: 'bonk', image: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg', current_price: 0.0000234, price_change_percentage_24h: 7.5, binance_symbol: 'BONKUSDT' },
    { id: 'jupiter', name: 'Jupiter', symbol: 'jup', image: 'https://assets.coingecko.com/coins/images/34188/small/jup.png', current_price: 1.23, price_change_percentage_24h: 6.8, binance_symbol: 'JUPUSDT' },
  ])
})

// CoinGecko-style chart data (7-day market cap + volume)
router.get('/market/chart', (_req, res) => {
  const now = Date.now()
  const hourMs = 3600000
  const marketCaps = []
  const volumes = []
  let mcap = 2400000000000
  for (let i = 168; i >= 0; i--) {
    const t = now - i * hourMs
    mcap += (Math.random() - 0.48) * mcap * 0.002
    marketCaps.push([t, mcap])
    volumes.push([t, 80000000000 + (Math.random() - 0.5) * 20000000000])
  }
  res.json({
    marketCap: { market_caps: marketCaps },
    volume: { total_volumes: volumes },
  })
})

// Futures data for liquidation map + AI signals
const FUTURES_PRICES = {
  BTC: 67234.5, ETH: 3456.78, SOL: 178.92, BNB: 612.34, XRP: 0.6234,
}
const FUTURES_OI = {
  BTC: 580000, ETH: 3200000, SOL: 12000000, BNB: 950000, XRP: 45000000,
}

router.get('/market/futures', (_req, res) => {
  const { symbol = 'BTC' } = _req.query
  const sym = symbol.toUpperCase()
  const basePrice = FUTURES_PRICES[sym] || 67234.5
  const baseOI = FUTURES_OI[sym] || 580000
  const price = basePrice * (1 + (Math.random() - 0.5) * 0.002)
  const oi = baseOI * (1 + (Math.random() - 0.5) * 0.01)

  // Liquidation levels
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

  // OI flow history (12 x 5min intervals)
  const oiHist = []
  let oiVal = oi * 0.98
  const now = Date.now()
  for (let i = 0; i < 12; i++) {
    oiVal *= 1 + (Math.random() - 0.48) * 0.005
    oiHist.push({ sumOpenInterest: oiVal.toFixed(2), timestamp: now - (11 - i) * 300000 })
  }

  // AI signals data
  const longRatio = 0.45 + Math.random() * 0.12
  const shortRatio = 1 - longRatio
  const takerBuyRatio = 0.8 + Math.random() * 0.4
  const fundingRate = (Math.random() - 0.5) * 0.0008
  const oiFirst = parseFloat(oiHist[0].sumOpenInterest)
  const oiLast = parseFloat(oiHist[oiHist.length - 1].sumOpenInterest)
  const oiTrend = ((oiLast - oiFirst) / oiFirst) * 100
  const priceChange24h = (Math.random() - 0.4) * 6

  res.json({
    sym,
    ticker: {
      lastPrice: price.toString(),
      priceChangePercent: priceChange24h.toFixed(2),
      lastFundingRate: fundingRate.toFixed(6),
    },
    oiData: { openInterest: oi.toFixed(2) },
    lsRatio: [{ longAccount: longRatio.toFixed(4), shortAccount: shortRatio.toFixed(4) }],
    takerRatio: [{ buyVol: (takerBuyRatio * 1000).toFixed(2), sellVol: '1000.00' }],
    oiHist,
    levels: levels.map(l => ({
      price: l.price,
      weight: l.weight,
      maxWeight: Math.max(...levels.map(x => x.weight)),
      isLong: l.isLong,
      oiEstimate: (oi * l.weight / totalWeight * price / 1e6),
    })),
  })
})

export default router
