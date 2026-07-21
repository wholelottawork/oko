import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t, type Language } from '../i18n/translations'
import { toast } from 'sonner'
import { X, Lock } from 'lucide-react'

const DEFAULT_LENGTH = 64

function generateObfuscation(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

function validatePrivateKeyFormat(
  value: string,
  expectedLength: number
): boolean {
  const normalized = value.startsWith('0x') ? value.slice(2) : value
  if (normalized.length !== expectedLength) {
    return false
  }
  return /^[0-9a-fA-F]+$/.test(normalized)
}

export interface TwoStageKeyModalResult {
  value: string
  obfuscationLog: string[]
}

interface TwoStageKeyModalProps {
  isOpen: boolean
  language: Language
  onCancel: () => void
  onComplete: (result: TwoStageKeyModalResult) => void
  expectedLength?: number
  contextLabel?: string
}

export function TwoStageKeyModal({
  isOpen,
  language,
  onCancel,
  onComplete,
  expectedLength = DEFAULT_LENGTH,
  contextLabel,
}: TwoStageKeyModalProps) {
  const [stage, setStage] = useState<1 | 2>(1)
  const [part1, setPart1] = useState('')
  const [part2, setPart2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clipboardStatus, setClipboardStatus] = useState<
    'idle' | 'copied' | 'failed'
  >('idle')
  const [obfuscationLog, setObfuscationLog] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [manualObfuscationValue, setManualObfuscationValue] = useState<
    string | null
  >(null)

  const stage1Ref = useRef<HTMLInputElement>(null)
  const stage2Ref = useRef<HTMLInputElement>(null)

  // UX improvement: Use 58 + 6 split (most of the key + last 6 chars)
  // Advantage: Second stage only requires entering 6 characters, much easier to count
  const expectedPart1Length = expectedLength - 6  // 64 - 6 = 58
  const expectedPart2Length = 6  // Last 6 characters

  useEffect(() => {
    if (isOpen && stage === 1 && stage1Ref.current) {
      stage1Ref.current.focus()
    } else if (isOpen && stage === 2 && stage2Ref.current) {
      stage2Ref.current.focus()
    }
  }, [isOpen, stage])

  const handleStage1Next = async () => {
    // ✅ Normalize input (remove possible 0x prefix) before validating length
    const normalized1 = part1.startsWith('0x') ? part1.slice(2) : part1
    if (normalized1.length < expectedPart1Length) {
      setError(
        t('errors.privatekeyIncomplete', language, {
          expected: expectedPart1Length,
        })
      )
      return
    }

    setError(null)
    setProcessing(true)

    try {
      // 生成混淆字符串
      const obfuscation = generateObfuscation()
      setManualObfuscationValue(obfuscation)

      // 尝试复制到剪贴板
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(obfuscation)
          setClipboardStatus('copied')
          setObfuscationLog([
            ...obfuscationLog,
            `Stage 1: ${new Date().toISOString()} - Auto copied obfuscation`,
          ])
          toast.success('已复制混淆字符串到剪贴板')
        } catch {
          setClipboardStatus('failed')
          setObfuscationLog([
            ...obfuscationLog,
            `Stage 1: ${new Date().toISOString()} - Auto copy failed, manual required`,
          ])
          toast.error('复制失败，请手动复制混淆字符串')
        }
      } else {
        setClipboardStatus('failed')
        setObfuscationLog([
          ...obfuscationLog,
          `Stage 1: ${new Date().toISOString()} - Clipboard API not available`,
        ])
        toast('当前浏览器不支持自动复制，请手动复制')
      }

      setTimeout(() => {
        setStage(2)
        setProcessing(false)
      }, 2000)
    } catch (err) {
      setError(t('errors.privatekeyObfuscationFailed', language))
      setProcessing(false)
    }
  }

  const handleStage2Complete = () => {
    // ✅ Normalize input (remove possible 0x prefix) before validating length
    const normalized2 = part2.startsWith('0x') ? part2.slice(2) : part2
    if (normalized2.length < expectedPart2Length) {
      setError(
        t('errors.privatekeyIncomplete', language, {
          expected: expectedPart2Length,
        })
      )
      return
    }

    // ✅ Concatenate after removing 0x prefix from both parts
    const normalized1 = part1.startsWith('0x') ? part1.slice(2) : part1
    const fullKey = normalized1 + normalized2
    if (!validatePrivateKeyFormat(fullKey, expectedLength)) {
      setError(t('errors.privatekeyInvalidFormat', language))
      return
    }

    const finalLog = [
      ...obfuscationLog,
      `Stage 2: ${new Date().toISOString()} - Completed`,
    ]
    onComplete({
      value: fullKey,
      obfuscationLog: finalLog,
    })
  }

  const handleReset = () => {
    setStage(1)
    setPart1('')
    setPart2('')
    setError(null)
    setClipboardStatus('idle')
    setObfuscationLog([])
    setProcessing(false)
    setManualObfuscationValue(null)
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]'
  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-primary)',
    border: '1px solid var(--surface-tertiary)',
    color: 'var(--text-primary)',
  }

  const modalContent = useMemo(() => {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
        <div
          className="rounded-xl max-w-lg w-full overflow-hidden shadow-2xl"
          style={{ background: 'var(--surface-secondary)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--surface-tertiary)' }}
          >
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Lock className="w-4 h-4" /> {t('twoStageKey.title', language)}
              {contextLabel && (
                <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                  ({contextLabel})
                </span>
              )}
            </h2>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-5 space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {stage === 1
                ? t('twoStageKey.stage1Description', language, { length: expectedPart1Length })
                : t('twoStageKey.stage2Description', language, { length: expectedPart2Length })}
            </p>

            {/* Stage 1 */}
            {stage === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('twoStageKey.stage1InputLabel', language)} ({expectedPart1Length} {t('twoStageKey.characters', language)})
                  </label>
                  <input
                    ref={stage1Ref}
                    type="password"
                    value={part1}
                    onChange={(e) => setPart1(e.target.value)}
                    placeholder="0x1234..."
                    className={inputClass}
                    style={inputStyle}
                    maxLength={expectedPart1Length + 2}
                    disabled={processing}
                  />
                </div>

                {error && <div className="text-sm" style={{ color: '#ef4444' }}>{error}</div>}

                <div className="flex items-center gap-2.5 pt-2" style={{ borderTop: '1px solid var(--surface-tertiary)' }}>
                  <button
                    onClick={onCancel}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    {t('twoStageKey.cancelButton', language)}
                  </button>
                  <button
                    onClick={handleStage1Next}
                    disabled={
                      (part1.startsWith('0x') ? part1.slice(2) : part1).length < expectedPart1Length || processing
                    }
                    className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                    style={{ background: 'var(--accent-primary)', color: '#000' }}
                  >
                    {processing ? t('twoStageKey.processing', language) : t('twoStageKey.nextButton', language)}
                  </button>
                </div>
              </>
            )}

            {/* Transition Message */}
            {stage === 2 && clipboardStatus !== 'idle' && (
              <div
                className="p-3 rounded-lg"
                style={{ background: 'var(--accent-primary-bg)', border: '1px solid var(--accent-primary-border)' }}
              >
                {clipboardStatus === 'copied' && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {t('twoStageKey.obfuscationCopied', language)}
                    </div>
                    <div className="text-xs mt-1">
                      {t('twoStageKey.obfuscationInstruction', language)}
                    </div>
                  </div>
                )}
                {clipboardStatus === 'failed' && manualObfuscationValue && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {t('twoStageKey.obfuscationManual', language)}
                    </div>
                    <div
                      className="text-xs mt-2 p-2 rounded font-mono break-all"
                      style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
                    >
                      {manualObfuscationValue}
                    </div>
                    <div className="text-xs mt-1">
                      {t('twoStageKey.obfuscationInstruction', language)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 2 */}
            {stage === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('twoStageKey.stage2InputLabel', language)} ({expectedPart2Length} {t('twoStageKey.characters', language)})
                  </label>
                  <input
                    ref={stage2Ref}
                    type="password"
                    value={part2}
                    onChange={(e) => setPart2(e.target.value)}
                    placeholder="...5678"
                    className={inputClass}
                    style={inputStyle}
                    maxLength={expectedPart2Length + 2}
                  />
                </div>

                {error && <div className="text-sm" style={{ color: '#ef4444' }}>{error}</div>}

                <div className="flex items-center gap-2.5 pt-2" style={{ borderTop: '1px solid var(--surface-tertiary)' }}>
                  <button
                    onClick={handleReset}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    {t('twoStageKey.backButton', language)}
                  </button>
                  <button
                    onClick={handleStage2Complete}
                    disabled={(part2.startsWith('0x') ? part2.slice(2) : part2).length < expectedPart2Length}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                    style={{ background: 'var(--accent-primary)', color: '#000' }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {t('twoStageKey.encryptButton', language)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }, [
    isOpen,
    stage,
    part1,
    part2,
    error,
    processing,
    clipboardStatus,
    manualObfuscationValue,
    language,
    expectedPart1Length,
    expectedPart2Length,
    contextLabel,
    obfuscationLog,
    onCancel,
    onComplete,
  ])

  if (!isOpen) return null

  return createPortal(modalContent, document.body)
}
