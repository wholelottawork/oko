import { useCallback, useMemo, useRef, useState } from 'react'
import { ArrowRightLeft, Bot, Loader2, Lock, Send, Shield, Sparkles } from 'lucide-react'
import { useAppKitAccount } from '@reown/appkit/react'
import { api } from '../lib/api'
import { apiUrl } from '../lib/config'
import { resolveWhitelistedNames, type WhitelistEntry } from '../lib/upgradeWhitelist'
import { UpgradeBridgeCard } from './UpgradeBridgeCard'
import { InlineSwapWidget } from './InlineSwapWidget'
import type { WalletChatSwapIntent } from '../lib/api'

interface UpgradeDeepThinkPanelProps {
  eligible: boolean
  language?: 'en' | 'zh'
  whitelistEntries: WhitelistEntry[]
  onOpenWhitelist: () => void
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  swapIntent?: WalletChatSwapIntent
}

export function UpgradeDeepThinkPanel({
  eligible,
  language = 'en',
  whitelistEntries,
  onOpenWhitelist,
}: UpgradeDeepThinkPanelProps) {
  const { address, isConnected } = useAppKitAccount()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [initialAnalysis, setInitialAnalysis] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [sending, setSending] = useState(false)
  const [analysisReady, setAnalysisReady] = useState(false)
  const [bridgeOpen, setBridgeOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const t = {
        title: 'Upgrade Assistant',
        subtitle: 'Deep Think mode',
        description: 'A gated assistant layer for high-context wallet tasks, route planning, and natural-language execution requests.',
        locked: 'Unlocks at 150,000 OKO',
        prepare: 'Prepare wallet context',
        preparing: 'Preparing wallet context…',
        placeholder: 'Ask OKO to bridge, swap, rebalance, or send to a whitelisted name…',
        send: 'Send',
        active: 'Active',
        bridge: 'Bridge tool',
        whitelist: 'Manage whitelist',
        bridgeHint: 'Build context in chat, then execute the route with the embedded bridge tool below.',
        ready: 'Wallet context is ready. Deep Think now uses your connected wallet plus approved name resolution.',
        whitelistEmpty: 'No whitelist entries yet. Names that are not approved will be sent as plain text.',
        disconnected: 'Connect a wallet to activate in-wallet Deep Think.',
      }

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  const prepareAnalysis = useCallback(async () => {
    if (!address || !eligible) return
    setPreparing(true)
    setMessages((prev) => [
      ...prev,
      { id: `sys-${Date.now()}`, role: 'system', content: t.preparing },
    ])
    try {
      const es = new EventSource(apiUrl(`/api/wallet/${encodeURIComponent(address)}/analyze?lang=${'en'}`))
      let accumulated = ''
      es.onmessage = (event) => {
        accumulated += (event.data || '') + '\n'
      }
      es.addEventListener('done', () => {
        es.close()
        setInitialAnalysis(accumulated)
        setAnalysisReady(true)
        setPreparing(false)
        setMessages((prev) => [
          ...prev,
          { id: `ready-${Date.now()}`, role: 'system', content: t.ready },
        ])
        scrollToBottom()
      })
      es.onerror = () => {
        es.close()
        setPreparing(false)
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'system', content: 'Failed to prepare wallet context.' },
        ])
        scrollToBottom()
      }
    } catch {
      setPreparing(false)
    }
  }, [address, eligible, language, scrollToBottom, t.preparing, t.ready])

  const sendMessage = useCallback(async () => {
    const raw = input.trim()
    if (!raw || !address || !eligible || !analysisReady || sending) return
    const resolved = resolveWhitelistedNames(raw, whitelistEntries)
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: raw }
    const nextHistory = [...messages, userMessage]
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({ role: msg.role, content: msg.content }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)
    scrollToBottom()

    try {
      const { reply, swapIntent } = await api.postWalletChat(
        address,
        {
          message: resolved,
          initialAnalysis,
          history: nextHistory,
          assistantMode: 'deep-think',
        },
        'en'
      )
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: reply, swapIntent: swapIntent ?? undefined },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'system', content: error instanceof Error ? error.message : 'Deep Think failed' },
      ])
    } finally {
      setSending(false)
      scrollToBottom()
    }
  }, [address, eligible, analysisReady, sending, input, whitelistEntries, messages, scrollToBottom, initialAnalysis, language])

  const disabledReason = useMemo(() => {
    if (!eligible) return t.locked
    if (!isConnected || !address) return t.disconnected
    if (!analysisReady) return t.prepare
    return ''
  }, [address, analysisReady, eligible, isConnected, t.disconnected, t.locked, t.prepare])

  return (
    <div
      className="rounded-3xl p-5 sm:p-6 space-y-4"
      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="w-full min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-tertiary)' }}>
              {t.subtitle}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            {t.title}
          </h3>
          <p className="text-sm mt-2 max-w-none sm:max-w-xl" style={{ color: 'var(--text-secondary)' }}>
            {t.description}
          </p>
        </div>
        <div
          className="self-start shrink-0 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
          style={{
            background: eligible ? 'rgba(14,203,129,0.12)' : 'rgba(255,255,255,0.04)',
            color: eligible ? '#0ECB81' : 'var(--text-tertiary)',
            border: `1px solid ${eligible ? 'rgba(14,203,129,0.25)' : 'var(--panel-border)'}`,
          }}
        >
          {eligible ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {eligible ? t.active : t.locked}
        </div>
      </div>

      {isConnected && !analysisReady ? (
        <button
          onClick={prepareAnalysis}
          className="rounded-2xl px-4 py-3 text-sm font-semibold inline-flex items-center gap-2"
          style={{
            background: eligible ? 'var(--accent-primary)' : 'var(--surface-tertiary)',
            color: eligible ? '#fff' : 'var(--text-tertiary)',
          }}
          disabled={!eligible || preparing}
        >
          {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {preparing ? t.preparing : t.prepare}
        </button>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setBridgeOpen((value) => !value)}
          disabled={!eligible}
          className="rounded-full px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 transition-opacity"
          style={{
            background: eligible ? 'rgba(51,153,140,0.12)' : 'var(--surface-tertiary)',
            color: eligible ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            border: '1px solid var(--panel-border)',
          }}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          {t.bridge}
        </button>
        <button
          onClick={onOpenWhitelist}
          disabled={!eligible}
          className="rounded-full px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 transition-opacity"
          style={{
            background: eligible ? 'rgba(51,153,140,0.12)' : 'var(--surface-tertiary)',
            color: eligible ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            border: '1px solid var(--panel-border)',
          }}
        >
          <Shield className="w-3.5 h-3.5" />
          {t.whitelist}
        </button>
      </div>

      <div
        className="rounded-2xl p-4 h-[280px] overflow-y-auto space-y-3"
        style={{ background: 'var(--surface-primary)', border: '1px solid var(--panel-border)' }}
        ref={scrollRef}
      >
        {messages.length === 0 ? (
          <div className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            {disabledReason}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[90%]'
              }`}
              style={{
                background:
                  message.role === 'user'
                    ? 'var(--accent-primary-bg)'
                    : message.role === 'assistant'
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.02)',
                border: '1px solid var(--panel-border)',
                color:
                  message.role === 'system'
                    ? 'var(--text-tertiary)'
                    : 'var(--text-primary)',
              }}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {eligible && message.swapIntent && (
                <InlineSwapWidget intent={message.swapIntent} language={language} />
              )}
            </div>
          ))
        )}
      </div>

      <div
        className="rounded-2xl p-3 text-xs flex items-start gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', color: 'var(--text-tertiary)' }}
      >
        <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {whitelistEntries.length > 0
            ? `${whitelistEntries.length} whitelist entr${whitelistEntries.length === 1 ? 'y' : 'ies'} active. ${t.bridgeHint}`
            : t.whitelistEmpty}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage()
          }}
          placeholder={t.placeholder}
          className="upgrade-input flex-1"
          disabled={!eligible || !analysisReady || sending}
        />
        <button
          onClick={sendMessage}
          disabled={!eligible || !analysisReady || !input.trim() || sending}
          className="rounded-2xl px-4 py-3 text-sm font-semibold inline-flex items-center gap-2"
          style={{
            background: !eligible || !analysisReady || !input.trim() ? 'var(--surface-tertiary)' : 'var(--accent-primary)',
            color: !eligible || !analysisReady || !input.trim() ? 'var(--text-tertiary)' : '#fff',
          }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t.send}
        </button>
      </div>

      {bridgeOpen ? (
        <div className="pt-2">
          <UpgradeBridgeCard eligible={eligible} language={language} />
        </div>
      ) : null}
    </div>
  )
}
