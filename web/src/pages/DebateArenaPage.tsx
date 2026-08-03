import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { api } from '../lib/api'
import { notify } from '../lib/notify'
import { useLanguage } from '../contexts/LanguageContext'
import { PunkAvatar } from '../components/PunkAvatar'
import type {
  DebateSession,
  DebateSessionWithDetails,
  DebateMessage,
  CreateDebateRequest,
  AIModel,
  Strategy,
  DebatePersonality,
  TraderInfo,
} from '../types'
import {
  Plus,
  X,
  Trophy,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart2,
  RefreshCcw,
  Shield,
  Play,
  AlertTriangle,
} from 'lucide-react'
import { DeepVoidBackground } from '../components/DeepVoidBackground'
import { getAccessibleDebateModels } from '../lib/debateModels'

// Translations
const T: Record<string, string> = {
  newDebate: 'New Debate',
  debateSessions: 'Sessions',
  onlineTraders: 'Online Traders',
  offline: 'Offline',
  noTraders: 'No traders',
  start: 'Start',
  stop: 'Stop',
  delete: 'Delete',
  confirmDeleteRunning: 'This debate is still running. Delete it anyway?',
  discussionRecords: 'Discussion',
  finalVotes: 'Final Votes',
  consensus: 'Consensus',
  confidence: 'Confidence',
  leverage: 'Leverage',
  position: 'Position',
  execute: 'Execute',
  executed: 'Executed',
  selectOrCreate: 'Select or create a debate',
  clickToStart: 'Click "Start" to begin',
  waitingAI: 'Waiting for AI...',
  debateFailed: 'Debate failed - AI provider errors. Check Config → AI Models (API key & model name).',
  createDebate: 'Create Debate',
  debateName: 'Debate Name',
  tradingPair: 'Trading Pair',
  strategy: 'Strategy',
  rounds: 'Rounds',
  participants: 'Participants',
  addAI: 'Add AI',
  cancel: 'Cancel',
  create: 'Create',
  creating: 'Creating...',
  executeTitle: 'Execute Trade',
  selectTrader: 'Select Trader',
  executing: 'Executing...',
  fillNameAdd2AI: 'Please fill name and add at least 2 AI',
}
const t = (key: string) => T[key] || key

// Personality config - professional icons, clean (no colors)
const PERS: Record<DebatePersonality, { Icon: React.ComponentType<{ size?: string | number; className?: string }>; name: string; nameEn: string }> = {
  bull: { Icon: TrendingUp, name: '', nameEn: 'Bull' },
  bear: { Icon: TrendingDown, name: '', nameEn: 'Bear' },
  analyst: { Icon: BarChart2, name: '', nameEn: 'Analyst' },
  contrarian: { Icon: RefreshCcw, name: '', nameEn: 'Contrarian' },
  risk_manager: { Icon: Shield, name: '', nameEn: 'Risk Mgr' },
}

// Action config
const ACT: Record<string, { color: string; bg: string; icon: JSX.Element; label: string }> = {
  open_long: { color: 'text-green-400', bg: 'bg-green-500/20', icon: <TrendingUp size={14} />, label: 'LONG' },
  open_short: { color: 'text-red-400', bg: 'bg-red-500/20', icon: <TrendingDown size={14} />, label: 'SHORT' },
  hold: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <Minus size={14} />, label: 'HOLD' },
  wait: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: <Clock size={14} />, label: 'WAIT' },
  close_long: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <X size={14} />, label: 'CLOSE' },
  close_short: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <X size={14} />, label: 'CLOSE' },
}

// Status colors
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-500',
  running: 'bg-blue-500 animate-pulse',
  voting: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

