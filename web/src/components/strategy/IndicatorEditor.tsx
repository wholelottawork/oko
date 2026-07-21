import { Clock, Activity, TrendingUp, BarChart2, Info, Lock, ExternalLink, Zap, Check, AlertCircle, Key } from 'lucide-react'
import type { IndicatorConfig } from '../../types'

// Default NofxOS API Key
const DEFAULT_NOFXOS_API_KEY = 'cm_568c67eae410d912c54c'

interface IndicatorEditorProps {
  config: IndicatorConfig
  onChange: (config: IndicatorConfig) => void
  disabled?: boolean
  language: string
}

// All available timeframes
const allTimeframes = [
  { value: '1m', label: '1m', category: 'scalp' },
  { value: '3m', label: '3m', category: 'scalp' },
  { value: '5m', label: '5m', category: 'scalp' },
  { value: '15m', label: '15m', category: 'intraday' },
  { value: '30m', label: '30m', category: 'intraday' },
  { value: '1h', label: '1h', category: 'intraday' },
  { value: '2h', label: '2h', category: 'swing' },
  { value: '4h', label: '4h', category: 'swing' },
  { value: '6h', label: '6h', category: 'swing' },
  { value: '8h', label: '8h', category: 'swing' },
  { value: '12h', label: '12h', category: 'swing' },
  { value: '1d', label: '1D', category: 'position' },
  { value: '3d', label: '3D', category: 'position' },
  { value: '1w', label: '1W', category: 'position' },
]

