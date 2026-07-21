import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  UTCTimestamp,
  CandlestickSeries,
  createSeriesMarkers,
} from 'lightweight-charts'
import { useLanguage } from '../contexts/LanguageContext'
import { httpClient } from '../lib/httpClient'

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Order interface definition
interface OrderMarker {
  time: number // Unix timestamp (seconds)
  price: number
  side: string // BUY, SELL
  orderAction: string // OPEN_LONG, CLOSE_LONG, STOP_LOSS, TAKE_PROFIT, etc.
  status: string // NEW, FILLED, CANCELED, etc.
  symbol: string
}

// K line data interface
interface KlineData {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface ChartWithOrdersProps {
  symbol: string
  interval?: string // 1m, 5m, 15m, 1h, 4h, 1d
  traderID?: string // Used to obtain orders from this trader
  height?: number
  exchange?: string // Exchange type: binance, bybit, okx, bitget, hyperliquid, aster, lighter
}

export function ChartWithOrders({
  symbol = 'BTCUSDT',
  interval = '5m',
  traderID,
  height = 500,
  exchange = 'binance', // Binance is used by default
}: ChartWithOrdersProps) {
  const { language } = useLanguage()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const seriesMarkersRef = useRef<any>(null) // Markers primitive for v5
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tooltipData, setTooltipData] = useState<any>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Parse time: Supports Unix timestamp (numeric) or string format
  const parseCustomTime = (time: any): number => {
    if (!time) {
      console.warn('[ChartWithOrders] Empty time value')
      return 0
    }

    // if already a number (Unix timestamp)
    if (typeof time === 'number') {
      // Determine whether it is milliseconds or seconds: if it is greater than 10^12, it is considered milliseconds (millisecond timestamp after 2001)
      if (time > 1000000000000) {
        const seconds = Math.floor(time / 1000)
        console.log('[ChartWithOrders] ✅ Unix timestamp (ms→s):', time, '→', seconds, '(', new Date(time).toISOString(), ')')
        return seconds
      }
      console.log('[ChartWithOrders] ✅ Unix timestamp (s):', time, '(', new Date(time * 1000).toISOString(), ')')
      return time
    }

    const timeStr = String(time)
    console.log('[ChartWithOrders] Parsing time string:', timeStr)

    // Try standard ISO format
    const isoTime = new Date(timeStr).getTime()
    if (!isNaN(isoTime) && isoTime > 0) {
      const timestamp = Math.floor(isoTime / 1000)
      console.log('[ChartWithOrders] ✅ Parsed as ISO:', timeStr, '→', timestamp, '(', new Date(timestamp * 1000).toISOString(), ')')
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
      console.log('[ChartWithOrders] ✅ Parsed as custom format:', timeStr, '→', timestamp, '(', new Date(timestamp * 1000).toISOString(), ')')
      return timestamp
    }

    console.error('[ChartWithOrders] ❌ Failed to parse time:', timeStr)
    return 0
  }

  // Get K-line data from our service
  const fetchKlineData = async (symbol: string, interval: string): Promise<KlineData[]> => {
    try {
      const limit = 2000 // Get the latest 2000 K lines (more historical data)
      const klineUrl = `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&exchange=${exchange}`

      const result = await httpClient.get(klineUrl)

      if (!result.success || !result.data) {
        throw new Error('Failed to fetch kline data from our service')
      }

      const data = result.data

      // Convert backend data format to lightweight-charts format
      // The backend returns market.Kline format: {OpenTime, Open, High, Low, Close, Volume, ...}
      return data.map((candle: any) => ({
        time: Math.floor(candle.openTime / 1000) as UTCTimestamp, // Milliseconds to seconds
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }))
    } catch (err) {
      console.error('Error fetching kline data:', err)
      throw err
    }
  }