// AI Provider Avatar
function AIAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const providers: Record<string, { bg: string; text: string; letter: string }> = {
    claude: { bg: 'bg-orange-500', text: 'text-white', letter: 'C' },
    deepseek: { bg: 'bg-blue-600', text: 'text-white', letter: 'D' },
    gemini: { bg: 'bg-blue-400', text: 'text-white', letter: 'G' },
    grok: { bg: 'bg-gray-700', text: 'text-white', letter: 'X' },
    kimi: { bg: 'bg-purple-500', text: 'text-white', letter: 'K' },
    qwen: { bg: 'bg-indigo-500', text: 'text-white', letter: 'Q' },
    openai: { bg: 'bg-emerald-600', text: 'text-white', letter: 'O' },
    gpt: { bg: 'bg-emerald-600', text: 'text-white', letter: 'O' },
  }
  const lower = name.toLowerCase()
  const p = Object.entries(providers).find(([k]) => lower.includes(k))?.[1]
    || { bg: 'bg-gray-600', text: 'text-white', letter: name[0]?.toUpperCase() || '?' }
  return (
    <div className={`${p.bg} ${p.text} rounded-md flex items-center justify-center font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {p.letter}
    </div>
  )
}

// Message Card - Full content display like AI Testing
function MessageCard({ msg }: { msg: DebateMessage }) {
  const [open, setOpen] = useState(false)
  const p = PERS[msg.personality] || PERS.analyst
  const a = ACT[msg.decision?.action || 'wait'] || ACT.wait

  // Parse content into sections
  const parseContent = (c: string) => {
    const reasoning = c.match(/<reasoning>([\s\S]*?)<\/reasoning>/i)?.[1]?.trim()
    const analysis = c.match(/<analysis>([\s\S]*?)<\/analysis>/i)?.[1]?.trim()
    const argument = c.match(/<argument>([\s\S]*?)<\/argument>/i)?.[1]?.trim()
    const decision = c.match(/<decision>([\s\S]*?)<\/decision>/i)?.[1]?.trim()

    // Clean content - remove XML tags
    const cleanContent = c.replace(/<\/?[^>]+(>|$)/g, '').trim()

    return {
      reasoning: reasoning || analysis || argument,
      decision,
      fullContent: cleanContent
    }
  }

  const parsed = parseContent(msg.content)
  const previewText = parsed.reasoning?.slice(0, 150) || parsed.fullContent.slice(0, 150)

  return (
    <div
      className="p-3 rounded-lg border-l border-[var(--panel-border)] hover:bg-[var(--surface-secondary)]/60 transition-all debate-message-card backdrop-blur-sm bg-[var(--surface-secondary)]/20"
    >
      {/* Header - Always visible */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <AIAvatar name={msg.ai_model_name} size={24} />
        <span className="text-sm text-[var(--text-primary)] font-medium">{msg.ai_model_name}</span>
        <span className="text-xs text-[var(--text-secondary)]">{p.nameEn}</span>
        <div className="flex-1" />
        {msg.decision && (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${a.bg} ${a.color}`}>
            {a.icon} {msg.decision.symbol || ''} {a.label}
          </span>
        )}
        <span className="text-xs debate-accent font-medium">{msg.decision?.confidence || msg.confidence}%</span>
        {open ? <ChevronUp size={14} className="text-[var(--text-secondary)]" /> : <ChevronDown size={14} className="text-[var(--text-secondary)]" />}
      </div>

      {/* Preview when collapsed */}
      {!open && (
        <div className="mt-2 text-xs text-gray-400 line-clamp-2">
          {previewText}...
        </div>
      )}

      {/* Expanded Content - Full display */}
      {open && (
        <div className="mt-3 space-y-3">
          {/* Reasoning/Analysis Section */}
          {parsed.reasoning && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-blue-400 font-medium mb-2">Reasoning</div>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto select-text">
                {parsed.reasoning}
              </div>
            </div>
          )}

          {/* Decision Section */}
          {msg.decision && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-green-400 font-medium mb-2">Decision</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {msg.decision.symbol && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Symbol</span>
                    <span className="text-white font-medium">{msg.decision.symbol}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Direction</span>
                  <span className={a.color}>{a.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Confidence</span>
                  <span className="text-blue-400">{msg.decision.confidence}%</span>
                </div>
                {(msg.decision.leverage ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Leverage</span>
                    <span className="text-white">{msg.decision.leverage}x</span>
                  </div>
                )}
                {(msg.decision.position_pct ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Position</span>
                    <span className="text-white">{((msg.decision.position_pct ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                )}
                {(msg.decision.stop_loss ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stop loss</span>
                    <span className="text-red-400">{((msg.decision.stop_loss ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                )}
                {(msg.decision.take_profit ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Take profit</span>
                    <span className="text-green-400">{((msg.decision.take_profit ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              {msg.decision.reasoning && (
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
                  {msg.decision.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Full Raw Content (collapsible) */}
          {!parsed.reasoning && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-gray-400 font-medium mb-2">Full Output</div>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto select-text">
                {parsed.fullContent}
              </div>
            </div>
          )}

          {/* Multi-coin decisions if available */}
          {msg.decisions && msg.decisions.length > 1 && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-purple-400 font-medium mb-2">Multi-asset decisions ({msg.decisions.length})</div>
              <div className="space-y-2">
                {msg.decisions.map((d, i) => {
                  const da = ACT[d.action] || ACT.wait
                  return (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded">
                      <span className="text-white font-medium">{d.symbol}</span>
                      <span className={da.color}>{da.icon} {da.label}</span>
                      <span className="text-blue-400">{d.confidence}%</span>
                      <span className="text-gray-400">{d.leverage || 0}x / {((d.position_pct || 0) * 100).toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Personality dropdown with professional icons
function PersonalitySelect({ value, onChange }: { value: DebatePersonality; onChange: (p: DebatePersonality) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [open])
  const p = PERS[value] || PERS.analyst
  const PersIcon = p.Icon
  return (
    <div ref={ref} className="relative w-1/2 min-w-[160px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm outline-none cursor-pointer hover:opacity-90 text-left"
      >
        <PersIcon size={12} className="text-[var(--text-secondary)] shrink-0" />
        {p.nameEn}
        <ChevronDown size={10} className="opacity-60 ml-auto shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-50 py-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--panel-border)] shadow-xl">
          {(Object.entries(PERS) as [DebatePersonality, typeof p][]).map(([k, v]) => {
            const Icon = v.Icon
            return (
              <button
                key={k}
                type="button"
                onClick={() => { onChange(k); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] ${k === value ? 'bg-[var(--surface-secondary)]/50' : ''}`}
              >
                <Icon size={12} className="text-[var(--text-secondary)]" />
                {v.nameEn}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Strategy dropdown - custom styled list matching model dropdown
function StrategySelect({ value, onChange, strategies, className }: { value: string; onChange: (id: string) => void; strategies: Strategy[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [open])
  const selected = strategies.find(s => s.id === value)
  return (
    <div ref={ref} className={`relative ${className || 'w-full'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm outline-none cursor-pointer hover:opacity-90 text-left"
      >
        <span className="truncate">{selected?.name || 'Select strategy...'}</span>
        <ChevronDown size={14} className="opacity-60 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-[100] py-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--panel-border)] shadow-xl debate-input max-h-60 overflow-y-auto">
          {strategies.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange(s.id); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] ${s.id === value ? 'bg-[var(--surface-secondary)]/50' : ''}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// AI Model dropdown - custom styled to match strategy dropdown list
function ModelSelect({ value, onChange, aiModels, className }: { value: string; onChange: (id: string) => void; aiModels: AIModel[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [open])
  const selected = aiModels.find(m => m.id === value)
  return (
    <div ref={ref} className={`relative ${className || 'w-1/2 min-w-[160px]'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm outline-none cursor-pointer hover:opacity-90 text-left"
      >
        <span className="truncate">{selected?.name || 'Select...'}</span>
        <ChevronDown size={14} className="opacity-60 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-[100] py-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--panel-border)] shadow-xl debate-input max-h-60 overflow-y-auto">
          {aiModels.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] ${m.id === value ? 'bg-[var(--surface-secondary)]/50' : ''}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Vote Card - Beautiful detailed version
function VoteCard({ vote }: { vote: { ai_model_name: string; action: string; symbol?: string; confidence: number; leverage?: number; position_pct?: number; stop_loss_pct?: number; take_profit_pct?: number; reasoning: string } }) {
  const a = ACT[vote.action] || ACT.wait
  const confColor = vote.confidence >= 70 ? 'bg-green-500' : vote.confidence >= 50 ? 'bg-blue-500' : 'bg-gray-500'
  return (
    <div className="bg-[var(--surface-secondary)]/40 backdrop-blur-md rounded-xl p-4 debate-vote-card transition-all shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AIAvatar name={vote.ai_model_name} size={28} />
          <div>
            <span className="text-[var(--text-primary)] font-semibold block">{vote.ai_model_name}</span>
            {vote.symbol && <span className="text-xs text-[var(--text-secondary)]">{vote.symbol}</span>}
          </div>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${a.bg} ${a.color}`}>
          {a.icon} {vote.action.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Confidence</span>
          <span className="text-white font-bold">{vote.confidence}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${confColor} rounded-full transition-all`} style={{ width: `${vote.confidence}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Leverage</span><span className="text-[var(--text-primary)] font-semibold">{vote.leverage || '-'}x</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Position</span><span className="text-[var(--text-primary)] font-semibold">{vote.position_pct ? `${(vote.position_pct * 100).toFixed(0)}%` : '-'}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">SL</span><span className="text-red-400 font-semibold">{vote.stop_loss_pct ? `${(vote.stop_loss_pct * 100).toFixed(1)}%` : '-'}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-secondary)]">TP</span><span className="text-green-400 font-semibold">{vote.take_profit_pct ? `${(vote.take_profit_pct * 100).toFixed(1)}%` : '-'}</span></div>
      </div>
      {vote.reasoning && (
        <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 border-t border-[var(--panel-border)] pt-2">{vote.reasoning}</p>
      )}
    </div>
  )
}

// Create Modal (simplified)
function CreateModal({
  isOpen, onClose, onCreate, aiModels, strategies, language: _language
}: {
  isOpen: boolean; onClose: () => void; onCreate: (r: CreateDebateRequest) => Promise<void>
  aiModels: AIModel[]; strategies: Strategy[]; language: string
}) {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [strategyId, setStrategyId] = useState('')
  const [maxRounds, setMaxRounds] = useState(3)
  const [participants, setParticipants] = useState<{ ai_model_id: string; personality: DebatePersonality }[]>([])
  const [creating, setCreating] = useState(false)

  // Get the selected strategy's coin source config
  const selectedStrategy = strategies.find(s => s.id === strategyId)
  const coinSource = selectedStrategy?.config?.coin_source
  const sourceType = coinSource?.source_type || 'static'
  const staticCoins = coinSource?.static_coins || []
  // Only show coin selector for static type with coins defined
  const isStaticWithCoins = sourceType === 'static' && staticCoins.length > 0

  useEffect(() => {
    if (isOpen && strategies && strategies.length > 0) {
      const firstStrategy = strategies[0]
      const firstStrategyId = firstStrategy?.id || ''
      const firstCoinSource = firstStrategy?.config?.coin_source
      const firstSourceType = firstCoinSource?.source_type || 'static'
      const firstStaticCoins = firstCoinSource?.static_coins || []
      setName('')
      setStrategyId(firstStrategyId)
      // Only set symbol for static type, otherwise leave empty (backend will choose)
      setSymbol(firstSourceType === 'static' && firstStaticCoins.length > 0 ? firstStaticCoins[0] : '')
      setMaxRounds(3)
      setParticipants([])
    }
  }, [isOpen, strategies])

  // Update symbol when strategy changes (not when user types)
  const prevStrategyId = useRef(strategyId)
  useEffect(() => {
    if (prevStrategyId.current !== strategyId) {
      prevStrategyId.current = strategyId
      if (isStaticWithCoins && staticCoins.length > 0) {
        setSymbol(staticCoins[0])
      } else {
        setSymbol('')
      }
    }
  }, [strategyId, isStaticWithCoins, staticCoins])

  const addP = () => {
    if (participants.length >= 10 || aiModels.length === 0) return
    // Allow same AI model to be used multiple times with different personalities
    const order: DebatePersonality[] = ['bull', 'bear', 'analyst', 'contrarian', 'risk_manager']
    // Cycle through personalities
    const nextPersonality = order[participants.length % order.length]
    setParticipants([...participants, { ai_model_id: aiModels[0].id, personality: nextPersonality }])
  }

  const submit = async () => {
    if (!name || !strategyId || participants.length < 2) {
      notify.error(t('fillNameAdd2AI'))
      return
    }
    setCreating(true)
    try {
      await onCreate({ name, symbol, strategy_id: strategyId, max_rounds: maxRounds, participants })
      onClose()
    } finally { setCreating(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[var(--surface-secondary)] shadow-xl rounded-xl w-full max-w-2xl min-w-[480px] p-8 debate-modal">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('createDebate')}</h3>
          <button onClick={onClose}><X size={20} className="text-[var(--text-secondary)]" /></button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder={t('debateName')}
            className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm"
          />

          <StrategySelect
            value={strategyId}
            onChange={setStrategyId}
            strategies={strategies || []}
          />

          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder={'Trading pair (e.g. BTCUSDT, empty = auto)'}
            className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm"
          />

          {isStaticWithCoins && (
            <select
              value={staticCoins.includes(symbol) ? symbol : ''}
              onChange={e => { const v = e.target.value; if (v) setSymbol(v) }}
              className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm"
              title={'Quick select from strategy'}
            >
              <option value="">{'Pick...'}</option>
              {staticCoins.map(coin => <option key={coin} value={coin}>{coin}</option>)}
            </select>
          )}

          <select value={maxRounds} onChange={e => setMaxRounds(+e.target.value)}
            className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm">
            {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {'rounds'}</option>)}
          </select>

          <div className="flex flex-col gap-2">
            {participants.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--panel-border)] w-full">
                {/* Personality selector - custom dropdown with icons */}
                <PersonalitySelect
                  value={p.personality}
                  onChange={per => {
                    const up = [...participants]; up[i].personality = per; setParticipants(up)
                  }}
                />
                {/* AI model selector */}
                <ModelSelect
                  value={p.ai_model_id}
                  onChange={id => { const up = [...participants]; up[i].ai_model_id = id; setParticipants(up) }}
                  aiModels={aiModels || []}
                />
                <button onClick={() => setParticipants(participants.filter((_, j) => j !== i))}
                  className="ml-auto text-[var(--binance-red)] hover:text-red-300 shrink-0"><X size={12} /></button>
              </div>
            ))}
            <button onClick={addP} className="self-start px-2 py-1 text-xs debate-accent hover:bg-[var(--debate-accent-bg)] rounded">
              + {t('addAI')}
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-secondary)] transition-colors text-center"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={creating}
            className="flex-1 px-4 py-2.5 rounded-lg debate-btn text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating && <Loader2 size={16} className="animate-spin shrink-0" />}
            {creating ? t('creating') : t('create')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Page
export function DebateArenaPage() {
  const { language } = useLanguage()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [execId, setExecId] = useState<string | null>(null)
  const [traderId, setTraderId] = useState('')
  const [executing, setExecuting] = useState(false)

  const { data: debates, mutate: mutateList } = useSWR<DebateSession[]>('debates', api.getDebates, { refreshInterval: 5000 })
  const { data: aiModels } = useSWR<AIModel[]>('ai-models', api.getModelConfigs)
  const { data: supportedModels } = useSWR<AIModel[]>('supported-ai-models', api.getSupportedModels)
  const { data: strategies } = useSWR<Strategy[]>('strategies', api.getStrategies)
  const { data: traders } = useSWR<TraderInfo[]>('traders', api.getTraders)
  const { data: detail, mutate: mutateDetail } = useSWR<DebateSessionWithDetails>(
    selectedId ? `debate-${selectedId}` : null,
    () => api.getDebate(selectedId!),
    { refreshInterval: selectedId ? 3000 : 0 }
  )

  useEffect(() => {
    if (debates?.length && !selectedId) setSelectedId(debates[0].id)
  }, [debates, selectedId])

  const onCreate = async (r: CreateDebateRequest) => {
    const d = await api.createDebate(r)
    notify.success('Debate created')
    mutateList()
    setSelectedId(d.id)
  }

  const onStart = async (id: string) => {
    await api.startDebate(id)
    notify.success('Debate started')
    mutateList(); mutateDetail()
  }

  const onCancel = async (id: string) => {
    await api.cancelDebate(id)
    notify.success('Debate stopped')
    mutateList(); mutateDetail()
  }

  const onDelete = async (id: string, status?: string) => {
    if ((status === 'running' || status === 'voting') && !window.confirm(t('confirmDeleteRunning'))) return
    await api.deleteDebate(id)
    notify.success('Debate deleted')
    if (selectedId === id) setSelectedId(null)
    mutateList()
  }

  const onExecute = async () => {
    if (!execId || !traderId) return
    setExecuting(true)
    try {
      await api.executeDebate(execId, traderId)
      notify.success('Trade executed')
      mutateDetail(); mutateList()
      setExecId(null); setTraderId('')
    } catch (e: any) { notify.error(e.message) }
    finally { setExecuting(false) }
  }

  // Process data
  const messages = detail?.messages || []
  const participants = detail?.participants || []
  const votes = detail?.votes || []
  const decision = detail?.final_decision
  const accessibleAIModels = getAccessibleDebateModels(aiModels, supportedModels)

  // Get strategy name
  const strategyName = strategies?.find(s => s.id === detail?.strategy_id)?.name || ''

  // Group by round
  const rounds: Record<number, DebateMessage[]> = {}
  messages.forEach(m => { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m) })

  // Vote summary
  const voteSum = votes.reduce((a, v) => { a[v.action] = (a[v.action] || 0) + 1; return a }, {} as Record<string, number>)

  return (
    <DeepVoidBackground className="flex overflow-hidden relative" style={{ height: 'calc(100vh - 64px)' }} contentDirection="row" disableAnimation>

      {/* Left - Debate List + Online Traders */}
      <div className="w-56 flex-shrink-0 bg-[var(--surface-primary)]/80 backdrop-blur-md border-r debate-panel-border flex flex-col z-10">
        {/* New Debate Button */}
        <button onClick={() => setShowCreate(true)}
          className="m-2 py-2 rounded-lg debate-btn text-sm flex items-center justify-center gap-1">
          <Plus size={16} /> {t('newDebate')}
        </button>

        {/* Debate List */}
        <div className="px-2 py-1 text-xs text-[var(--text-secondary)] font-semibold">{t('debateSessions')}</div>
        <div className="overflow-y-auto" style={{ maxHeight: '30%' }}>
          {debates?.map(d => (
            <div key={d.id} onClick={() => setSelectedId(d.id)}
              className={`p-2 cursor-pointer border-l-2 transition-all ${selectedId === d.id ? 'debate-selected' : 'border-transparent hover:bg-[var(--surface-secondary)]/50'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[d.status]}`} />
                <span className="text-sm text-[var(--text-primary)] truncate flex-1">{d.name}</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">{d.symbol} · R{d.current_round}/{d.max_rounds}</div>
              {selectedId === d.id && (
                <div className="flex gap-1 mt-1">
                  {d.status === 'pending' && (
                    <button onClick={e => { e.stopPropagation(); onStart(d.id) }}
                      className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">{t('start')}</button>
                  )}
                  {(d.status === 'running' || d.status === 'voting') && (
                    <button onClick={e => { e.stopPropagation(); onCancel(d.id) }}
                      className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">{t('stop')}</button>
                  )}
                  <button onClick={e => { e.stopPropagation(); onDelete(d.id, d.status) }}
                    className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">{t('delete')}</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Online Traders Section */}
        <div className="flex-1 border-t debate-panel-border mt-2 overflow-hidden flex flex-col">
          <div className="px-2 py-2 text-xs text-[var(--text-secondary)] font-semibold flex items-center gap-1">
            <Zap size={12} className="text-[var(--binance-green)]" />
            {t('onlineTraders')}
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-2">
            {traders?.filter(tr => tr.is_running).map(tr => (
              <div key={tr.trader_id}
                onClick={() => { setTraderId(tr.trader_id); if (decision && !decision.executed) setExecId(detail?.id || null) }}
                className={`p-2 rounded-lg cursor-pointer transition-all ${traderId === tr.trader_id ? 'bg-[var(--binance-green-bg)] ring-1 ring-[var(--binance-green)]' : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'}`}>
                <div className="flex items-center gap-2">
                  <PunkAvatar seed={tr.trader_id} size={32} className="rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--text-primary)] font-medium truncate">{tr.trader_name}</div>
                    <div className="text-xs text-[var(--text-secondary)] truncate">{tr.ai_model}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[var(--binance-green)] animate-pulse" />
                </div>
              </div>
            ))}
            {traders?.filter(tr => !tr.is_running).slice(0, 3).map(tr => (
              <div key={tr.trader_id} className="p-2 rounded-lg bg-[var(--surface-secondary)] opacity-50">
                <div className="flex items-center gap-2">
                  <div className="grayscale">
                    <PunkAvatar seed={tr.trader_id} size={32} className="rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--text-primary)] font-medium truncate">{tr.trader_name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{t('offline')}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!traders || traders.length === 0) && (
              <div className="text-xs text-[var(--text-secondary)] text-center py-4">{t('noTraders')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {detail ? (
          <>
            {/* Header Bar - Compact */}
            <div className="px-3 py-2 border-b debate-panel-border bg-[var(--surface-primary)]/60 backdrop-blur-md flex items-center gap-3 flex-shrink-0 shadow-sm">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[detail.status]}`} />
              <span className="font-bold text-[var(--text-primary)] truncate">{detail.name}</span>
              <span className="debate-accent font-semibold">{detail.symbol}</span>
              {strategyName && <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">{strategyName}</span>}
              <span className="text-xs text-[var(--text-secondary)]">R{detail.current_round}/{detail.max_rounds}</span>

              {/* Participants */}
              <div className="flex gap-1 ml-2">
                {participants.map(p => {
                  const vote = votes.find(v => v.ai_model_id === p.ai_model_id)
                  const act = vote ? (ACT[vote.action] || ACT.wait) : null
                  return (
                    <div key={p.id} className="flex items-center gap-1 px-1 py-0.5 rounded bg-[var(--surface-secondary)] text-xs">
                      <AIAvatar name={p.ai_model_name} size={14} />
                      {act && <span className={`${act.color}`}>{act.icon}</span>}
                    </div>
                  )
                })}
              </div>

              <div className="flex-1" />

              {/* Vote Summary */}
              {votes.length > 0 && (
                <div className="flex gap-1">
                  {Object.entries(voteSum).map(([action, count]) => {
                    const cfg = ACT[action] || ACT.wait
                    return (
                      <div key={action} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} text-xs font-semibold`}>
                        {cfg.icon} {cfg.label}×{count}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Main Content Area - Two Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {Object.keys(rounds).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                  <div className="mb-4">
                    {detail.status === 'pending' && <Play size={64} className="text-[var(--debate-accent)]" strokeWidth={1.5} />}
                    {detail.status === 'completed' && <AlertTriangle size={64} className="text-amber-500" strokeWidth={1.5} />}
                    {detail.status !== 'pending' && detail.status !== 'completed' && <Loader2 size={64} className="animate-spin text-[var(--debate-accent)]" strokeWidth={1.5} />}
                  </div>
                  <div className="text-lg text-center max-w-md">
                    {detail.status === 'pending' ? t('clickToStart') : detail.status === 'completed' ? t('debateFailed') : t('waitingAI')}
                  </div>
                </div>
              ) : (
                <>
                  {/* Left - Rounds */}
                  <div className="flex-1 overflow-y-auto p-4 border-r debate-panel-border">
                    <div className="text-sm text-[var(--text-secondary)] font-semibold mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {t('discussionRecords')}
                    </div>
                    <div className="space-y-3">
                      {Object.entries(rounds).map(([round, msgs]) => (
                        <div key={round} className="bg-white/5 rounded-xl p-3">
                          <div className="text-xs text-blue-400 font-bold mb-2">Round {round}</div>
                          <div className="space-y-2">
                            {msgs.map(m => <MessageCard key={m.id} msg={m} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right - Votes */}
                  {votes.length > 0 && (
                    <div className="w-[420px] flex-shrink-0 overflow-y-auto p-4 bg-[var(--surface-primary)]/30 backdrop-blur-sm">
                      <div className="text-sm text-[var(--text-secondary)] font-semibold mb-3 flex items-center gap-2">
                        <Trophy size={16} className="debate-accent" />
                        {t('finalVotes')}
                      </div>
                      <div className="space-y-3">
                        {votes.map(v => (
                          <VoteCard key={v.id} vote={{
                            ai_model_name: v.ai_model_name,
                            action: v.action,
                            symbol: v.symbol,
                            confidence: v.confidence,
                            leverage: v.leverage,
                            position_pct: v.position_pct,
                            stop_loss_pct: v.stop_loss_pct,
                            take_profit_pct: v.take_profit_pct,
                            reasoning: v.reasoning
                          }} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Consensus Bar - Show when votes exist */}
            {(decision || votes.length > 0) && (
              <div className="p-3 border-t debate-panel-border debate-consensus-bar backdrop-blur-md flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="debate-accent" />
                  <span className="text-sm text-[var(--text-secondary)]">{t('consensus')}:</span>
                  {decision ? (
                    <>
                      {decision.symbol && <span className="debate-accent font-bold mr-1">{decision.symbol}</span>}
                      <span className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${(ACT[decision.action] || ACT.wait).bg} ${(ACT[decision.action] || ACT.wait).color}`}>
                        {(ACT[decision.action] || ACT.wait).icon}
                        {decision.action.replace('_', ' ').toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 rounded font-bold bg-[var(--surface-tertiary)] text-[var(--text-secondary)]">
                      <Clock size={14} /> VOTING...
                    </span>
                  )}
                </div>
                {decision && (
                  <div className="flex items-center gap-4 text-sm">
                    <span><span className="text-[var(--text-secondary)]">{t('confidence')}</span> <span className="debate-accent font-bold">{decision.confidence || 0}%</span></span>
                    {(decision.leverage ?? 0) > 0 && <span><span className="text-[var(--text-secondary)]">{t('leverage')}</span> <span className="text-[var(--text-primary)] font-bold">{decision.leverage}x</span></span>}
                    {(decision.position_pct ?? 0) > 0 && <span><span className="text-[var(--text-secondary)]">{t('position')}</span> <span className="text-[var(--text-primary)] font-bold">{((decision.position_pct ?? 0) * 100).toFixed(0)}%</span></span>}
                    {(decision.stop_loss ?? 0) > 0 && <span><span className="text-[var(--text-secondary)]">SL</span> <span className="text-red-400 font-bold">{((decision.stop_loss ?? 0) * 100).toFixed(1)}%</span></span>}
                    {(decision.take_profit ?? 0) > 0 && <span><span className="text-[var(--text-secondary)]">TP</span> <span className="text-green-400 font-bold">{((decision.take_profit ?? 0) * 100).toFixed(1)}%</span></span>}
                  </div>
                )}
                <div className="flex-1" />
                {decision && !decision.executed && (decision.action === 'open_long' || decision.action === 'open_short') && (
                  <button onClick={() => setExecId(detail.id)}
                    className="px-4 py-1.5 rounded-lg debate-btn text-sm flex items-center gap-1">
                    <Zap size={14} /> {t('execute')}
                  </button>
                )}
                {decision?.executed && <span className="text-green-400 text-sm font-semibold">✓ {t('executed')}</span>}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <div className="text-4xl mb-2">🗳️</div>
              <div>{t('selectOrCreate')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreate={onCreate}
        aiModels={accessibleAIModels} strategies={strategies || []} language={language} />

      {/* Execute Modal */}
      {execId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--surface-secondary)]/90 backdrop-blur-xl rounded-xl w-full max-w-sm p-6 debate-modal">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Zap className="debate-accent" /> {t('executeTitle')}
            </h3>
            <select value={traderId} onChange={e => setTraderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm mb-3">
              <option value="">{t('selectTrader')}...</option>
              {traders?.filter(tr => tr.is_running).map(tr => (
                <option key={tr.trader_id} value={tr.trader_id}>✅ {tr.trader_name}</option>
              ))}
              {traders?.filter(tr => !tr.is_running).map(tr => (
                <option key={tr.trader_id} value={tr.trader_id} disabled>⏹ {tr.trader_name} ({t('offline')})</option>
              ))}
            </select>
            <div className="text-xs text-blue-300 bg-[var(--debate-accent-bg)] p-2 rounded mb-3">
              ⚠️ {'Will execute real trade with account balance'}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setExecId(null); setTraderId('') }}
                className="flex-1 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm hover:bg-[var(--surface-tertiary)] transition-colors">{t('cancel')}</button>
              <button onClick={onExecute} disabled={!traderId || executing || !traders?.find(tr => tr.trader_id === traderId)?.is_running}
                className="flex-1 py-2 rounded-lg debate-btn text-sm disabled:opacity-50">
                {executing ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('execute')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DeepVoidBackground>
  )
}
