import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  UTCTimestamp,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
} from 'lightweight-charts'
import { httpClient } from '../lib/httpClient'
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  type Kline,
} from '../utils/indicators'
import { Settings, BarChart2 } from 'lucide-react'

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Order interface definition
interface OrderMarker {
  time: number
  price: number
  side: 'long' | 'short'
  rawSide: string // Original side field (buy/sell from database)
  action: 'open' | 'close'
  pnl?: number
  symbol: string
}

// Pending order interface definition (exchange take-profit and stop-loss orders)
interface OpenOrder {
  order_id: string
  symbol: string
  side: string          // BUY/SELL
  position_side: string // LONG/SHORT
  type: string          // LIMIT/STOP_MARKET/TAKE_PROFIT_MARKET
  price: number         // limit order price
  stop_price: number    // Trigger price (stop loss/take profit)
  quantity: number
  status: string
}

interface AdvancedChartProps {
  symbol: string
  interval?: string
  traderID?: string
  height?: number
  exchange?: string // Exchange type: binance, bybit, okx, bitget, hyperliquid, aster, lighter
  onSymbolChange?: (symbol: string) => void // Asset-symbol change callback
}

// Indicator configuration
interface IndicatorConfig {
  id: string
  name: string
  enabled: boolean
  color: string
  params?: any
}

// Get the currency unit of transaction amount
const getQuoteUnit = (exchange: string): string => {
  if (['alpaca'].includes(exchange)) {
    return 'USD'
  }
  if (['forex', 'metals'].includes(exchange)) {
    return '' // There is no real trading volume in foreign exchange/precious metals
  }
  return 'USDT' // Cryptocurrency default USDT
}

// Get the volume quantity unit
const getBaseUnit = (exchange: string, symbol: string): string => {
  if (['alpaca'].includes(exchange)) {
    return 'shares'
  }
  if (['forex', 'metals'].includes(exchange)) {
    return ''
  }
  // Cryptocurrency: Extract underlying asset from symbol
  const base = symbol.replace(/USDT$|USD$|BUSD$/, '')
  return base || 'units'
}

// Format large numbers
const formatVolume = (value: number): string => {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M'
  if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K'
  return value.toFixed(2)
}

