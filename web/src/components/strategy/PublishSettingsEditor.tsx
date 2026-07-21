import { Globe, Lock, Eye, EyeOff } from 'lucide-react'

interface PublishSettingsEditorProps {
  isPublic: boolean
  configVisible: boolean
  onIsPublicChange: (value: boolean) => void
  onConfigVisibleChange: (value: boolean) => void
  disabled?: boolean
  language: string
}

export function PublishSettingsEditor({
  isPublic,
  configVisible,
  onIsPublicChange,
  onConfigVisibleChange,
  disabled = false,
  language: _language,
}: PublishSettingsEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      publishToMarket: 'Publish to Market',
      publishDesc: 'Strategy will be publicly visible in the marketplace',
      showConfig: 'Show Config',
      showConfigDesc: 'Allow others to view and clone config details',
      private: 'PRIVATE',
      public: 'PUBLIC',
      hidden: 'HIDDEN',
      visible: 'VISIBLE',
    }
    return translations[key] || key
  }

  return (
    <div className="space-y-3">
      {/* Marketplace visibility setting */}
      <div
        className={`relative overflow-hidden rounded-lg transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          background: isPublic
            ? 'linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.05) 100%)'
            : 'linear-gradient(135deg, var(--surface-secondary) 0%, var(--surface-primary) 100%)',
          border: isPublic ? '1px solid rgba(14, 203, 129, 0.4)' : '1px solid var(--surface-tertiary)',
          boxShadow: isPublic ? '0 0 20px var(--binance-green-bg)' : 'none',
        }}
        onClick={() => !disabled && onIsPublicChange(!isPublic)}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 w-full h-[1px] transition-opacity duration-300"
          style={{
            background: isPublic
              ? 'linear-gradient(90deg, transparent, var(--binance-green), transparent)'
              : 'linear-gradient(90deg, transparent, var(--surface-tertiary), transparent)',
            opacity: isPublic ? 1 : 0.5
          }}
        />

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-lg transition-all duration-300"
              style={{
                background: isPublic ? 'rgba(14, 203, 129, 0.2)' : 'var(--surface-primary)',
                border: isPublic ? '1px solid rgba(14, 203, 129, 0.3)' : '1px solid var(--surface-tertiary)'
              }}
            >
              {isPublic ? (
                <Globe className="w-5 h-5" style={{ color: 'var(--binance-green)' }} />
              ) : (
                <Lock className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('publishToMarket')}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {t('publishDesc')}
              </div>
            </div>
          </div>

          {/* Toggle with status */}
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] font-mono font-bold tracking-wider"
              style={{ color: isPublic ? 'var(--binance-green)' : 'var(--text-secondary)' }}
            >
              {isPublic ? t('public') : t('private')}
            </span>
            <div
              className="relative w-12 h-6 rounded-full transition-all duration-300"
              style={{
                background: isPublic
                  ? 'linear-gradient(90deg, var(--binance-green), #4ade80)'
                  : 'var(--surface-tertiary)',
                boxShadow: isPublic ? '0 0 10px rgba(14, 203, 129, 0.4)' : 'none'
              }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full transition-all duration-300"
                style={{
                  background: 'var(--text-primary)',
                  left: isPublic ? '28px' : '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Configuration visibility setting, shown for public strategies */}
      {isPublic && (
        <div
          className={`relative overflow-hidden rounded-lg transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            background: configVisible
              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)'
              : 'linear-gradient(135deg, var(--surface-secondary) 0%, var(--surface-primary) 100%)',
            border: configVisible ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--surface-tertiary)',
            boxShadow: configVisible ? '0 0 20px rgba(168, 85, 247, 0.1)' : 'none',
          }}
          onClick={() => !disabled && onConfigVisibleChange(!configVisible)}
        >
          {/* Top glow line */}
          <div
            className="absolute top-0 left-0 w-full h-[1px] transition-opacity duration-300"
            style={{
              background: configVisible
                ? 'linear-gradient(90deg, transparent, #a855f7, transparent)'
                : 'linear-gradient(90deg, transparent, var(--surface-tertiary), transparent)',
              opacity: configVisible ? 1 : 0.5
            }}
          />

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg transition-all duration-300"
                style={{
                  background: configVisible ? 'rgba(168, 85, 247, 0.2)' : 'var(--surface-primary)',
                  border: configVisible ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid var(--surface-tertiary)'
                }}
              >
                {configVisible ? (
                  <Eye className="w-5 h-5" style={{ color: '#a855f7' }} />
                ) : (
                  <EyeOff className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('showConfig')}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {t('showConfigDesc')}
                </div>
              </div>
            </div>

            {/* Toggle with status */}
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] font-mono font-bold tracking-wider"
                style={{ color: configVisible ? '#a855f7' : 'var(--text-secondary)' }}
              >
                {configVisible ? t('visible') : t('hidden')}
              </span>
              <div
                className="relative w-12 h-6 rounded-full transition-all duration-300"
                style={{
                  background: configVisible
                    ? 'linear-gradient(90deg, #a855f7, #c084fc)'
                    : 'var(--surface-tertiary)',
                  boxShadow: configVisible ? '0 0 10px rgba(168, 85, 247, 0.4)' : 'none'
                }}
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full transition-all duration-300"
                  style={{
                    background: 'var(--text-primary)',
                    left: configVisible ? '28px' : '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PublishSettingsEditor
