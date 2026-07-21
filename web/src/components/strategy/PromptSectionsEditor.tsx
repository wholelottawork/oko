import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, FileText } from 'lucide-react'
import type { PromptSectionsConfig } from '../../types'

interface PromptSectionsEditorProps {
  config: PromptSectionsConfig | undefined
  onChange: (config: PromptSectionsConfig) => void
  disabled?: boolean
  language: string
}

// Default prompt sections (same as backend defaults)
const defaultSections: PromptSectionsConfig = {
  role_definition: `# You are a professional cryptocurrency trading AI

Focus on technical analysis and risk management, and make rational trading decisions from market data.
Your objective is to capture high-probability opportunities while controlling risk.`,

  trading_frequency: `# Trading frequency

- Strong traders make 2-4 trades per day, or about 0.1-0.2 per hour.
- More than 2 trades per hour is overtrading.
- Hold each position for at least 30-60 minutes.
If you trade every cycle, your standards are too low. If you close positions in under 30 minutes, you are acting too quickly.`,

  entry_standards: `# Entry standards

Open positions only when multiple signals align:
- A clear trend direction (EMA alignment and price position)
- Momentum confirmation (MACD and RSI agreement)
- Appropriate volatility (a reasonable ATR range)
- Price action supported by volume

Avoid single-indicator signals, conflicting signals, sideways markets, and immediately re-entering after a close.`,

  decision_process: `# Decision process

1. Review open positions and determine whether to take profit or stop loss.
2. Scan candidate assets across multiple timeframes for strong signals.
3. Evaluate the risk-reward ratio against the minimum requirement.
4. Provide reasoning before returning structured JSON.`,
}

export function PromptSectionsEditor({
  config,
  onChange,
  disabled,
  language: _language,
}: PromptSectionsEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    role_definition: false,
    trading_frequency: false,
    entry_standards: false,
    decision_process: false,
  })

  const t = (key: string) => {
    const translations: Record<string, string> = {
      promptSections: 'System Prompt Customization',
      promptSectionsDesc: 'Customize AI behavior and decision logic (output format and risk rules are fixed)',
      roleDefinition: 'Role Definition',
      roleDefinitionDesc: 'Define AI identity and core objectives',
      tradingFrequency: 'Trading Frequency',
      tradingFrequencyDesc: 'Set trading frequency expectations and overtrading warnings',
      entryStandards: 'Entry Standards',
      entryStandardsDesc: 'Define entry signal conditions and avoidances',
      decisionProcess: 'Decision Process',
      decisionProcessDesc: 'Set decision steps and thinking process',
      resetToDefault: 'Reset to Default',
      chars: 'chars',
    }
    return translations[key] || key
  }

  const sections = [
    { key: 'role_definition', label: t('roleDefinition'), desc: t('roleDefinitionDesc') },
    { key: 'trading_frequency', label: t('tradingFrequency'), desc: t('tradingFrequencyDesc') },
    { key: 'entry_standards', label: t('entryStandards'), desc: t('entryStandardsDesc') },
    { key: 'decision_process', label: t('decisionProcess'), desc: t('decisionProcessDesc') },
  ]

  const currentConfig = config || {}

  const updateSection = (key: keyof PromptSectionsConfig, value: string) => {
    if (!disabled) {
      onChange({ ...currentConfig, [key]: value })
    }
  }

  const resetSection = (key: keyof PromptSectionsConfig) => {
    if (!disabled) {
      onChange({ ...currentConfig, [key]: defaultSections[key] })
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getValue = (key: keyof PromptSectionsConfig): string => {
    return currentConfig[key] || defaultSections[key] || ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 mb-4">
        <FileText className="w-5 h-5 mt-0.5" style={{ color: '#a855f7' }} />
        <div>
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('promptSections')}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('promptSectionsDesc')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map(({ key, label, desc }) => {
          const sectionKey = key as keyof PromptSectionsConfig
          const isExpanded = expandedSections[key]
          const value = getValue(sectionKey)
          const isModified = currentConfig[sectionKey] !== undefined && currentConfig[sectionKey] !== defaultSections[sectionKey]

          return (
            <div
              key={key}
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
            >
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {label}
                  </span>
                  {isModified && (
                    <span
                      className="px-1.5 py-0.5 text-[10px] rounded"
                      style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
                    >
                      {'Modified'}
                    </span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {value.length} {t('chars')}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {desc}
                  </p>
                  <textarea
                    value={value}
                    onChange={(e) => updateSection(sectionKey, e.target.value)}
                    disabled={disabled}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg resize-y font-mono text-xs"
                    style={{
                      background: 'var(--surface-secondary)',
                      border: '1px solid var(--surface-tertiary)',
                      color: 'var(--text-primary)',
                      minHeight: '120px',
                    }}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => resetSection(sectionKey)}
                      disabled={disabled || !isModified}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/5 disabled:opacity-30"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t('resetToDefault')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