  // Get order data
  const fetchOrders = async (traderID: string, symbol: string): Promise<OrderMarker[]> => {
    try {
      // Get the trader's order record from the back-end API (only get the completed orders)
      const result = await httpClient.get(`/api/orders?trader_id=${traderID}&symbol=${symbol}&status=FILLED&limit=50`)

      if (!result.success || !result.data) {
        console.warn('Failed to fetch orders:', result.message)
        return []
      }

      const orders = result.data
      const markers: OrderMarker[] = []

      // Convert order data to markup format
      orders.forEach((order: any) => {
        const createdAt = order.created_at || order.CreatedAt
        const filledAt = order.filled_at || order.FilledAt
        const avgPrice = order.avg_fill_price || order.AvgFillPrice
        const price = order.price || order.Price
        const orderAction = order.order_action || order.OrderAction
        const side = order.side || order.Side
        const status = order.status || order.Status
        const symbol = order.symbol || order.Symbol

        // Use deal time (if available) or creation time
        const orderTime = filledAt || createdAt
        if (!orderTime) return

        const timeSeconds = parseCustomTime(orderTime)
        if (timeSeconds === 0) return

        // Use average deal price (if available) or order price
        const orderPrice = avgPrice || price
        if (!orderPrice || orderPrice === 0) return

        markers.push({
          time: timeSeconds,
          price: orderPrice,
          side: side || 'BUY',
          orderAction: orderAction || 'UNKNOWN',
          status: status || 'FILLED',
          symbol: symbol || '',
        })
      })

      console.log(`[ChartWithOrders] Loaded ${markers.length} order markers for ${symbol}`)
      return markers
    } catch (err) {
      console.error('Error fetching orders:', err)
      return []
    }
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.error('[ChartWithOrders] Container ref is null')
      return
    }

    console.log('[ChartWithOrders] Initializing chart for', symbol, interval)