export function AdvancedChart({
  symbol = 'BTCUSDT',
  interval = '5m',
  traderID,
  height = 550,
  exchange = 'binance', // Binance is used by default
  onSymbolChange: _onSymbolChange, // Available for future use
}: AdvancedChartProps) {
  void _onSymbolChange // Prevent unused warning
  const quoteUnit = getQuoteUnit(exchange)
  const baseUnit = getBaseUnit(exchange, symbol)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map())
  const seriesMarkersRef = useRef<any>(null) // Markers primitive for v5
  const currentMarkersDataRef = useRef<any[]>([]) // Store current tag data
  const klineDataRef = useRef<Map<number, { volume: number; quoteVolume: number }>>(new Map()) // Store kline extra data
  const priceLinesRef = useRef<any[]>([]) // Store pending order price line

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false)
  const [showOrderMarkers, setShowOrderMarkers] = useState(true) // Order mark display switch, displayed by default
  const isInitialLoadRef = useRef(true) // Track whether it is an initial load
  const [tooltipData, setTooltipData] = useState<any>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Market statistics (current K-line)
  const [marketStats, setMarketStats] = useState<{
    price: number
    priceChange: number
    priceChangePercent: number
    high: number
    low: number
    volume: number      // Quantity (BTC/shares)
    quoteVolume: number // Trading volume (USDT/USD)
  } | null>(null)

  // Indicator configuration
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([
    { id: 'volume', name: 'Volume', enabled: true, color: 'var(--accent-primary)' },
    { id: 'ma5', name: 'MA5', enabled: false, color: '#FF6B6B', params: { period: 5 } },
    { id: 'ma10', name: 'MA10', enabled: false, color: '#4ECDC4', params: { period: 10 } },
    { id: 'ma20', name: 'MA20', enabled: false, color: 'var(--accent-primary-hover)', params: { period: 20 } },
    { id: 'ma60', name: 'MA60', enabled: false, color: '#95E1D3', params: { period: 60 } },
    { id: 'ema12', name: 'EMA12', enabled: false, color: '#A8E6CF', params: { period: 12 } },
    { id: 'ema26', name: 'EMA26', enabled: false, color: '#FFD3B6', params: { period: 26 } },
    { id: 'bb', name: 'Bollinger Bands', enabled: false, color: '#9B59B6' },
  ])

  // Get K-line data from service
  const fetchKlineData = async (symbol: string, interval: string) => {
    try {
      const limit = 1500
      const klineUrl = `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&exchange=${exchange}`
      const result = await httpClient.get(klineUrl)

      if (!result.success || !result.data) {
        throw new Error('Failed to fetch kline data')
      }

      // Convert data format
      const rawData = result.data.map((candle: any) => ({
        time: Math.floor(candle.openTime / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,           // Quantity (BTC/shares)
        quoteVolume: candle.quoteVolume, // Trading volume (USDT/USD)
      }))

      // Sort by time and remove duplicates (lightweight-charts requires data in ascending order by time and no duplication)
      const sortedData = rawData.sort((a: any, b: any) => a.time - b.time)
      const dedupedData = sortedData.filter((item: any, index: number, arr: any[]) =>
        index === 0 || item.time !== arr[index - 1].time
      )

      if (rawData.length !== dedupedData.length) {
        console.warn('[AdvancedChart] Removed', rawData.length - dedupedData.length, 'duplicate klines')
      }

      return dedupedData
    } catch (err) {
      console.error('[AdvancedChart] Error fetching kline:', err)
      throw err
    }
  }

  // Parse time: Supports Unix timestamp (numeric) or string format
  const parseCustomTime = (time: any): number => {
    if (!time) {
      console.warn('[AdvancedChart] Empty time value')
      return 0
    }

    // if already a number (Unix timestamp)
    if (typeof time === 'number') {
      // Determine whether it is milliseconds or seconds: if it is greater than 10^12, it is considered milliseconds (millisecond timestamp after 2001)
      if (time > 1000000000000) {
        const seconds = Math.floor(time / 1000)
        console.log('[AdvancedChart] ✅ Unix timestamp (ms→s):', time, '→', seconds, '(', new Date(time).toISOString(), ')')
        return seconds
      }
      console.log('[AdvancedChart] ✅ Unix timestamp (s):', time, '(', new Date(time * 1000).toISOString(), ')')
      return time
    }

    const timeStr = String(time)
    console.log('[AdvancedChart] Parsing time string:', timeStr)

    // Try standard ISO format
    const isoTime = new Date(timeStr).getTime()
    if (!isNaN(isoTime) && isoTime > 0) {
      const timestamp = Math.floor(isoTime / 1000)
      console.log('[AdvancedChart] ✅ Parsed as ISO:', timeStr, '→', timestamp, '(', new Date(timestamp * 1000).toISOString(), ')')
      return timestamp
    }

    // Parse custom format "MM-DD HH:mm UTC" (compatible with old data)
    const match = timeStr.match(/(\d{2})-(\d{2})\s+(\d{2}):(\d{2})\s+UTC/)
    if (match) {
      const currentYear = new Date().getFullYear()
      const [_, month, day, hour, minute] = match
      const date = new Date(Date.UTC(
        currentYear,
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      ))
      const timestamp = Math.floor(date.getTime() / 1000)
      console.log('[AdvancedChart] ✅ Parsed as custom format:', timeStr, '→', timestamp, '(', new Date(timestamp * 1000).toISOString(), ')')
      return timestamp
    }

    console.error('[AdvancedChart] ❌ Failed to parse time:', timeStr)
    return 0
  }

  // Get order data
  const fetchOrders = async (traderID: string, symbol: string): Promise<OrderMarker[]> => {
    try {
      console.log('[AdvancedChart] Fetching orders for trader:', traderID, 'symbol:', symbol)
      // Get completed orders and increase to 200 to display more historical orders
      const result = await httpClient.get(`/api/orders?trader_id=${traderID}&symbol=${symbol}&status=FILLED&limit=200`)

      console.log('[AdvancedChart] Orders API response:', result)

      if (!result.success || !result.data) {
        console.warn('[AdvancedChart] No orders found, result:', result)
        return []
      }

      const orders = result.data
      console.log('[AdvancedChart] Raw orders data:', orders)
      const markers: OrderMarker[] = []

      orders.forEach((order: any) => {
        console.log('[AdvancedChart] Processing order:', order)

        // Processing field names: supports PascalCase and snake_case
        const filledAt = order.filled_at || order.FilledAt || order.created_at || order.CreatedAt
        const avgPrice = order.avg_fill_price || order.AvgFillPrice || order.price || order.Price
        const orderAction = order.order_action || order.OrderAction
        const side = (order.side || order.Side)?.toLowerCase() // BUY/SELL
        const symbol = order.symbol || order.Symbol

        // Skip orders without execution time or price
        if (!filledAt || !avgPrice || avgPrice === 0) {
          console.warn('[AdvancedChart] Skipping order - missing data:', { filledAt, avgPrice })
          return
        }

        const timeSeconds = parseCustomTime(filledAt)
        if (timeSeconds === 0) {
          console.warn('[AdvancedChart] Skipping order - invalid time:', filledAt)
          return
        }

        // Determine whether to open or close a position based on order_action
        let action: 'open' | 'close' = 'open'
        let positionSide: 'long' | 'short' = 'long'

        if (orderAction) {
          if (orderAction.includes('OPEN')) {
            action = 'open'
            positionSide = orderAction.includes('LONG') ? 'long' : 'short'
          } else if (orderAction.includes('CLOSE')) {
            action = 'close'
            positionSide = orderAction.includes('LONG') ? 'long' : 'short'
          }
        } else {
          // If there is no order_action, judge based on side
          positionSide = side === 'buy' ? 'long' : 'short'
        }

        console.log('[AdvancedChart] Order marker:', {
          time: timeSeconds,
          price: avgPrice,
          side: positionSide,
          rawSide: side,
          action,
          orderAction
        })

        markers.push({
          time: timeSeconds,
          price: avgPrice,
          side: positionSide,
          rawSide: side, // Original side field (buy/sell)
          action: action,
          symbol,
        })
      })

      console.log('[AdvancedChart] Final markers:', markers)
      return markers
    } catch (err) {
      console.error('[AdvancedChart] Error fetching orders:', err)
      return []
    }
  }

  // Get exchange pending orders (take-profit and stop-loss orders)
  const fetchOpenOrders = async (traderID: string, symbol: string): Promise<OpenOrder[]> => {
    try {
      console.log('[AdvancedChart] Fetching open orders for trader:', traderID, 'symbol:', symbol)
      const result = await httpClient.get(`/api/open-orders?trader_id=${traderID}&symbol=${symbol}`)

      console.log('[AdvancedChart] Open orders API response:', result)

      if (!result.success || !result.data) {
        console.warn('[AdvancedChart] No open orders found')
        return []
      }

      return result.data as OpenOrder[]
    } catch (err) {
      console.error('[AdvancedChart] Error fetching open orders:', err)
      return []
    }
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 800,
      height: chartContainerRef.current.clientHeight || height,
      layout: {
        background: { color: getCssVar('--surface-primary') },
        textColor: getCssVar('--text-secondary'),
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: 'rgba(43, 49, 57, 0.2)',
          style: 1,
          visible: true,
        },
        horzLines: {
          color: 'rgba(43, 49, 57, 0.2)',
          style: 1,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'var(--accent-primary-border)',
          width: 1,
          style: 2,
          labelBackgroundColor: getCssVar('--oko-gold'),
        },
        horzLine: {
          color: 'var(--accent-primary-border)',
          width: 1,
          style: 2,
          labelBackgroundColor: getCssVar('--oko-gold'),
        },
      },
      rightPriceScale: {
        borderColor: getCssVar('--surface-tertiary'),
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
        borderVisible: true,
        entireTextOnly: false,
      },
      timeScale: {
        borderColor: getCssVar('--surface-tertiary'),
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        rightOffset: 5,
        barSpacing: 8,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000)
          return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        },
      },
    })

    chartRef.current = chart

    // Create K-line series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: getCssVar('--binance-green'),
      downColor: getCssVar('--binance-red'),
      borderUpColor: getCssVar('--binance-green'),
      borderDownColor: getCssVar('--binance-red'),
      wickUpColor: getCssVar('--binance-green'),
      wickDownColor: getCssVar('--binance-red'),
    })
    candlestickSeriesRef.current = candlestickSeries as any

    // Create a volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    volumeSeriesRef.current = volumeSeries as any

    // Responsive resizing (ResizeObserver)
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return
      const { width, height } = entries[0].contentRect
      chart.applyOptions({ width, height })
    })

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current)
    }

    // Monitor mouse movement and display OHLC information
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point || !candlestickSeriesRef.current) {
        setTooltipData(null)
        return
      }

      const data = param.seriesData.get(candlestickSeriesRef.current as any)
      if (!data) {
        setTooltipData(null)
        return
      }

      const candleData = data as any

      // Get volume and quoteVolume from stored data
      const klineExtra = klineDataRef.current.get(param.time as number) || { volume: 0, quoteVolume: 0 }

      setTooltipData({
        time: param.time,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: klineExtra.volume,
        quoteVolume: klineExtra.quoteVolume,
        x: param.point.x,
        y: param.point.y,
      })
    })

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, []) // Chart is created once, ResizeObserver handles dimension changes


  // Load data and metrics
  useEffect(() => {
    // When symbol or interval changes, reset the initial load flag (to automatically adapt to new data)
    isInitialLoadRef.current = true

    // Clear old marker data to prevent old data from affecting new charts
    currentMarkersDataRef.current = []
    if (seriesMarkersRef.current) {
      try {
        seriesMarkersRef.current.setMarkers([])
      } catch (e) {
        // Ignore the error and will recreate it later
      }
      seriesMarkersRef.current = null
    }

    const loadData = async (isRefresh = false) => {
      if (!candlestickSeriesRef.current) return

      console.log('[AdvancedChart] Loading data for', symbol, interval, isRefresh ? '(refresh)' : '')
      // Only display the loading when loading for the first time, do not display it when refreshing to avoid flickering.
      if (!isRefresh) {
        setLoading(true)
      }
      setError(null)

      try {
        // 1. Get K-line data
        const klineData = await fetchKlineData(symbol, interval)
        console.log('[AdvancedChart] Loaded', klineData.length, 'klines')
        candlestickSeriesRef.current.setData(klineData)

        // Store volume/quoteVolume data for tooltip use
        klineDataRef.current.clear()
        klineData.forEach((k: any) => {
          klineDataRef.current.set(k.time, { volume: k.volume || 0, quoteVolume: k.quoteVolume || 0 })
        })

        // 1.5 Calculate market statistics
        if (klineData.length > 1) {
          const latestKline = klineData[klineData.length - 1]
          const prevKline = klineData[klineData.length - 2]

          // Increase or decrease: current K-line closing price vs previous K-line closing price
          const priceChange = latestKline.close - prevKline.close
          const priceChangePercent = (priceChange / prevKline.close) * 100

          setMarketStats({
            price: latestKline.close,
            priceChange,
            priceChangePercent,
            high: latestKline.high,
            low: latestKline.low,
            volume: latestKline.volume || 0,
            quoteVolume: latestKline.quoteVolume || 0,
          })
        } else if (klineData.length === 1) {
          const latestKline = klineData[0]
          setMarketStats({
            price: latestKline.close,
            priceChange: 0,
            priceChangePercent: 0,
            high: latestKline.high,
            low: latestKline.low,
            volume: latestKline.volume || 0,
            quoteVolume: latestKline.quoteVolume || 0,
          })
        }

        // 2. Display trading volume
        if (volumeSeriesRef.current) {
          const volumeEnabled = indicators.find(i => i.id === 'volume')?.enabled
          if (volumeEnabled) {
            const volumeData = klineData.map((k: Kline) => ({
              time: k.time,
              value: k.volume || 0,
              color: k.close >= k.open ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)',
            }))
            volumeSeriesRef.current.setData(volumeData)
          } else {
            // Clear data when closing volume
            volumeSeriesRef.current.setData([])
          }
        }

        // 3. Add indicators
        updateIndicators(klineData)

        // 4. Get and display order tags
        if (traderID && candlestickSeriesRef.current) {
          console.log('[AdvancedChart] Starting to fetch orders...')
          const orders = await fetchOrders(traderID, symbol)
          console.log('[AdvancedChart] Received orders:', orders)

          if (orders.length > 0) {
            console.log('[AdvancedChart] Creating markers from', orders.length, 'orders')

            // Extract K-line time array (sorted)
            const klineTimes = klineData.map((k: any) => k.time as number)
            const klineMinTime = klineTimes[0] || 0
            const klineMaxTime = klineTimes[klineTimes.length - 1] || 0
            console.log('[AdvancedChart] Kline time range:', klineMinTime, '-', klineMaxTime, '(', klineTimes.length, 'candles)')

            // Binary search: find the K-line candle to which the order time belongs
            // Returns the maximum K-line time with time <= orderTime
            const findCandleTime = (orderTime: number): number | null => {
              if (orderTime < klineMinTime || orderTime > klineMaxTime) {
                return null // out of range
              }

              let left = 0
              let right = klineTimes.length - 1

              while (left < right) {
                const mid = Math.ceil((left + right + 1) / 2)
                if (klineTimes[mid] <= orderTime) {
                  left = mid
                } else {
                  right = mid - 1
                }
              }

              return klineTimes[left]
            }

            // Order statistics grouped by K-line time
            const ordersByCandle = new Map<number, { buys: number; sells: number }>()

            orders.forEach(order => {
              // Use binary search to find the corresponding K-line candle time
              const candleTime = findCandleTime(order.time)

              if (candleTime === null) {
                console.warn('[AdvancedChart] ⚠️ Skipping order outside kline range:',
                  order.time, '(', new Date(order.time * 1000).toISOString(), ')')
                return
              }

              const existing = ordersByCandle.get(candleTime) || { buys: 0, sells: 0 }
              if (order.rawSide === 'buy') {
                existing.buys++
              } else {
                existing.sells++
              }
              ordersByCandle.set(candleTime, existing)
            })

            // Create a mark for each candlestick with an order
            const markers: Array<{
              time: Time
              position: 'belowBar' | 'aboveBar'
              color: string
              shape: 'circle'
              text: string
              size: number
            }> = []

            ordersByCandle.forEach((counts, candleTime) => {
              // Show buy mark (green, below the K-line)
              if (counts.buys > 0) {
                markers.push({
                  time: candleTime as Time,
                  position: 'belowBar' as const,
                  color: '#0ECB81',
                  shape: 'circle' as const,
                  text: counts.buys > 1 ? `B${counts.buys}` : 'B',
                  size: 1,
                })
              }
              // Show sell mark (red, above the K-line)
              if (counts.sells > 0) {
                markers.push({
                  time: candleTime as Time,
                  position: 'aboveBar' as const,
                  color: '#F6465D',
                  shape: 'circle' as const,
                  text: counts.sells > 1 ? `S${counts.sells}` : 'S',
                  size: 1,
                })
              }
            })

            // Sort by time (lightweight-charts requires tags to be in chronological order)
            markers.sort((a, b) => (a.time as number) - (b.time as number))

            console.log('[AdvancedChart] Valid markers:', markers.length, 'out of', orders.length)

            console.log('[AdvancedChart] Setting', markers.length, 'markers on candlestick series')
            console.log('[AdvancedChart] Markers data:', JSON.stringify(markers, null, 2))

            try {
              // Store tag data for subsequent switching
              currentMarkersDataRef.current = markers

              // Use v5 API: createSeriesMarkers
              const markersToShow = showOrderMarkers ? markers : []

              if (seriesMarkersRef.current) {
                // If it already exists, update the tag
                seriesMarkersRef.current.setMarkers(markersToShow)
              } else {
                // Create mark for the first time
                seriesMarkersRef.current = createSeriesMarkers(candlestickSeriesRef.current, markersToShow)
              }
              console.log('[AdvancedChart] ✅ Markers updated! Count:', markersToShow.length, 'Visible:', showOrderMarkers)
            } catch (err) {
              console.error('[AdvancedChart] ❌ Failed to set markers:', err)
            }
          } else {
            console.log('[AdvancedChart] No orders found, clearing markers')
            try {
              if (seriesMarkersRef.current) {
                seriesMarkersRef.current.setMarkers([])
              }
            } catch (err) {
              console.error('[AdvancedChart] Failed to clear markers:', err)
            }
          }
        } else {
          console.log('[AdvancedChart] Skipping markers:', {
            hasTraderID: !!traderID,
            hasSeries: !!candlestickSeriesRef.current
          })
        }

        // Automatically adapt the view only during initial loading to avoid jitter during refresh
        if (isInitialLoadRef.current) {
          chartRef.current?.timeScale().fitContent()
          isInitialLoadRef.current = false
        }
        setLoading(false)
      } catch (err: any) {
        console.error('[AdvancedChart] Error loading data:', err)
        setError(err.message || 'Failed to load chart data')
        setLoading(false)
      }
    }

    loadData(false) // first load

    // Real-time automatic refresh (update every 5 seconds)
    const refreshInterval = setInterval(() => loadData(true), 5000)
    return () => clearInterval(refreshInterval)
  }, [symbol, interval, traderID, exchange])

  // Refresh the pending order price line separately (refresh every 60 seconds to avoid frequent calls to the exchange API)
  useEffect(() => {
    if (!traderID || !candlestickSeriesRef.current) return

    // Load pending orders and display price lines
    const loadOpenOrders = async () => {
      try {
        // Clear old price lines first
        priceLinesRef.current.forEach(line => {
          try {
            candlestickSeriesRef.current?.removePriceLine(line)
          } catch (e) {
            // Ignore clear errors
          }
        })
        priceLinesRef.current = []

        const openOrders = await fetchOpenOrders(traderID, symbol)
        console.log('[AdvancedChart] Open orders for price lines:', openOrders)

        if (openOrders.length > 0 && candlestickSeriesRef.current) {
          openOrders.forEach(order => {
            // Get the trigger price (stop_price for stop loss/take profit, price for limit order)
            const linePrice = order.stop_price > 0 ? order.stop_price : order.price
            if (linePrice <= 0) return

            // Determine order type
            const isStopLoss = order.type.includes('STOP') || order.type.includes('SL')
            const isTakeProfit = order.type.includes('TAKE_PROFIT') || order.type.includes('TP')
            const isLimit = order.type === 'LIMIT'

            // Set price line style
            let lineColor = 'var(--accent-primary)' // Default yellow
            const lineStyle = 2 // dotted line
            let title = ''

            if (isStopLoss) {
              lineColor = '#F6465D' // Red - stop loss
              title = `SL ${order.quantity}`
            } else if (isTakeProfit) {
              lineColor = '#0ECB81' // Green - Take Profit
              title = `TP ${order.quantity}`
            } else if (isLimit) {
              lineColor = 'var(--accent-primary)' // Yellow - Limit order
              title = `Limit ${order.side} ${order.quantity}`
            } else {
              title = `${order.type} ${order.quantity}`
            }

            const priceLine = candlestickSeriesRef.current?.createPriceLine({
              price: linePrice,
              color: lineColor,
              lineWidth: 1,
              lineStyle: lineStyle,
              axisLabelVisible: true,
              title: title,
            })

            if (priceLine) {
              priceLinesRef.current.push(priceLine)
            }
          })
          console.log('[AdvancedChart] ✅ Created', priceLinesRef.current.length, 'price lines for pending orders')
        }
      } catch (err) {
        console.error('[AdvancedChart] Error loading open orders:', err)
      }
    }

    // Initial loading (delay 1 second to wait for chart initialization to complete)
    const initialTimeout = setTimeout(loadOpenOrders, 1000)

    // Refresh pending orders every 60 seconds
    const openOrdersInterval = setInterval(loadOpenOrders, 60000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(openOrdersInterval)
    }
  }, [symbol, traderID])

  // Separately handle the display/hiding of order markers to avoid reloading data
  useEffect(() => {
    if (!seriesMarkersRef.current) return

    try {
      const markersToShow = showOrderMarkers ? currentMarkersDataRef.current : []
      seriesMarkersRef.current.setMarkers(markersToShow)
      console.log('[AdvancedChart] 🔄 Toggled markers visibility:', showOrderMarkers, 'Count:', markersToShow.length)
    } catch (err) {
      console.error('[AdvancedChart] ❌ Failed to toggle markers:', err)
    }
  }, [showOrderMarkers])

  // Update indicator
  const updateIndicators = (klineData: Kline[]) => {
    if (!chartRef.current) return

    // Clear old indicators
    indicatorSeriesRef.current.forEach(series => {
      chartRef.current?.removeSeries(series as any)
    })
    indicatorSeriesRef.current.clear()

    // Add enabled metrics
    indicators.forEach(indicator => {
      if (!indicator.enabled || !chartRef.current) return

      if (indicator.id.startsWith('ma')) {
        const maData = calculateSMA(klineData, indicator.params.period)
        const series = chartRef.current.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 2,
          title: indicator.name,
        })
        series.setData(maData as any)
        indicatorSeriesRef.current.set(indicator.id, series)
      } else if (indicator.id.startsWith('ema')) {
        const emaData = calculateEMA(klineData, indicator.params.period)
        const series = chartRef.current.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 2,
          title: indicator.name,
          lineStyle: 2, // dotted line
        })
        series.setData(emaData as any)
        indicatorSeriesRef.current.set(indicator.id, series)
      } else if (indicator.id === 'bb') {
        const bbData = calculateBollingerBands(klineData)

        const upperSeries = chartRef.current.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 1,
          title: 'BB Upper',
        })
        upperSeries.setData(bbData.map(d => ({ time: d.time as any, value: d.upper })))

        const middleSeries = chartRef.current.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 1,
          lineStyle: 2,
          title: 'BB Middle',
        })
        middleSeries.setData(bbData.map(d => ({ time: d.time as any, value: d.middle })))

        const lowerSeries = chartRef.current.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 1,
          title: 'BB Lower',
        })
        lowerSeries.setData(bbData.map(d => ({ time: d.time as any, value: d.lower })))

        indicatorSeriesRef.current.set(indicator.id + '_upper', upperSeries)
        indicatorSeriesRef.current.set(indicator.id + '_middle', middleSeries)
        indicatorSeriesRef.current.set(indicator.id + '_lower', lowerSeries)
      }
    })
  }

  // switch indicator
  const toggleIndicator = (id: string) => {
    setIndicators(prev =>
      prev.map(ind => (ind.id === id ? { ...ind, enabled: !ind.enabled } : ind))
    )
  }

  return (
    <div
      className="relative shadow-xl"
      style={{
        background: 'var(--surface-primary)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--surface-tertiary)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Compact Professional Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--surface-tertiary)', background: 'var(--surface-primary)', flexShrink: 0 }}
      >
        {/* Left: Symbol Info + Price */}
        <div className="flex items-center gap-4">
          {/* Symbol & Interval */}
          <div             className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-gray-400">{interval}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase"
              style={{
                background: exchange === 'hyperliquid' ? 'rgba(80, 227, 194, 0.1)' : 'rgba(243, 186, 47, 0.1)',
                color: exchange === 'hyperliquid' ? '#50E3C2' : '#F3BA2F',
              }}
            >
              {exchange?.toUpperCase()}
            </span>
          </div>

          {/* Price Display */}
          {marketStats && (
            <div className="flex items-center gap-3 pl-3 border-l border-[var(--surface-tertiary)]">
              <span
                className="text-base font-bold tabular-nums"
                style={{ color: marketStats.priceChange >= 0 ? '#10B981' : '#EF4444' }}
              >
                {marketStats.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: exchange === 'forex' || exchange === 'metals' ? 4 : 2
                })}
              </span>
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded tabular-nums"
                style={{
                  background: marketStats.priceChange >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: marketStats.priceChange >= 0 ? '#10B981' : '#EF4444',
                }}
              >
                {marketStats.priceChange >= 0 ? '+' : ''}{marketStats.priceChangePercent.toFixed(2)}%
              </span>

              {/* Compact H/L */}
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                <span>H <span style={{ color: 'var(--text-secondary)' }}>{marketStats.high.toFixed(2)}</span></span>
                <span>L <span style={{ color: 'var(--text-secondary)' }}>{marketStats.low.toFixed(2)}</span></span>
                {marketStats.volume > 0 && baseUnit && (
                  <span>Vol <span className="text-gray-300">{formatVolume(marketStats.volume)}</span></span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5">
          {loading && (
            <span className="text-[10px] text-blue-400 animate-pulse mr-2">
              {'Updating...'}
            </span>
          )}
          <button
            onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all"
            style={{
              background: showIndicatorPanel ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
              color: showIndicatorPanel ? 'var(--accent-primary-hover)' : '#6B7280',
            }}
          >
            <Settings className="w-3 h-3" />
            <span>{'Indicators'}</span>
          </button>

          <button
            onClick={() => setShowOrderMarkers(!showOrderMarkers)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all"
            style={{
              background: showOrderMarkers ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: showOrderMarkers ? '#10B981' : '#6B7280',
            }}
            title={'Order Markers'}
          >
            <span>B/S</span>
          </button>
        </div>
      </div>

      {/* Technical indicator panel */}
      {showIndicatorPanel && (
        <div
          className="absolute top-16 right-4 z-10 rounded-lg shadow-2xl backdrop-blur-sm"
          style={{
            background: 'var(--surface-secondary)',
            border: '1px solid var(--accent-primary-border)',
            maxHeight: '500px',
            minWidth: '280px',
            overflowY: 'auto',
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'rgba(43, 49, 57, 0.5)' }}
          >
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-bold text-white">
                {'Technical Indicators'}
              </h4>
            </div>
            <button
              onClick={() => setShowIndicatorPanel(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <span className="text-lg">×</span>
            </button>
          </div>

          {/* Indicator list */}
          <div className="p-3 space-y-1">
            {indicators.map(indicator => (
              <label
                key={indicator.id}
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-white/5 cursor-pointer transition-all group"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={indicator.enabled}
                    onChange={() => toggleIndicator(indicator.id)}
                    className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div
                  className="w-8 h-3 rounded-sm border border-white/10"
                  style={{ backgroundColor: indicator.color }}
                ></div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex-1">
                  {indicator.name}
                </span>
                {indicator.enabled && (
                  <span className="text-xs text-blue-400">●</span>
                )}
              </label>
            ))}
          </div>

          {/* Panel footer */}
          <div
            className="px-4 py-2 text-xs text-gray-500 border-t"
            style={{ borderColor: 'rgba(43, 49, 57, 0.5)' }}
          >
            {'Click to toggle indicators'}
          </div>
        </div>
      )}

      {/* Chart container */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%' }} />

        {/* OHLC Tooltip */}
        {tooltipData && (
          <div
            ref={tooltipRef}
            style={{
              position: 'absolute',
              left: '10px',
              top: '10px',
              padding: '8px 12px',
              background: 'var(--surface-secondary)',
              border: '1px solid var(--accent-primary-border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              zIndex: 10,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ marginBottom: '6px', color: 'var(--oko-gold)', fontWeight: 'bold', fontSize: '11px' }}>
              {new Date((tooltipData.time as number) * 1000).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>O:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{tooltipData.open?.toFixed(2)}</span>

              <span style={{ color: 'var(--text-secondary)' }}>H:</span>
              <span style={{ color: '#0ECB81', fontWeight: '500' }}>{tooltipData.high?.toFixed(2)}</span>

              <span style={{ color: 'var(--text-secondary)' }}>L:</span>
              <span style={{ color: '#F6465D', fontWeight: '500' }}>{tooltipData.low?.toFixed(2)}</span>

              <span style={{ color: 'var(--text-secondary)' }}>C:</span>
              <span style={{
                color: tooltipData.close >= tooltipData.open ? '#0ECB81' : '#F6465D',
                fontWeight: 'bold'
              }}>
                {tooltipData.close?.toFixed(2)}
              </span>

              {tooltipData.volume > 0 && baseUnit && (
                <>
                  <span style={{ color: 'var(--text-secondary)' }}>V({baseUnit}):</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>
                    {formatVolume(tooltipData.volume)}
                  </span>
                </>
              )}

              {tooltipData.quoteVolume > 0 && quoteUnit && (
                <>
                  <span style={{ color: 'var(--text-secondary)' }}>V({quoteUnit}):</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>
                    {formatVolume(tooltipData.quoteVolume)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* OKO  */}
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '5%',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: '56px',
              fontWeight: '700',
              color: 'var(--accent-primary-bg)',
              letterSpacing: '4px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              textShadow: '0 2px 30px var(--accent-primary-shadow)',
            }}
          >
            OKO
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'var(--surface-primary)' }}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div style={{ color: '#F6465D' }}>{error}</div>
          </div>
        </div>
      )}

    </div>
  )
}
