import { useMemo, useState } from 'react'
import { ArrowRightLeft, Info, Lock, Sparkles } from 'lucide-react'
import { useAppKitAccount } from '@reown/appkit/react'
import { SwapCard, type SwapIntent } from './SwapCard'
import { UPGRADE_SUPPORTED_CHAINS } from '../lib/upgradeConfig'

// UPGRADE_SUPPORTED_CHAINS (upgradeConfig.ts) is EVM-only. Since the whole
// point of this card post-migration is bridging *into* Solana to reach
// $OKO, add Solana as a selectable chain here rather than in the shared
// EVM chain list.
const BRIDGE_CHAINS = [
  ...UPGRADE_SUPPORTED_CHAINS,
  { id: 'solana-mainnet-beta', label: 'Solana' },
] as const

interface UpgradeBridgeCardProps {
  eligible: boolean
  language?: 'en' | 'zh'
}

export function UpgradeBridgeCard({ eligible, language = 'en' }: UpgradeBridgeCardProps) {
  const { address } = useAppKitAccount()
  const [fromChain, setFromChain] = useState('solana-mainnet-beta')
  const [toChain, setToChain] = useState('1')
  const [fromToken, setFromToken] = useState('USDC')
  const [toToken, setToToken] = useState('USDC')
  const [amount, setAmount] = useState('100')
  const [routeNonce, setRouteNonce] = useState(0)

  const intent = useMemo<SwapIntent>(
    () => ({
      action: 'swap',
      fromToken: fromToken.trim().toUpperCase(),
      toToken: toToken.trim().toUpperCase(),
      amount: amount.trim() || '100',
      fromChain,
      toChain,
    }),
    [amount, fromChain, fromToken, toChain, toToken]
  )

  const t = {
        title: 'Cross-Chain Bridge',
        subtitle: 'Cross-chain bridge',
        kicker: 'Best-route bridge execution for qualified holders',
        blurb: 'OKO will pre-compute the best liquidity path across supported chains, so you can bridge and swap without manual routing.',
        from: 'From chain',
        to: 'To chain',
        payToken: 'Pay token',
        receiveToken: 'Receive token',
        amount: 'Amount',
        route: 'Load route',
        locked: 'Unlocks at 150,000 OKO',
        connectHint: 'Use the page-level Connect wallet button above to activate bridge execution.',
        note: 'This panel reuses the live Mayan Finance execution path already used by the app, across EVM and Solana alike.',
      }

  return (
    <div
      className="rounded-3xl p-5 sm:p-6 space-y-4"
      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-tertiary)' }}>
              {t.subtitle}
            </span>
          </div>
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t.title}
          </h3>
          <p className="text-sm mt-2 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
            {t.blurb}
          </p>
        </div>
        <div
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
          style={{
            background: eligible ? 'rgba(14,203,129,0.12)' : 'rgba(255,255,255,0.04)',
            color: eligible ? '#0ECB81' : 'var(--text-tertiary)',
            border: `1px solid ${eligible ? 'rgba(14,203,129,0.25)' : 'var(--panel-border)'}`,
          }}
        >
          {eligible ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {eligible ? t.kicker : t.locked}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t.from}>
          <select value={fromChain} onChange={(e) => setFromChain(e.target.value)} className="upgrade-select">
            {BRIDGE_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id}>{chain.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t.to}>
          <select value={toChain} onChange={(e) => setToChain(e.target.value)} className="upgrade-select">
            {BRIDGE_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id}>{chain.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t.payToken}>
          <input value={fromToken} onChange={(e) => setFromToken(e.target.value)} className="upgrade-input" />
        </Field>
        <Field label={t.receiveToken}>
          <input value={toToken} onChange={(e) => setToToken(e.target.value)} className="upgrade-input" />
        </Field>
        <Field label={t.amount}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="upgrade-input" />
        </Field>
        <div className="flex items-end">
          <button
            onClick={() => setRouteNonce((v) => v + 1)}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-opacity"
            style={{
              background: eligible ? 'var(--accent-primary)' : 'var(--surface-tertiary)',
              color: eligible ? '#fff' : 'var(--text-tertiary)',
              opacity: eligible ? 1 : 0.7,
              cursor: eligible ? 'pointer' : 'not-allowed',
            }}
            disabled={!eligible}
          >
            {t.route}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{t.note}</span>
      </div>

      {eligible && address ? (
        <SwapCard
          key={routeNonce}
          intent={intent}
          address={address}
          language={language}
        />
      ) : eligible ? (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', color: 'var(--text-tertiary)' }}
        >
          {t.connectHint}
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}