    try {
      // Create chart
      const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: getCssVar('--surface-primary') },
        textColor: getCssVar('--text-primary'),
      },
      grid: {
        vertLines: { color: getCssVar('--surface-tertiary') },
        horzLines: { color: getCssVar('--surface-tertiary') },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: getCssVar('--surface-tertiary'),
      },
      timeScale: {
        borderColor: getCssVar('--surface-tertiary'),
        timeVisible: true,
        secondsVisible: false,
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

    // Create K-line series (using v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: getCssVar('--binance-green'),
      downColor: getCssVar('--binance-red'),
      borderUpColor: getCssVar('--binance-green'),
      borderDownColor: getCssVar('--binance-red'),
      wickUpColor: getCssVar('--binance-green'),
      wickDownColor: getCssVar('--binance-red'),
    })

    candlestickSeriesRef.current = candlestickSeries as any

    // Responsive adjustments
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

      window.addEventListener('resize', handleResize)

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
        setTooltipData({
          time: param.time,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          x: param.point.x,
          y: param.point.y,
        })
      })

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
      }
    } catch (err) {
      console.error('[ChartWithOrders] Failed to initialize chart:', err)
      setError('Failed to initialize chart')
    }
  }, [height])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!candlestickSeriesRef.current) {
        console.log('[ChartWithOrders] Candlestick series not ready yet')
        return
      }

      console.log('[ChartWithOrders] Loading data for', symbol, interval, 'trader:', traderID)
      setLoading(true)
      setError(null)

      try {
        // 1. Get K-line data
        console.log('[ChartWithOrders] Fetching kline data...')
        const klineData = await fetchKlineData(symbol, interval)
        console.log('[ChartWithOrders] Kline data received:', klineData.length, 'candles')
        candlestickSeriesRef.current.setData(klineData)

        // Construct K-line time collection for quick search
        const klineTimeSet = new Set(klineData.map(k => k.time as number))
        const klineMinTime = klineData.length > 0 ? klineData[0].time : 0
        const klineMaxTime = klineData.length > 0 ? klineData[klineData.length - 1].time : 0
        console.log('[ChartWithOrders] Kline time range:', klineMinTime, '-', klineMaxTime, 'candles:', klineData.length)

        // Calculates the number of seconds in a time period
        const getIntervalSeconds = (interval: string): number => {
          const match = interval.match(/(\d+)([smhd])/)
          if (!match) return 60 // Default 1 minute
          const [, num, unit] = match
          const n = parseInt(num)
          switch (unit) {
            case 's': return n
            case 'm': return n * 60
            case 'h': return n * 3600
            case 'd': return n * 86400
            default: return 60
          }
        }
        const intervalSeconds = getIntervalSeconds(interval)
        console.log('[ChartWithOrders] Interval:', interval, '=', intervalSeconds, 'seconds')

        // 2. Get order data and add tags
        if (traderID) {
          console.log('[ChartWithOrders] Fetching orders for trader:', traderID, 'symbol:', symbol)
          const orders = await fetchOrders(traderID, symbol)
          console.log('[ChartWithOrders] Received orders:', orders.length, 'orders')

          if (orders.length === 0) {
            console.log('[ChartWithOrders] No orders to display')
          }

          // Convert orders into chart markers and align them to candlestick time
          const markers: Array<{
            time: Time
            position: 'belowBar'
            color: string
            shape: 'circle'
            text: string
            price: number
            size: number
          }> = []

          orders.forEach((order) => {
            // Align order time to K-line period (round down)
            const alignedTime = Math.floor(order.time / intervalSeconds) * intervalSeconds

            // Check whether the aligned time exists in the K-line data
            if (!klineTimeSet.has(alignedTime)) {
              console.warn('[ChartWithOrders] ⚠️ Skipping order - no matching kline:',
                order.time, '→', alignedTime, '(', new Date(order.time * 1000).toISOString(), ')')
              return
            }

            const isBuy = order.side === 'BUY'
            markers.push({
              time: alignedTime as Time,
              position: 'belowBar' as const,
              color: isBuy ? '#0ECB81' : '#F6465D',
              shape: 'circle' as const,
              text: isBuy ? 'B' : 'S',
              price: order.price,
              size: 1,
            })
          })

          console.log('[ChartWithOrders] Valid markers (with matching klines):', markers.length, 'out of', orders.length)

          console.log('[ChartWithOrders] Setting', markers.length, 'markers on chart')

          try {
            // Use v5 API: createSeriesMarkers
            if (seriesMarkersRef.current) {
              // If it already exists, update the tag
              seriesMarkersRef.current.setMarkers(markers)
            } else {
              // Create mark for the first time
              seriesMarkersRef.current = createSeriesMarkers(candlestickSeriesRef.current, markers)
            }
            console.log('[ChartWithOrders] ✅ Markers set successfully!')
          } catch (err) {
            console.error('[ChartWithOrders] ❌ Failed to set markers:', err)
          }
        }

        // Automatically adapt to views
        chartRef.current?.timeScale().fitContent()

        setLoading(false)
      } catch (err) {
        console.error('Error loading chart data:', err)
        setError('Failed to load chart data')
        setLoading(false)
      }
    }

    loadData()

    // Automatic refresh - update K-line data every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData()
    }, 30000) // 30 seconds

    return () => {
      clearInterval(refreshInterval)
    }
  }, [symbol, interval, traderID, language])

  return (
    <div className="relative" style={{ background: 'var(--surface-primary)', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Chart header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--surface-tertiary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">📈</span>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {symbol} {interval}
          </h3>
        </div>
        {loading && (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {'Loading...'}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div style={{ position: 'relative' }}>
        <div ref={chartContainerRef} />

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
            <div style={{ marginBottom: '6px', color: 'var(--nofx-gold)', fontWeight: 'bold', fontSize: '11px' }}>
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
            </div>
          </div>
        )}
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

      {/* Order marker legend */}
      <div className="flex items-center gap-4 p-4 text-xs" style={{ borderTop: '1px solid var(--surface-tertiary)', color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ color: '#0ECB81' }}>B</span>
          <span>{'BUY'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ color: '#F6465D' }}>S</span>
          <span>{'SELL'}</span>
        </div>
      </div>
    </div>
  )
}
