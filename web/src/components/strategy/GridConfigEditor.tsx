import { Grid, DollarSign, TrendingUp, Shield, Compass } from 'lucide-react'
import type { GridStrategyConfig } from '../../types'

interface GridConfigEditorProps {
  config: GridStrategyConfig
  onChange: (config: GridStrategyConfig) => void
  disabled?: boolean
  language: string
}

// Default grid config
export const defaultGridConfig: GridStrategyConfig = {
  symbol: 'BTCUSDT',
  grid_count: 10,
  total_investment: 1000,
  leverage: 5,
  upper_price: 0,
  lower_price: 0,
  use_atr_bounds: true,
  atr_multiplier: 2.0,
  distribution: 'gaussian',
  max_drawdown_pct: 15,
  stop_loss_pct: 5,
  daily_loss_limit_pct: 10,
  use_maker_only: true,
  enable_direction_adjust: false,
  direction_bias_ratio: 0.7,
}

export function GridConfigEditor({
  config,
  onChange,
  disabled,
  language: _language,
}: GridConfigEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      // Section titles
      tradingPair: 'Trading Setup',
      gridParameters: 'Grid Parameters',
      priceBounds: 'Price Bounds',
      riskControl: 'Risk Control',

      // Trading pair
      symbol: 'Trading Pair',
      symbolDesc: 'Select trading pair for grid trading',

      // Investment
      totalInvestment: 'Investment (USDT)',
      totalInvestmentDesc: 'Total investment for grid strategy',
      leverage: 'Leverage',
      leverageDesc: 'Leverage for trading (1-5)',

      // Grid parameters
      gridCount: 'Grid Count',
      gridCountDesc: 'Number of grid levels (5-50)',
      distribution: 'Distribution',
      distributionDesc: 'Fund allocation across grid levels',
      uniform: 'Uniform',
      gaussian: 'Gaussian (Recommended)',
      pyramid: 'Pyramid',

      // Price bounds
      useAtrBounds: 'Auto-calculate Bounds (ATR)',
      useAtrBoundsDesc: 'Auto-calculate bounds based on ATR',
      atrMultiplier: 'ATR Multiplier',
      atrMultiplierDesc: 'ATR multiplier for bounds distance',
      upperPrice: 'Upper Price',
      upperPriceDesc: 'Grid upper bound (0=auto)',
      lowerPrice: 'Lower Price',
      lowerPriceDesc: 'Grid lower bound (0=auto)',

      // Risk control
      maxDrawdown: 'Max Drawdown (%)',
      maxDrawdownDesc: 'Max drawdown before emergency exit',
      stopLoss: 'Stop Loss (%)',
      stopLossDesc: 'Stop loss per position',
      dailyLossLimit: 'Daily Loss Limit (%)',
      dailyLossLimitDesc: 'Maximum daily loss percentage',
      useMakerOnly: 'Maker Only Orders',
      useMakerOnlyDesc: 'Use limit orders for lower fees',

      // Direction adjustment
      directionAdjust: 'Direction Auto-Adjust',
      enableDirectionAdjust: 'Enable Direction Adjust',
      enableDirectionAdjustDesc: 'Auto-adjust grid direction based on box breakouts',
      directionBiasRatio: 'Bias Strength',
      directionBiasRatioDesc: 'Strength for long_bias/short_bias modes',
      directionBiasExplain: 'Long bias: X% buy + (100-X)% sell | Short bias: (100-X)% buy + X% sell',
      directionExplain: 'Short box breakout → bias, Mid box breakout → full, Price return → gradually recover to neutral',
      directionModes: 'Direction Modes',
      modeNeutral: 'Neutral: 50% buy + 50% sell (default)',
      modeLongBias: 'Long Bias: X% buy + (100-X)% sell',
      modeLong: 'Long: 100% buy + 0% sell',
      modeShortBias: 'Short Bias: (100-X)% buy + X% sell',
      modeShort: 'Short: 0% buy + 100% sell',
    }
    return translations[key] || key
  }

  const updateField = <K extends keyof GridStrategyConfig>(
    key: K,
    value: GridStrategyConfig[K]
  ) => {
    if (!disabled) {
      onChange({ ...config, [key]: value })
    }
  }

  const inputStyle = {
    background: 'var(--surface-secondary)',
    border: '1px solid var(--surface-tertiary)',
    color: 'var(--text-primary)',
  }

  const sectionStyle = {
    background: 'var(--surface-primary)',
    border: '1px solid var(--surface-tertiary)',
  }

  return (
    <div className="space-y-6">
      {/* Trading Setup */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5" style={{ color: 'var(--oko-gold)' }} />
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('tradingPair')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Symbol */}
          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('symbol')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('symbolDesc')}
            </p>
            <select
              value={config.symbol}
              onChange={(e) => updateField('symbol', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            >
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
              <option value="XRPUSDT">XRP/USDT</option>
              <option value="DOGEUSDT">DOGE/USDT</option>
            </select>
          </div>

          {/* Investment */}
          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('totalInvestment')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('totalInvestmentDesc')}
            </p>
            <input
              type="number"
              value={config.total_investment}
              onChange={(e) => updateField('total_investment', parseFloat(e.target.value) || 1000)}
              disabled={disabled}
              min={100}
              step={100}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            />
          </div>

          {/* Leverage */}
          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('leverage')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('leverageDesc')}
            </p>
            <input
              type="number"
              value={config.leverage}
              onChange={(e) => updateField('leverage', parseInt(e.target.value) || 5)}
              disabled={disabled}
              min={1}
              max={5}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Grid Parameters */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Grid className="w-5 h-5" style={{ color: 'var(--oko-gold)' }} />
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('gridParameters')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grid Count */}
          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('gridCount')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('gridCountDesc')}
            </p>
            <input
              type="number"
              value={config.grid_count}
              onChange={(e) => updateField('grid_count', parseInt(e.target.value) || 10)}
              disabled={disabled}
              min={5}
              max={50}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            />
          </div>

          {/* Distribution */}
          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('distribution')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('distributionDesc')}
            </p>
            <select
              value={config.distribution}
              onChange={(e) => updateField('distribution', e.target.value as 'uniform' | 'gaussian' | 'pyramid')}
              disabled={disabled}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            >
              <option value="uniform">{t('uniform')}</option>
              <option value="gaussian">{t('gaussian')}</option>
              <option value="pyramid">{t('pyramid')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Price Bounds */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--oko-gold)' }} />
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('priceBounds')}
          </h3>
        </div>

        {/* ATR Toggle */}
        <div className="p-4 rounded-lg mb-4" style={sectionStyle}>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('useAtrBounds')}
              </label>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('useAtrBoundsDesc')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.use_atr_bounds}
                onChange={(e) => updateField('use_atr_bounds', e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>
        </div>

        {config.use_atr_bounds ? (
          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('atrMultiplier')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('atrMultiplierDesc')}
            </p>
            <input
              type="number"
              value={config.atr_multiplier}
              onChange={(e) => updateField('atr_multiplier', parseFloat(e.target.value) || 2.0)}
              disabled={disabled}
              min={1}
              max={5}
              step={0.5}
              className="w-32 px-3 py-2 rounded"
              style={inputStyle}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={sectionStyle}>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t('upperPrice')}
              </label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('upperPriceDesc')}
              </p>
              <input
                type="number"
                value={config.upper_price}
                onChange={(e) => updateField('upper_price', parseFloat(e.target.value) || 0)}
                disabled={disabled}
                min={0}
                step={0.01}
                className="w-full px-3 py-2 rounded"
                style={inputStyle}
              />
            </div>
            <div className="p-4 rounded-lg" style={sectionStyle}>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t('lowerPrice')}
              </label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('lowerPriceDesc')}
              </p>
              <input
                type="number"
                value={config.lower_price}
                onChange={(e) => updateField('lower_price', parseFloat(e.target.value) || 0)}
                disabled={disabled}
                min={0}
                step={0.01}
                className="w-full px-3 py-2 rounded"
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* Risk Control */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" style={{ color: 'var(--oko-gold)' }} />
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('riskControl')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('maxDrawdown')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('maxDrawdownDesc')}
            </p>
            <input
              type="number"
              value={config.max_drawdown_pct}
              onChange={(e) => updateField('max_drawdown_pct', parseFloat(e.target.value) || 15)}
              disabled={disabled}
              min={5}
              max={50}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            />
          </div>

          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('stopLoss')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('stopLossDesc')}
            </p>
            <input
              type="number"
              value={config.stop_loss_pct}
              onChange={(e) => updateField('stop_loss_pct', parseFloat(e.target.value) || 5)}
              disabled={disabled}
              min={1}
              max={20}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            />
          </div>

          <div className="p-4 rounded-lg" style={sectionStyle}>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('dailyLossLimit')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('dailyLossLimitDesc')}
            </p>
            <input
              type="number"
              value={config.daily_loss_limit_pct}
              onChange={(e) => updateField('daily_loss_limit_pct', parseFloat(e.target.value) || 10)}
              disabled={disabled}
              min={1}
              max={30}
              className="w-full px-3 py-2 rounded"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Maker Only Toggle */}
        <div className="p-4 rounded-lg" style={sectionStyle}>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('useMakerOnly')}
              </label>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('useMakerOnlyDesc')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.use_maker_only}
                onChange={(e) => updateField('use_maker_only', e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Direction Auto-Adjust */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5" style={{ color: 'var(--oko-gold)' }} />
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('directionAdjust')}
          </h3>
        </div>

        {/* Enable Toggle */}
        <div className="p-4 rounded-lg mb-4" style={sectionStyle}>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('enableDirectionAdjust')}
              </label>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('enableDirectionAdjustDesc')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enable_direction_adjust ?? false}
                onChange={(e) => updateField('enable_direction_adjust', e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>
        </div>

        {config.enable_direction_adjust && (
          <>
            {/* Direction Modes Explanation */}
            <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--surface-secondary)', border: '1px solid rgba(51, 153, 140, 0.2)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--oko-gold)' }}>
                📊 {t('directionModes')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div>• {t('modeNeutral')}</div>
                <div>• <span style={{ color: 'var(--binance-green)' }}>{t('modeLongBias')}</span></div>
                <div>• <span style={{ color: 'var(--binance-green)' }}>{t('modeLong')}</span></div>
                <div>• <span style={{ color: 'var(--binance-red)' }}>{t('modeShortBias')}</span></div>
                <div>• <span style={{ color: 'var(--binance-red)' }}>{t('modeShort')}</span></div>
              </div>
              <p className="text-xs mt-3 pt-2 border-t border-zinc-700" style={{ color: 'var(--text-secondary)' }}>
                💡 {t('directionExplain')}
              </p>
            </div>

            {/* Bias Strength */}
            <div className="p-4 rounded-lg" style={sectionStyle}>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t('directionBiasRatio')} (X)
              </label>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('directionBiasRatioDesc')}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--oko-gold)' }}>
                {t('directionBiasExplain')}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  value={(config.direction_bias_ratio ?? 0.7) * 100}
                  onChange={(e) => updateField('direction_bias_ratio', parseInt(e.target.value) / 100)}
                  disabled={disabled}
                  min={55}
                  max={90}
                  step={5}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: 'var(--surface-tertiary)' }}
                />
                <span className="text-sm font-mono w-20 text-right" style={{ color: 'var(--oko-gold)' }}>
                  X = {Math.round((config.direction_bias_ratio ?? 0.7) * 100)}%
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded" style={{ background: '#0ECB8115', border: '1px solid #0ECB8130' }}>
                  <span style={{ color: 'var(--binance-green)' }}>/Long Bias: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{Math.round((config.direction_bias_ratio ?? 0.7) * 100)}%  + {Math.round((1 - (config.direction_bias_ratio ?? 0.7)) * 100)}% </span>
                </div>
                <div className="p-2 rounded" style={{ background: '#F6465D15', border: '1px solid #F6465D30' }}>
                  <span style={{ color: 'var(--binance-red)' }}>/Short Bias: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{Math.round((1 - (config.direction_bias_ratio ?? 0.7)) * 100)}%  + {Math.round((config.direction_bias_ratio ?? 0.7) * 100)}% </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
