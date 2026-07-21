import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useAppKit } from '@reown/appkit/react'
import HeaderBar from '../components/HeaderBar'
import { UpgradeDeepThinkPanel } from '../components/UpgradeDeepThinkPanel'
import { UpgradeWhitelistPanel } from '../components/UpgradeWhitelistPanel'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useOkoHolderGate } from '../hooks/useOkoHolderGate'
import { OKO_SOLANA_MINT, isSolanaMintConfigured } from '../lib/upgradeConfig'
import { getWhitelistEntries, type WhitelistEntry } from '../lib/upgradeWhitelist'

export function UpgradePage() {
  const { open } = useAppKit()
  const { language } = useLanguage()
  const { user, token, logout } = useAuth()
  const gate = useOkoHolderGate()
  const [whitelistOpen, setWhitelistOpen] = useState(false)
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([])
  const isEn = language !== 'zh'
  const mintConfigured = useMemo(() => isSolanaMintConfigured(), [])

  useEffect(() => {
    getWhitelistEntries().then(setWhitelistEntries).catch(() => setWhitelistEntries([]))
  }, [])

  const navigate = (path: string) => {
    window.location.href = path
  }

  const progressPct = Math.min(100, gate.threshold > 0 ? (gate.totalBalance / gate.threshold) * 100 : 0)

  const gateHeadline = gate.status === 'eligible'
    ? isEn ? 'Upgrade unlocked' : '升级已解锁'
    : gate.status === 'unconfigured'
      ? isEn ? 'Token gate pending contract launch' : '代币门槛等待合约上线'
    : gate.status === 'error'
      ? isEn ? 'Unable to verify OKO balance' : '无法验证 OKO 余额'
      : gate.status === 'checking'
        ? isEn ? 'Checking OKO balance…' : '正在检查 OKO 余额…'
        : gate.status === 'disconnected'
          ? isEn ? 'Connect a wallet to check eligibility' : '连接钱包以检查资格'
          : isEn ? 'Need more OKO to unlock' : '需要更多 OKO 才能解锁'

  const gateSubcopy = gate.status === 'unconfigured'
    ? isEn
        ? 'The holder gate is ready, but the OKO Solana mint has not been configured yet. Once the mint is live, this page will verify balances on Solana without using Squid.'
        : '持币门槛逻辑已准备好，但 OKO 的 Solana mint 尚未配置。代币上线后，本页将直接在 Solana 上校验余额，而不会使用 Squid。'
    : gate.status === 'error'
      ? isEn
        ? gate.error || 'The app could not read your Solana OKO balance. Make sure the connected wallet is your Solana wallet, then try again.'
        : gate.error || '应用无法读取您的 Solana OKO 余额。请确认当前连接的是持有 OKO 的 Solana 钱包，然后重试。'
    : gate.status === 'eligible'
      ? isEn
        ? 'Your connected wallet qualifies for the Upgrade feature set.'
        : '您当前连接的钱包符合 Upgrade 功能资格。'
      : isEn
        ? 'Holders of 150,000 OKO gain advanced bridge, assistant, and whitelist capabilities.'
        : '持有 150,000 OKO 的用户将获得高级桥接、助手与白名单能力。'

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
                {isEn ? 'Upgrade unlocks the next layer of OKO.' : 'Upgrade 解锁 OKO 的下一层能力。'}
              </h1>
              <p className="text-lg mt-5 leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                {isEn
                  ? 'Supporters holding 150,000 OKO gain access to cross-chain execution, Deep Think wallet assistance, and safer named-address workflows.'
                  : '持有 150,000 OKO 的支持者将获得跨链执行、Deep Think 钱包助手以及更安全的命名地址工作流。'}
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
                      {isEn ? 'Eligibility' : '资格'}
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
                    {gate.isEligible ? (isEn ? 'Eligible' : '符合条件') : (isEn ? 'Locked' : '未解锁')}
                  </div>
                </div>

                <p className="text-sm mt-3 leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                  {gateSubcopy}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                  <MetricCard
                    label={isEn ? 'Wallet' : '钱包'}
                    value={gate.address ? `${gate.address.slice(0, 6)}…${gate.address.slice(-4)}` : '—'}
                  />
                  <MetricCard
                    label={isEn ? 'Current OKO' : '当前 OKO'}
                    value={gate.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  />
                  <MetricCard
                    label={isEn ? 'Threshold' : '门槛'}
                    value={gate.threshold.toLocaleString()}
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{isEn ? 'Progress to unlock' : '距离解锁进度'}</span>
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
                      {isEn
                        ? `${gate.missingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} OKO remaining to unlock.`
                        : `还需 ${gate.missingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} OKO 才能解锁。`}
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
                      {isEn ? 'Connect wallet' : '连接钱包'}
                    </button>
                  ) : null}
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {mintConfigured
                      ? isEn
                        ? `Configured Solana mint: ${OKO_SOLANA_MINT.slice(0, 6)}…${OKO_SOLANA_MINT.slice(-4)}`
                        : `已配置 Solana mint：${OKO_SOLANA_MINT.slice(0, 6)}…${OKO_SOLANA_MINT.slice(-4)}`
                      : isEn
                        ? 'Solana mint not configured yet.'
                        : 'Solana mint 暂未配置。'}
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
                language={isEn ? 'en' : 'zh'}
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