export function IndicatorEditor({
  config,
  onChange,
  disabled,
  language: _language,
}: IndicatorEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      // Section titles
      marketData: 'Market Data',
      marketDataDesc: 'Core price data for AI analysis',
      technicalIndicators: 'Technical Indicators',
      technicalIndicatorsDesc: 'Optional indicators, AI can calculate them',
      marketSentiment: 'Market Sentiment',
      marketSentimentDesc: 'OI, funding rate and market sentiment data',
      quantData: 'Quant Data',
      quantDataDesc: 'Netflow, whale movements',

      // Timeframes
      timeframes: 'Timeframes',
      timeframesDesc: 'Select K-line timeframes, ★ = primary (double-click)',
      klineCount: 'K-line Count',
      scalp: 'Scalp',
      intraday: 'Intraday',
      swing: 'Swing',
      position: 'Position',

      // Data types
      rawKlines: 'Raw OHLCV K-lines',
      rawKlinesDesc: 'Required - Open/High/Low/Close/Volume data for AI',
      required: 'Required',

      // Indicators
      ema: 'EMA',
      emaDesc: 'Exponential Moving Average',
      macd: 'MACD',
      macdDesc: 'Moving Average Convergence Divergence',
      rsi: 'RSI',
      rsiDesc: 'Relative Strength Index',
      atr: 'ATR',
      atrDesc: 'Average True Range',
      boll: 'Bollinger Bands',
      bollDesc: 'Upper/Middle/Lower Bands',
      volume: 'Volume',
      volumeDesc: 'Trading volume analysis',
      oi: 'Open Interest',
      oiDesc: 'Futures open interest',
      fundingRate: 'Funding Rate',
      fundingRateDesc: 'Perpetual funding rate',

      // OI Ranking
      oiRanking: 'OI Ranking',
      oiRankingDesc: 'OI change ranking',
      oiRankingNote: 'Shows coins with OI increase/decrease, helps identify capital flow',

      // NetFlow Ranking
      netflowRanking: 'NetFlow',
      netflowRankingDesc: 'Institution/retail fund flow',
      netflowRankingNote: 'Shows institution inflow/outflow ranking, retail flow comparison, Smart Money signals',

      // Price Ranking
      priceRanking: 'Price Ranking',
      priceRankingDesc: 'Gainers/losers ranking',
      priceRankingNote: 'Shows top gainers/losers, combined with fund flow and OI for trend analysis',
      priceRankingMulti: 'Multi-period',

      // Common settings
      duration: 'Duration',
      limit: 'Limit',

      // Tips
      aiCanCalculate: '💡 Tip: AI can calculate these, enabling reduces AI workload',

      // NofxOS Data Provider
      nofxosTitle: 'NofxOS Data Provider',
      nofxosDesc: 'Professional crypto quant data service',
      nofxosFeatures: 'AI500 · OI Ranking · Fund Flow · Price Ranking',
      viewApiDocs: 'API Docs',
      apiKey: 'API Key',
      apiKeyPlaceholder: 'Enter NofxOS API Key',
      fillDefault: 'Fill Default',
      connected: 'Configured',
      notConfigured: 'Not Configured',
      nofxosDataSources: 'NofxOS Data Sources',
    }
    return translations[key] || key
  }

  // Get the currently selected time period
  const selectedTimeframes = config.klines.selected_timeframes || [config.klines.primary_timeframe]

  // Switch time period selection
  const toggleTimeframe = (tf: string) => {
    if (disabled) return
    const current = [...selectedTimeframes]
    const index = current.indexOf(tf)

    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1)
        const newPrimary = tf === config.klines.primary_timeframe ? current[0] : config.klines.primary_timeframe
        onChange({
          ...config,
          klines: {
            ...config.klines,
            selected_timeframes: current,
            primary_timeframe: newPrimary,
            enable_multi_timeframe: current.length > 1,
          },
        })
      }
    } else {
      current.push(tf)
      onChange({
        ...config,
        klines: {
          ...config.klines,
          selected_timeframes: current,
          enable_multi_timeframe: current.length > 1,
        },
      })
    }
  }

  // Set the main time period
  const setPrimaryTimeframe = (tf: string) => {
    if (disabled) return
    onChange({
      ...config,
      klines: {
        ...config.klines,
        primary_timeframe: tf,
      },
    })
  }

  const categoryColors: Record<string, string> = {
    scalp: 'var(--text-secondary)',
    intraday: 'var(--text-secondary)',
    swing: 'var(--text-secondary)',
    position: 'var(--text-secondary)',
  }

  // Ensure enable_raw_klines is always true
  const ensureRawKlines = () => {
    if (!config.enable_raw_klines) {
      onChange({ ...config, enable_raw_klines: true })
    }
  }

  // Call on mount if needed
  if (config.enable_raw_klines === undefined || config.enable_raw_klines === false) {
    ensureRawKlines()
  }

  // Check if any NofxOS feature is enabled
  const hasNofxosEnabled = config.enable_quant_data || config.enable_oi_ranking || config.enable_netflow_ranking || config.enable_price_ranking
  const hasApiKey = !!config.nofxos_api_key

  return (
    <div className="space-y-5">
      {/* ============================================ */}
      {/* NofxOS Data Provider - Top Configuration    */}
      {/* ============================================ */}
      <div className="rounded-lg overflow-hidden bg-[var(--surface-secondary)] border border-[var(--panel-border)]">
        <div className="p-4">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-tertiary)] border border-[var(--panel-border)]">
                <Zap className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('nofxosTitle')}
                </h3>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {t('nofxosFeatures')}
                </span>
              </div>
            </div>

            {/* Status & API Docs */}
            <div className="flex items-center gap-2">
              {hasApiKey ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-[var(--panel-border)] text-[var(--text-secondary)]">
                  <Check className="w-3 h-3" />
                  {t('connected')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-[var(--panel-border)] text-[var(--text-secondary)]">
                  <AlertCircle className="w-3 h-3" />
                  {t('notConfigured')}
                </span>
              )}
              <a
                href="https://nofxos.ai/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-[var(--panel-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                {t('viewApiDocs')}
              </a>
            </div>
          </div>

          {/* API Key Input */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={config.nofxos_api_key || ''}
                onChange={(e) => !disabled && onChange({ ...config, nofxos_api_key: e.target.value })}
                disabled={disabled}
                placeholder={t('apiKeyPlaceholder')}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm font-mono"
                style={{
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            {!disabled && !config.nofxos_api_key && (
              <button
                type="button"
                onClick={() => onChange({ ...config, nofxos_api_key: DEFAULT_NOFXOS_API_KEY })}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all bg-[var(--accent-primary)] text-[#000] hover:opacity-90"
              >
                {t('fillDefault')}
              </button>
            )}
          </div>

          {/* NofxOS Data Sources Grid */}
          <div className="mt-4">
            <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('nofxosDataSources')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Quant Data */}
              <div
                className={`p-2.5 rounded-lg transition-all cursor-pointer border ${config.enable_quant_data ? 'bg-[var(--surface-tertiary)]' : 'bg-[var(--surface-primary)]'} ${disabled ? 'opacity-50' : ''}`}
                style={{ borderColor: 'var(--panel-border)' }}
                onClick={() => !disabled && onChange({ ...config, enable_quant_data: !config.enable_quant_data })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('quantData')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enable_quant_data || false}
                    onChange={(e) => { e.stopPropagation(); !disabled && onChange({ ...config, enable_quant_data: e.target.checked }) }}
                    disabled={disabled}
                    className="w-3.5 h-3.5 rounded"
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('quantDataDesc')}</p>
                {config.enable_quant_data && (
                  <div className="flex gap-3 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enable_quant_oi !== false}
                        onChange={(e) => { e.stopPropagation(); !disabled && onChange({ ...config, enable_quant_oi: e.target.checked }) }}
                        disabled={disabled}
                        className="w-3 h-3 rounded"
                      />
                      <span className="text-[10px]" style={{ color: 'var(--text-primary)' }}>OI</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enable_quant_netflow !== false}
                        onChange={(e) => { e.stopPropagation(); !disabled && onChange({ ...config, enable_quant_netflow: e.target.checked }) }}
                        disabled={disabled}
                        className="w-3 h-3 rounded"
                      />
                      <span className="text-[10px]" style={{ color: 'var(--text-primary)' }}>Netflow</span>
                    </label>
                  </div>
                )}
              </div>

              {/* OI Ranking */}
              <div
                className={`p-2.5 rounded-lg transition-all cursor-pointer border ${config.enable_oi_ranking ? 'bg-[var(--surface-tertiary)]' : 'bg-[var(--surface-primary)]'} ${disabled ? 'opacity-50' : ''}`}
                style={{ borderColor: 'var(--panel-border)' }}
                onClick={() => !disabled && onChange({
                  ...config,
                  enable_oi_ranking: !config.enable_oi_ranking,
                  ...(!config.enable_oi_ranking && !config.oi_ranking_duration ? { oi_ranking_duration: '1h' } : {}),
                  ...(!config.enable_oi_ranking && !config.oi_ranking_limit ? { oi_ranking_limit: 10 } : {}),
                })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('oiRanking')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enable_oi_ranking || false}
                    onChange={(e) => { e.stopPropagation(); !disabled && onChange({
                      ...config,
                      enable_oi_ranking: e.target.checked,
                      ...(e.target.checked && !config.oi_ranking_duration ? { oi_ranking_duration: '1h' } : {}),
                      ...(e.target.checked && !config.oi_ranking_limit ? { oi_ranking_limit: 10 } : {}),
                    }) }}
                    disabled={disabled}
                    className="w-3.5 h-3.5 rounded"
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('oiRankingDesc')}</p>
                {config.enable_oi_ranking && (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={config.oi_ranking_duration || '1h'}
                      onChange={(e) => !disabled && onChange({ ...config, oi_ranking_duration: e.target.value })}
                      disabled={disabled}
                      className="flex-1 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                    >
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="24h">24h</option>
                    </select>
                    <select
                      value={config.oi_ranking_limit || 10}
                      onChange={(e) => !disabled && onChange({ ...config, oi_ranking_limit: parseInt(e.target.value) })}
                      disabled={disabled}
                      className="w-14 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                    >
                      {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* NetFlow Ranking */}
              <div
                className={`p-2.5 rounded-lg transition-all cursor-pointer border ${config.enable_netflow_ranking ? 'bg-[var(--surface-tertiary)]' : 'bg-[var(--surface-primary)]'} ${disabled ? 'opacity-50' : ''}`}
                style={{ borderColor: 'var(--panel-border)' }}
                onClick={() => !disabled && onChange({
                  ...config,
                  enable_netflow_ranking: !config.enable_netflow_ranking,
                  ...(!config.enable_netflow_ranking && !config.netflow_ranking_duration ? { netflow_ranking_duration: '1h' } : {}),
                  ...(!config.enable_netflow_ranking && !config.netflow_ranking_limit ? { netflow_ranking_limit: 10 } : {}),
                })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('netflowRanking')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enable_netflow_ranking || false}
                    onChange={(e) => { e.stopPropagation(); !disabled && onChange({
                      ...config,
                      enable_netflow_ranking: e.target.checked,
                      ...(e.target.checked && !config.netflow_ranking_duration ? { netflow_ranking_duration: '1h' } : {}),
                      ...(e.target.checked && !config.netflow_ranking_limit ? { netflow_ranking_limit: 10 } : {}),
                    }) }}
                    disabled={disabled}
                    className="w-3.5 h-3.5 rounded"
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('netflowRankingDesc')}</p>
                {config.enable_netflow_ranking && (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={config.netflow_ranking_duration || '1h'}
                      onChange={(e) => !disabled && onChange({ ...config, netflow_ranking_duration: e.target.value })}
                      disabled={disabled}
                      className="flex-1 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                    >
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="24h">24h</option>
                    </select>
                    <select
                      value={config.netflow_ranking_limit || 10}
                      onChange={(e) => !disabled && onChange({ ...config, netflow_ranking_limit: parseInt(e.target.value) })}
                      disabled={disabled}
                      className="w-14 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                    >
                      {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Price Ranking */}
              <div
                className={`p-2.5 rounded-lg transition-all cursor-pointer border ${config.enable_price_ranking ? 'bg-[var(--surface-tertiary)]' : 'bg-[var(--surface-primary)]'} ${disabled ? 'opacity-50' : ''}`}
                style={{ borderColor: 'var(--panel-border)' }}
                onClick={() => !disabled && onChange({
                  ...config,
                  enable_price_ranking: !config.enable_price_ranking,
                  ...(!config.enable_price_ranking && !config.price_ranking_duration ? { price_ranking_duration: '1h,4h,24h' } : {}),
                  ...(!config.enable_price_ranking && !config.price_ranking_limit ? { price_ranking_limit: 10 } : {}),
                })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('priceRanking')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enable_price_ranking || false}
                    onChange={(e) => { e.stopPropagation(); !disabled && onChange({
                      ...config,
                      enable_price_ranking: e.target.checked,
                      ...(e.target.checked && !config.price_ranking_duration ? { price_ranking_duration: '1h,4h,24h' } : {}),
                      ...(e.target.checked && !config.price_ranking_limit ? { price_ranking_limit: 10 } : {}),
                    }) }}
                    disabled={disabled}
                    className="w-3.5 h-3.5 rounded"
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('priceRankingDesc')}</p>
                {config.enable_price_ranking && (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={config.price_ranking_duration || '1h,4h,24h'}
                      onChange={(e) => !disabled && onChange({ ...config, price_ranking_duration: e.target.value })}
                      disabled={disabled}
                      className="flex-1 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                    >
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="24h">24h</option>
                      <option value="1h,4h,24h">{t('priceRankingMulti')}</option>
                    </select>
                    <select
                      value={config.price_ranking_limit || 10}
                      onChange={(e) => !disabled && onChange({ ...config, price_ranking_limit: parseInt(e.target.value) })}
                      disabled={disabled}
                      className="w-14 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                    >
                      {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Warning if features enabled but no API key */}
            {hasNofxosEnabled && !hasApiKey && (
              <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-[var(--surface-primary)] border border-[var(--panel-border)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]" />
                <span className="text-[10px] text-[var(--text-primary)]">
                  {'Please configure API Key to enable NofxOS data sources'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 1: Market Data (Required)           */}
      {/* ============================================ */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--surface-tertiary)' }}>
          <BarChart2 className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('marketData')}</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>- {t('marketDataDesc')}</span>
        </div>

        <div className="p-3 space-y-4">
          {/* Raw Klines - Required, Always On */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--panel-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-tertiary)] border border-[var(--panel-border)]">
                <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('rawKlines')}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border border-[var(--panel-border)] text-[var(--text-secondary)]">
                    <Lock className="w-2.5 h-2.5" />
                    {t('required')}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('rawKlinesDesc')}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              className="w-5 h-5 rounded cursor-not-allowed"
            />
          </div>

          {/* Timeframe Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('timeframes')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('klineCount')}:</span>
                <input
                  type="number"
                  value={config.klines.primary_count}
                  onChange={(e) =>
                    !disabled &&
                    onChange({
                      ...config,
                      klines: { ...config.klines, primary_count: parseInt(e.target.value) || 30 },
                    })
                  }
                  disabled={disabled}
                  min={10}
                  max={200}
                  className="w-16 px-2 py-1 rounded text-xs text-center"
                  style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <p className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)' }}>{t('timeframesDesc')}</p>

            {/* Timeframe Grid */}
            <div className="space-y-1.5">
              {(['scalp', 'intraday', 'swing', 'position'] as const).map((category) => {
                const categoryTfs = allTimeframes.filter((tf) => tf.category === category)
                return (
                  <div key={category} className="flex items-center gap-2">
                    <span className="text-[10px] w-10 flex-shrink-0" style={{ color: categoryColors[category] }}>
                      {t(category)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {categoryTfs.map((tf) => {
                        const isSelected = selectedTimeframes.includes(tf.value)
                        const isPrimary = config.klines.primary_timeframe === tf.value
                        return (
                          <button
                            key={tf.value}
                            onClick={() => toggleTimeframe(tf.value)}
                            onDoubleClick={() => setPrimaryTimeframe(tf.value)}
                            disabled={disabled}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              isSelected ? '' : 'opacity-40 hover:opacity-70'
                            }`}
                            style={{
                              background: isSelected ? 'var(--surface-tertiary)' : 'transparent',
                              border: `1px solid ${isSelected ? 'var(--panel-border)' : 'var(--surface-tertiary)'}`,
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                              boxShadow: isPrimary ? '0 0 0 2px var(--panel-border)' : undefined,
                            }}
                            title={isPrimary ? `${tf.label} (Primary)` : tf.label}
                          >
                            {tf.label}
                            {isPrimary && <span className="ml-0.5 text-[8px]">★</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 2: Technical Indicators (Optional)  */}
      {/* ============================================ */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--surface-tertiary)' }}>
          <Activity className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('technicalIndicators')}</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>- {t('technicalIndicatorsDesc')}</span>
        </div>

        <div className="p-3">
          {/* Tip */}
          <div className="flex items-start gap-2 mb-3 p-2 rounded bg-[var(--surface-secondary)] border border-[var(--panel-border)]">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--text-secondary)]" />
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('aiCanCalculate')}</p>
          </div>

          {/* Indicator Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'enable_ema', label: 'ema', desc: 'emaDesc', periodKey: 'ema_periods', defaultPeriods: '20,50' },
              { key: 'enable_macd', label: 'macd', desc: 'macdDesc' },
              { key: 'enable_rsi', label: 'rsi', desc: 'rsiDesc', periodKey: 'rsi_periods', defaultPeriods: '7,14' },
              { key: 'enable_atr', label: 'atr', desc: 'atrDesc', periodKey: 'atr_periods', defaultPeriods: '14' },
              { key: 'enable_boll', label: 'boll', desc: 'bollDesc', periodKey: 'boll_periods', defaultPeriods: '20' },
            ].map(({ key, label, desc, periodKey, defaultPeriods }) => (
              <div
                key={key}
                className={`p-2.5 rounded-lg transition-all border ${config[key as keyof IndicatorConfig] ? 'bg-[var(--surface-tertiary)]' : 'bg-transparent'}`}
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t(label)}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config[key as keyof IndicatorConfig] as boolean || false}
                    onChange={(e) => !disabled && onChange({ ...config, [key]: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded"
                  />
                </div>
                <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{t(desc)}</p>
                {periodKey && config[key as keyof IndicatorConfig] && (
                  <input
                    type="text"
                    value={(config[periodKey as keyof IndicatorConfig] as number[])?.join(',') || defaultPeriods}
                    onChange={(e) => {
                      if (disabled) return
                      const periods = e.target.value
                        .split(',')
                        .map((s) => parseInt(s.trim()))
                        .filter((n) => !isNaN(n) && n > 0)
                      onChange({ ...config, [periodKey]: periods })
                    }}
                    disabled={disabled}
                    placeholder={defaultPeriods}
                    className="w-full px-2 py-1 rounded text-[10px] text-center"
                    style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 3: Market Sentiment                 */}
      {/* ============================================ */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--surface-tertiary)' }}>
          <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('marketSentiment')}</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>- {t('marketSentimentDesc')}</span>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'enable_volume', label: 'volume', desc: 'volumeDesc' },
              { key: 'enable_oi', label: 'oi', desc: 'oiDesc' },
              { key: 'enable_funding_rate', label: 'fundingRate', desc: 'fundingRateDesc' },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                className={`p-2.5 rounded-lg transition-all border ${config[key as keyof IndicatorConfig] ? 'bg-[var(--surface-tertiary)]' : 'bg-transparent'}`}
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t(label)}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config[key as keyof IndicatorConfig] as boolean || false}
                    onChange={(e) => !disabled && onChange({ ...config, [key]: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded"
                  />
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
