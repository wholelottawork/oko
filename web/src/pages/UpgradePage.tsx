import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useAppKit } from '@reown/appkit/react'
import HeaderBar from '../components/HeaderBar'
import { UpgradeDeepThinkPanel } from '../components/UpgradeDeepThinkPanel'
import { UpgradeWhitelistPanel } from '../components/UpgradeWhitelistPanel'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useOkoHolderGate } from '../hooks/useOkoHolderGate'
import { getWhitelistEntries, type WhitelistEntry } from '../lib/upgradeWhitelist'

export function UpgradePage() {
  const { open } = useAppKit()
  const { language } = useLanguage()
  const { user, token, logout } = useAuth()
  const gate = useOkoHolderGate()
  const [whitelistOpen, setWhitelistOpen] = useState(false)
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([])

  useEffect(() => {
    getWhitelistEntries().then(setWhitelistEntries).catch(() => setWhitelistEntries([]))
  }, [])

  const navigate = (path: string) => {
    window.location.href = path
  }

  const progressPct = Math.min(100, gate.threshold > 0 ? (gate.totalBalance / gate.threshold) * 100 : 0)

  const gateHeadline = gate.status === 'eligible'
    ? 'Upgrade unlocked'
    : gate.status === 'unconfigured'
      ? 'Token gate pending contract launch'
    : gate.status === 'error'
      ? 'Unable to verify OKO balance'
      : gate.status === 'checking'
        ? 'Checking OKO balance…'
        : gate.status === 'disconnected'
          ? 'Connect a wallet to check eligibility'
          : 'Need more OKO to unlock'

  const gateSubcopy = gate.status === 'unconfigured'
    ? 'The holder gate is ready, but the OKO token contract has not been configured yet. Set UPGRADE_TOKEN_ADDRESS in the backend environment to enable Robinhood Chain balance checks.'
    : gate.status === 'error'
      ? gate.error || 'The app could not read your Robinhood Chain OKO balance. Make sure the connected wallet holds OKO on Robinhood Chain, then try again.'
    : gate.status === 'eligible'
      ? 'Your connected wallet qualifies for the Upgrade feature set.'
      : 'Holders of 150,000 OKO gain advanced bridge, assistant, and whitelist capabilities.'

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
      <HeaderBar
        isLoggedIn={!!(user && token)}
        isHomePage={true}
        currentPage="upgrade"
        language={language}
        onLanguageChange={() => {}}
        user={user}
        onLogout={logout}
        onLoginRequired={() => {}}
        onPageChange={(page) => navigate(`/${page}`)}
      />

      <main className="pt-16">
        <section className="relative overflow-hidden px-4 py-20 sm:py-28">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 12%, rgba(51,153,140,0.14) 0%, transparent 72%)',
            }}
          />

          <div className="max-w-6xl mx-auto relative z-10 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-3xl"
            >
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ letterSpacing: '-0.04em' }}>
                {'Upgrade unlocks the next layer of OKO.'}
              </h1>
              <p className="text-lg mt-5 leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                {'Supporters holding 150,000 OKO gain access to cross-chain execution, Deep Think wallet assistance, and safer named-address workflows.'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="grid grid-cols-1 gap-6"
            >
              <div
                className="rounded-[28px] p-6 sm:p-7"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      {'Eligibility'}
                    </div>
                    <h2 className="text-2xl font-semibold">{gateHeadline}</h2>
                  </div>
                  <div
                    className="rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: gate.isEligible ? 'rgba(14,203,129,0.12)' : 'rgba(255,255,255,0.04)',
                      color: gate.isEligible ? '#0ECB81' : 'var(--text-tertiary)',
                      border: `1px solid ${gate.isEligible ? 'rgba(14,203,129,0.24)' : 'var(--panel-border)'}`,
                    }}
                  >
                    {gate.isEligible ? ('Eligible') : ('Locked')}
                  </div>
                </div>

                <p className="text-sm mt-3 leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                  {gateSubcopy}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                  <MetricCard
                    label={'Wallet'}
                    value={gate.address ? `${gate.address.slice(0, 6)}…${gate.address.slice(-4)}` : '—'}
                  />
                  <MetricCard
                    label={'Current OKO'}
                    value={gate.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  />
                  <MetricCard
                    label={'Threshold'}
                    value={gate.threshold.toLocaleString()}
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{'Progress to unlock'}</span>
                    <span>{progressPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-tertiary)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPct}%`,
                        background: gate.isEligible ? '#0ECB81' : 'var(--accent-primary)',
                      }}
                    />
                  </div>
                  {!gate.isEligible && gate.status !== 'unconfigured' ? (
                    <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      {`${gate.missingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} OKO remaining to unlock.`}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                  {!gate.isConnected ? (
                    <button
                      onClick={() => open()}
                      className="rounded-2xl px-4 py-3 text-sm font-semibold inline-flex items-center gap-2"
                      style={{ background: 'var(--accent-primary)', color: '#fff' }}
                    >
                      <Wallet className="w-4 h-4" />
                      {'Connect wallet'}
                    </button>
                  ) : null}
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {gate.tokenAddress
                      ? `Robinhood Chain contract: ${gate.tokenAddress.slice(0, 6)}…${gate.tokenAddress.slice(-4)}`
                      : 'Robinhood Chain token contract not configured yet.'}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="grid grid-cols-1 gap-6"
            >
              <UpgradeDeepThinkPanel
                eligible={gate.isEligible}
                language={'en'}
                whitelistEntries={whitelistEntries}
                onOpenWhitelist={() => setWhitelistOpen(true)}
              />
            </motion.div>
          </div>
        </section>
      </main>

      <UpgradeWhitelistPanel
        open={whitelistOpen}
        onClose={() => setWhitelistOpen(false)}
        onEntriesChange={setWhitelistEntries}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      <div
        className={`${compact ? 'text-sm' : 'text-lg'} font-semibold mt-2 break-words`}
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>
    </div>
  )
}
