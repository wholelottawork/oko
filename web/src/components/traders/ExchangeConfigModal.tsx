import React, { useState, useEffect } from 'react'
import type { Exchange } from '../../types'
import { t, type Language } from '../../i18n/translations'
import { api } from '../../lib/api'
import { getExchangeIcon } from '../ExchangeIcons'
import {
  TwoStageKeyModal,
  type TwoStageKeyModalResult,
} from '../TwoStageKeyModal'
import {
  BookOpen, Trash2, HelpCircle, ExternalLink, UserPlus,
  X, ChevronLeft, Check, Copy, ArrowRight, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from './Tooltip'
import { getShortName } from './utils'

const SUPPORTED_EXCHANGE_TEMPLATES = [
  { exchange_type: 'binance', name: 'Binance Futures', type: 'cex' as const },
  { exchange_type: 'bybit', name: 'Bybit Futures', type: 'cex' as const },
  { exchange_type: 'okx', name: 'OKX Futures', type: 'cex' as const },
  { exchange_type: 'bitget', name: 'Bitget Futures', type: 'cex' as const },
  { exchange_type: 'gate', name: 'Gate.io Futures', type: 'cex' as const },
  { exchange_type: 'kucoin', name: 'KuCoin Futures', type: 'cex' as const },
  { exchange_type: 'hyperliquid', name: 'Hyperliquid', type: 'dex' as const },
  { exchange_type: 'aster', name: 'Aster DEX', type: 'dex' as const },
  { exchange_type: 'lighter', name: 'Lighter', type: 'dex' as const },
]

interface ExchangeConfigModalProps {
  allExchanges: Exchange[]
  editingExchangeId: string | null
  onSave: (
    exchangeId: string | null,
    exchangeType: string,
    accountName: string,
    apiKey?: string,
    secretKey?: string,
    passphrase?: string,
    testnet?: boolean,
    hyperliquidWalletAddr?: string,
    asterUser?: string,
    asterSigner?: string,
    asterPrivateKey?: string,
    lighterWalletAddr?: string,
    lighterPrivateKey?: string,
    lighterApiKeyPrivateKey?: string,
    lighterApiKeyIndex?: number
  ) => Promise<void>
  onDelete: (exchangeId: string) => Promise<void>
  onClose: () => void
  language: Language
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background: i === current ? 'var(--accent-primary)' : i < current ? 'var(--accent-primary)' : 'var(--surface-tertiary)',
            opacity: i <= current ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1'
const inputStyle: React.CSSProperties = {
  background: 'var(--surface-primary)',
  border: '1px solid var(--surface-tertiary)',
  color: 'var(--text-primary)',
}
const inputFocusRing = 'focus:ring-[var(--accent-primary)]'

export function ExchangeConfigModal({
  allExchanges,
  editingExchangeId,
  onSave,
  onDelete,
  onClose,
  language,
}: ExchangeConfigModalProps) {
  const [currentStep, setCurrentStep] = useState(editingExchangeId ? 1 : 0)
  const [selectedExchangeType, setSelectedExchangeType] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [testnet, setTestnet] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [serverIP, setServerIP] = useState<{ public_ip: string; message: string } | null>(null)
  const [loadingIP, setLoadingIP] = useState(false)
  const [copiedIP, setCopiedIP] = useState(false)
  const [showBinanceGuide, setShowBinanceGuide] = useState(false)

  const [asterUser, setAsterUser] = useState('')
  const [asterSigner, setAsterSigner] = useState('')
  const [asterPrivateKey, setAsterPrivateKey] = useState('')
  const [hyperliquidWalletAddr, setHyperliquidWalletAddr] = useState('')
  const [lighterWalletAddr, setLighterWalletAddr] = useState('')
  const [lighterApiKeyPrivateKey, setLighterApiKeyPrivateKey] = useState('')
  const [lighterApiKeyIndex, setLighterApiKeyIndex] = useState(0)

  const [secureInputTarget, setSecureInputTarget] = useState<null | 'hyperliquid' | 'aster' | 'lighter'>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [accountName, setAccountName] = useState('')

  const selectedExchange = editingExchangeId
    ? allExchanges?.find((e) => e.id === editingExchangeId)
    : null

  const selectedTemplate = editingExchangeId
    ? SUPPORTED_EXCHANGE_TEMPLATES.find((t) => t.exchange_type === selectedExchange?.exchange_type)
    : SUPPORTED_EXCHANGE_TEMPLATES.find((t) => t.exchange_type === selectedExchangeType)

  const currentExchangeType = editingExchangeId
    ? selectedExchange?.exchange_type
    : selectedExchangeType

  const exchangeRegistrationLinks: Record<string, { url: string; hasReferral?: boolean }> = {
    binance: { url: 'https://www.binance.com/join?ref=', hasReferral: true },
    okx: { url: 'https://www.okx.com/join?ref=', hasReferral: true },
    bybit: { url: 'https://partner.bybit.com/b/?ref=', hasReferral: true },
    bitget: { url: 'https://www.bitget.com/referral/register?from=referral&clacCode=', hasReferral: true },
    gate: { url: 'https://www.gatenode.xyz/share/?ref=', hasReferral: true },
    kucoin: { url: 'https://www.kucoin.com/r/broker/?ref=', hasReferral: true },
    hyperliquid: { url: 'https://app.hyperliquid.xyz/join?ref=', hasReferral: true },
    aster: { url: 'https://www.asterdex.com/en/referral?ref=', hasReferral: true },
    lighter: { url: 'https://app.lighter.xyz/?referral=', hasReferral: true },
  }

  useEffect(() => {
    if (editingExchangeId && selectedExchange) {
      setAccountName(selectedExchange.account_name || '')
      setApiKey('')
      setSecretKey('')
      setPassphrase('')
      setTestnet(selectedExchange.testnet || false)
      setAsterUser(selectedExchange.asterUser || '')
      setAsterSigner(selectedExchange.asterSigner || '')
      setAsterPrivateKey('')
      setHyperliquidWalletAddr(selectedExchange.hyperliquidWalletAddr || '')
      setLighterWalletAddr(selectedExchange.lighterWalletAddr || '')
      setLighterApiKeyPrivateKey('')
      setLighterApiKeyIndex(selectedExchange.lighterApiKeyIndex || 0)
    }
  }, [editingExchangeId, selectedExchange])

  useEffect(() => {
    if (currentExchangeType === 'binance' && !serverIP) {
      setLoadingIP(true)
      api.getServerIP()
        .then((data) => setServerIP(data))
        .catch((err) => console.error('Failed to load server IP:', err))
        .finally(() => setLoadingIP(false))
    }
  }, [currentExchangeType, serverIP])

  const handleCopyIP = async (ip: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ip)
        setCopiedIP(true)
        setTimeout(() => setCopiedIP(false), 2000)
        toast.success(t('ipCopied', language))
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = ip
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopiedIP(true)
        setTimeout(() => setCopiedIP(false), 2000)
        toast.success(t('ipCopied', language))
      }
    } catch {
      toast.error(t('copyIPFailed', language) || `Copy failed: ${ip}`)
    }
  }

  const secureInputContextLabel =
    secureInputTarget === 'aster' ? t('asterExchangeName', language)
      : secureInputTarget === 'hyperliquid' ? t('hyperliquidExchangeName', language)
        : undefined

  const handleSecureInputComplete = ({ value }: TwoStageKeyModalResult) => {
    const trimmed = value.trim()
    if (secureInputTarget === 'hyperliquid') setApiKey(trimmed)
    if (secureInputTarget === 'aster') setAsterPrivateKey(trimmed)
    if (secureInputTarget === 'lighter') {
      setLighterApiKeyPrivateKey(trimmed)
      toast.success(t('lighterApiKeyImported', language))
    }
    setSecureInputTarget(null)
  }

  const maskSecret = (secret: string) => {
    if (!secret || secret.length === 0) return ''
    if (secret.length <= 8) return '*'.repeat(secret.length)
    return secret.slice(0, 4) + '*'.repeat(Math.max(secret.length - 8, 4)) + secret.slice(-4)
  }

  const handleSelectExchange = (exchangeType: string) => {
    setSelectedExchangeType(exchangeType)
    setCurrentStep(1)
  }

  const handleBack = () => {
    if (editingExchangeId) {
      onClose()
    } else {
      setCurrentStep(0)
      setSelectedExchangeType('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    if (!editingExchangeId && !selectedExchangeType) return

    const trimmedAccountName = accountName.trim()
    if (!trimmedAccountName) {
      toast.error('Please enter account name')
      return
    }

    const exchangeId = editingExchangeId || null
    const exchangeType = currentExchangeType || ''

    setIsSaving(true)
    try {
      if (currentExchangeType === 'binance' || currentExchangeType === 'bybit') {
        if (!editingExchangeId && (!apiKey.trim() || !secretKey.trim())) return
        await onSave(exchangeId, exchangeType, trimmedAccountName, apiKey.trim() || undefined, secretKey.trim() || undefined, undefined, testnet)
      } else if (currentExchangeType === 'okx' || currentExchangeType === 'bitget' || currentExchangeType === 'kucoin') {
        if (!editingExchangeId && (!apiKey.trim() || !secretKey.trim() || !passphrase.trim())) return
        await onSave(exchangeId, exchangeType, trimmedAccountName, apiKey.trim() || undefined, secretKey.trim() || undefined, passphrase.trim() || undefined, testnet)
      } else if (currentExchangeType === 'hyperliquid') {
        if ((!editingExchangeId && !apiKey.trim()) || !hyperliquidWalletAddr.trim()) return
        await onSave(exchangeId, exchangeType, trimmedAccountName, apiKey.trim() || undefined, undefined, undefined, testnet, hyperliquidWalletAddr.trim())
      } else if (currentExchangeType === 'aster') {
        if (!asterUser.trim() || !asterSigner.trim() || (!editingExchangeId && !asterPrivateKey.trim())) return
        await onSave(exchangeId, exchangeType, trimmedAccountName, undefined, undefined, undefined, testnet, undefined, asterUser.trim(), asterSigner.trim(), asterPrivateKey.trim() || undefined)
      } else if (currentExchangeType === 'lighter') {
        if (!lighterWalletAddr.trim() || (!editingExchangeId && !lighterApiKeyPrivateKey.trim())) return
        await onSave(exchangeId, exchangeType, trimmedAccountName, undefined, undefined, undefined, testnet, undefined, undefined, undefined, undefined, lighterWalletAddr.trim(), undefined, lighterApiKeyPrivateKey.trim() || undefined, lighterApiKeyIndex)
      } else {
        if (!editingExchangeId && (!apiKey.trim() || !secretKey.trim())) return
        await onSave(exchangeId, exchangeType, trimmedAccountName, apiKey.trim() || undefined, secretKey.trim() || undefined, undefined, testnet)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingExchangeId || isSaving) return
    setIsSaving(true)
    try {
      await onDelete(editingExchangeId)
    } finally {
      setIsSaving(false)
    }
  }

  const cexExchanges = SUPPORTED_EXCHANGE_TEMPLATES.filter(t => t.type === 'cex')
  const dexExchanges = SUPPORTED_EXCHANGE_TEMPLATES.filter(t => t.type === 'dex')
  const isCex = currentExchangeType === 'binance' || currentExchangeType === 'bybit' || currentExchangeType === 'okx' || currentExchangeType === 'bitget' || currentExchangeType === 'gate' || currentExchangeType === 'kucoin'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-xl w-full max-w-lg relative shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface-secondary)', maxHeight: 'calc(100vh - 4rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--surface-tertiary)' }}
        >
          <div className="flex items-center gap-2.5">
            {currentStep > 0 && !editingExchangeId && (
              <button
                type="button"
                onClick={handleBack}
                className="p-1 rounded-md transition-colors hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {editingExchangeId ? t('editExchange', language) : t('addExchange', language)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!editingExchangeId && <StepDots current={currentStep} total={2} />}
            {editingExchangeId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                title={'Delete'}
              >
                <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 px-5 py-2" style={{ background: 'rgba(34, 197, 94, 0.05)', borderBottom: '1px solid var(--surface-tertiary)' }}>
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {'Credentials are encrypted at rest and never stored in plaintext'}
          </span>
        </div>

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
          {/* Step 0: Select Exchange */}
          {currentStep === 0 && !editingExchangeId && (
            <div className="space-y-4">
              {/* CEX */}
              <div>
                <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {'Centralized'}
                </div>
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--surface-tertiary)' }}
                >
                  {cexExchanges.map((template, i) => (
                    <button
                      key={template.exchange_type}
                      type="button"
                      onClick={() => handleSelectExchange(template.exchange_type)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/5"
                      style={{
                        background: 'var(--surface-primary)',
                        borderTop: i > 0 ? '1px solid var(--surface-tertiary)' : undefined,
                      }}
                    >
                      {getExchangeIcon(template.exchange_type, { width: 28, height: 28 })}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {getShortName(template.name)}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {template.name}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* DEX */}
              <div>
                <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {'Decentralized'}
                </div>
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--surface-tertiary)' }}
                >
                  {dexExchanges.map((template, i) => (
                    <button
                      key={template.exchange_type}
                      type="button"
                      onClick={() => handleSelectExchange(template.exchange_type)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/5"
                      style={{
                        background: 'var(--surface-primary)',
                        borderTop: i > 0 ? '1px solid var(--surface-tertiary)' : undefined,
                      }}
                    >
                      {getExchangeIcon(template.exchange_type, { width: 28, height: 28 })}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {getShortName(template.name)}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {template.name}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Configure */}
          {(currentStep === 1 || editingExchangeId) && selectedTemplate && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected Exchange Pill */}
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
              >
                <div className="flex items-center gap-3">
                  {getExchangeIcon(selectedTemplate.exchange_type, { width: 32, height: 32 })}
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {getShortName(selectedTemplate.name)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {selectedTemplate.type.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentExchangeType === 'binance' && (
                    <button
                      type="button"
                      onClick={() => setShowGuide(true)}
                      className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                      title={t('viewGuide', language)}
                    >
                      <BookOpen className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  )}
                  <a
                    href={exchangeRegistrationLinks[currentExchangeType || '']?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors hover:brightness-110"
                    style={{ background: 'var(--accent-primary)', color: '#000' }}
                  >
                    <UserPlus className="w-3 h-3" />
                    {'Register'}
                  </a>
                </div>
              </div>

              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {'Account Name'}
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={'e.g., Main Account'}
                  className={`${inputClass} ${inputFocusRing}`}
                  style={inputStyle}
                  required
                />
              </div>

              {/* CEX Fields */}
              {isCex && (
                <div className="space-y-4">
                  {currentExchangeType === 'binance' && (
                    <div
                      className="p-3 rounded-lg cursor-pointer transition-colors"
                      style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.15)' }}
                      onClick={() => setShowBinanceGuide(!showBinanceGuide)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {'Use "Spot & Futures Trading" API'}
                        </span>
                        <ChevronLeft
                          className="w-3.5 h-3.5 transition-transform"
                          style={{
                            color: 'var(--text-secondary)',
                            transform: showBinanceGuide ? 'rotate(-90deg)' : 'rotate(0deg)',
                          }}
                        />
                      </div>
                      {showBinanceGuide && (
                        <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid rgba(234, 179, 8, 0.15)', color: 'var(--text-secondary)' }}>
                          <a
                            href={'https://www.binance.com/en/support/faq/detail/360002502072'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                            style={{ color: 'var(--accent-primary)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {'View Tutorial'} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('apiKey', language)}
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={editingExchangeId ? 'Leave blank to keep the current API key' : t('enterAPIKey', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required={!editingExchangeId}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('secretKey', language)}
                    </label>
                    <input
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder={editingExchangeId ? 'Leave blank to keep the current secret key' : t('enterSecretKey', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required={!editingExchangeId}
                    />
                  </div>

                  {(currentExchangeType === 'okx' || currentExchangeType === 'bitget' || currentExchangeType === 'kucoin') && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {t('passphrase', language)}
                      </label>
                      <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder={editingExchangeId ? 'Leave blank to keep the current passphrase' : t('enterPassphrase', language)}
                        className={`${inputClass} ${inputFocusRing}`}
                        style={inputStyle}
                        required={!editingExchangeId}
                      />
                    </div>
                  )}

                  {currentExchangeType === 'binance' && (
                    <div
                      className="p-3 rounded-lg"
                      style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
                    >
                      <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        {t('whitelistIP', language)}
                      </div>
                      <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {t('whitelistIPDesc', language)}
                      </div>
                      {loadingIP ? (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {t('loadingServerIP', language)}
                        </div>
                      ) : serverIP?.public_ip ? (
                        <div className="flex items-center gap-2">
                          <code
                            className="flex-1 text-xs font-mono px-2.5 py-1.5 rounded"
                            style={{ background: 'var(--surface-secondary)', color: 'var(--accent-primary)' }}
                          >
                            {serverIP.public_ip}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyIP(serverIP.public_ip)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors hover:bg-white/10"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {copiedIP ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedIP ? t('ipCopied', language) : t('copyIP', language)}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Aster Fields */}
              {currentExchangeType === 'aster' && (
                <div className="space-y-4">
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                  >
                    <div className="font-medium mb-0.5" style={{ color: '#A78BFA' }}>{t('asterApiProTitle', language)}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{t('asterApiProDesc', language)}</div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('asterUserLabel', language)}
                      <Tooltip content={t('asterUserDesc', language)}>
                        <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-secondary)' }} />
                      </Tooltip>
                    </label>
                    <input type="text" value={asterUser} onChange={(e) => setAsterUser(e.target.value)} placeholder={t('enterAsterUser', language)} className={`${inputClass} ${inputFocusRing}`} style={inputStyle} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('asterSignerLabel', language)}
                      <Tooltip content={t('asterSignerDesc', language)}>
                        <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-secondary)' }} />
                      </Tooltip>
                    </label>
                    <input type="text" value={asterSigner} onChange={(e) => setAsterSigner(e.target.value)} placeholder={t('enterAsterSigner', language)} className={`${inputClass} ${inputFocusRing}`} style={inputStyle} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('asterPrivateKeyLabel', language)}
                      <Tooltip content={t('asterPrivateKeyDesc', language)}>
                        <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-secondary)' }} />
                      </Tooltip>
                    </label>
                    <input type="password" value={asterPrivateKey} onChange={(e) => setAsterPrivateKey(e.target.value)} placeholder={editingExchangeId ? 'Leave blank to keep the current private key' : t('enterAsterPrivateKey', language)} className={`${inputClass} ${inputFocusRing}`} style={inputStyle} required={!editingExchangeId} />
                  </div>
                </div>
              )}

              {/* Hyperliquid Fields */}
              {currentExchangeType === 'hyperliquid' && (
                <div className="space-y-4">
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{ background: 'rgba(127, 231, 204, 0.06)', border: '1px solid rgba(127, 231, 204, 0.15)' }}
                  >
                    <div className="font-medium mb-0.5" style={{ color: '#7FE7CC' }}>{t('hyperliquidAgentWalletTitle', language)}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{t('hyperliquidAgentWalletDesc', language)}</div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('hyperliquidAgentPrivateKey', language)}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={maskSecret(apiKey)}
                        readOnly
                        placeholder={editingExchangeId ? 'Leave blank to keep the current private key' : t('enterHyperliquidAgentPrivateKey', language)}
                        className={`flex-1 ${inputClass}`}
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setSecureInputTarget('hyperliquid')}
                        className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors hover:brightness-110"
                        style={{ background: '#7FE7CC', color: '#000' }}
                      >
                        {apiKey || (editingExchangeId && selectedExchange?.apiKey) ? t('secureInputReenter', language) : t('secureInputButton', language)}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('hyperliquidMainWalletAddress', language)}
                    </label>
                    <input type="text" value={hyperliquidWalletAddr} onChange={(e) => setHyperliquidWalletAddr(e.target.value)} placeholder={t('enterHyperliquidMainWalletAddress', language)} className={`${inputClass} ${inputFocusRing}`} style={inputStyle} required />
                  </div>
                </div>
              )}

              {/* Lighter Fields */}
              {currentExchangeType === 'lighter' && (
                <div className="space-y-4">
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}
                  >
                    <div className="font-medium mb-0.5" style={{ color: 'var(--accent-primary)' }}>
                      {'Lighter API Key Setup'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {'Generate an API Key on Lighter website'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('lighterWalletAddress', language)}
                    </label>
                    <input type="text" value={lighterWalletAddr} onChange={(e) => setLighterWalletAddr(e.target.value)} placeholder={t('enterLighterWalletAddress', language)} className={`${inputClass} ${inputFocusRing}`} style={inputStyle} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('lighterApiKeyPrivateKey', language)}
                      <button type="button" onClick={() => setSecureInputTarget('lighter')} className="text-xs underline" style={{ color: 'var(--accent-primary)' }}>
                        {t('secureInputButton', language)}
                      </button>
                    </label>
                    <input type="password" value={lighterApiKeyPrivateKey} onChange={(e) => setLighterApiKeyPrivateKey(e.target.value)} placeholder={editingExchangeId ? 'Leave blank to keep the current private key' : t('enterLighterApiKeyPrivateKey', language)} className={`${inputClass} ${inputFocusRing} font-mono`} style={inputStyle} required={!editingExchangeId} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {'API Key Index'}
                      <Tooltip content={'API Key index starts from 0'}>
                        <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-secondary)' }} />
                      </Tooltip>
                    </label>
                    <input type="number" min={0} max={255} value={lighterApiKeyIndex} onChange={(e) => setLighterApiKeyIndex(parseInt(e.target.value) || 0)} className={`${inputClass} ${inputFocusRing}`} style={inputStyle} />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                className="flex gap-2.5 pt-3"
                style={{ borderTop: '1px solid var(--surface-tertiary)' }}
              >
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                  style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {editingExchangeId ? t('cancel', language) : ('Back')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !accountName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                  style={{ background: 'var(--accent-primary)', color: '#000' }}
                >
                  {isSaving ? (t('saving', language) || 'Saving...') : (
                    <>{t('saveConfig', language)} <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Binance Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setShowGuide(false)}>
          <div className="rounded-xl p-5 w-full max-w-4xl max-h-[90vh] flex flex-col" style={{ background: 'var(--surface-secondary)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BookOpen className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                {t('binanceSetupGuide', language)}
              </h3>
              <button onClick={() => setShowGuide(false)} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-5">
              {/* Section 1: App config */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {t('binanceGuideSection1', language)}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('binanceGuideSection1Steps', language)}
                </p>
              </div>
              {/* Section 2: Web API */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {t('binanceGuideSection2', language)}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('binanceGuideSection2Steps', language)}
                </p>
              </div>
              {/* Section 3: IP lookup */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {t('binanceGuideSection3', language)}
                </h4>
                <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>• {t('binanceGuideSection3Windows', language)}</li>
                  <li>• {t('binanceGuideSection3Mac', language)}</li>
                </ul>
              </div>
              {/* Important notes */}
              <div className="p-4 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('binanceGuideNote1', language)} {t('binanceGuideNote2', language)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secure Input Modal */}
      <TwoStageKeyModal
        isOpen={secureInputTarget !== null}
        language={language}
        contextLabel={secureInputContextLabel}
        expectedLength={64}
        onCancel={() => setSecureInputTarget(null)}
        onComplete={handleSecureInputComplete}
      />
    </div>
  )
}
