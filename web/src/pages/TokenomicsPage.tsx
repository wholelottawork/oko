import { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ExternalLink, Zap, Vote, TrendingUp, Shield } from 'lucide-react'
import HeaderBar from '../components/HeaderBar'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useSystemConfig } from '../hooks/useSystemConfig'

// ── Tokenomics data ────────────────────────────────────────────────────────────

const TOTAL_SUPPLY = 1_000_000_000

const ALLOCATIONS = [
  { label: 'Public Sale',           pct: 55, color: '#0EA5E9', desc: 'Solana launch — fair and transparent distribution' },
  { label: 'Treasury',              pct: 20, color: '#33998C', desc: 'Protocol operations and long-term development' },
  { label: 'Liquidity',             pct: 15, color: '#6366F1', desc: 'DEX and CEX liquidity provisioning' },
  { label: 'Ecosystem',             pct: 10, color: '#2DD4BF', desc: 'Integrations, partnerships, and incentive programs' },
]

const VESTING = [
  { category: 'Public Sale',        cliff: '—',        vesting: '—',         tge: '100%' },
  { category: 'Treasury',           cliff: '—',        vesting: 'Ongoing',   tge: '10%'  },
  { category: 'Liquidity',          cliff: '—',        vesting: 'Ongoing',   tge: '100%' },
  { category: 'Ecosystem',          cliff: '3 months', vesting: '24 months', tge: '5%'   },
]

const UTILITY = [
  {
    icon: <Vote className="w-5 h-5" />,
    title: 'Governance',
    desc: 'Vote on protocol upgrades, fee structures, and ecosystem grant allocations. One token, one vote.',
    color: '#33998C',
    glow: 'rgba(51,153,140,0.12)',
    num: '01',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Fee Discounts',
    desc: 'Hold $OKO to unlock tiered discounts on trading fees across connected exchanges and OKO platform fees.',
    color: '#0EA5E9',
    glow: 'rgba(14,165,233,0.12)',
    num: '02',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Staking Rewards',
    desc: 'Stake $OKO to earn protocol revenue share. The longer you lock, the higher your reward multiplier.',
    color: '#6366F1',
    glow: 'rgba(99,102,241,0.12)',
    num: '03',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Premium Access',
    desc: 'Token holders unlock advanced AI models, higher strategy limits, and priority execution on trades.',
    color: '#2DD4BF',
    glow: 'rgba(45,212,191,0.12)',
    num: '04',
  },
]

// ── Donut Chart ────────────────────────────────────────────────────────────────

const RADIUS = 80
const STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3 // px gap between slices

function DonutChartInner({ animate }: { animate: boolean }) {
  let offset = 0
  const slices = ALLOCATIONS.map((a) => {
    const dash = (a.pct / 100) * CIRCUMFERENCE
    const gap = GAP
    const slice = { ...a, dash: dash - gap, gap, offset }
    offset += dash
    return slice
  })

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[260px] mx-auto" style={{ overflow: 'visible' }}>
      <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--surface-tertiary)" strokeWidth={STROKE} />
      {slices.map((s, i) => (
        <motion.circle
          key={s.label}
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={s.color}
          strokeWidth={STROKE}
          strokeDasharray={`${animate ? s.dash : 0} ${CIRCUMFERENCE}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
          transform="rotate(-90 100 100)"
          initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
          animate={animate ? { strokeDasharray: `${s.dash} ${CIRCUMFERENCE}` } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
        />
      ))}
      {/* Center label */}
      <text x="100" y="96" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text-primary)">$OKO</text>
      <text x="100" y="112" textAnchor="middle" fontSize="9" fill="var(--text-secondary)">1B Supply</text>
    </svg>
  )
}

const DonutChart = memo(DonutChartInner)

// ── Page ───────────────────────────────────────────────────────────────────────

export function TokenomicsPage() {
  const { theme } = useTheme()
  const { language } = useLanguage()
  const { user, token, logout } = useAuth()
  const { config: systemConfig } = useSystemConfig()
  const tokenAddress = systemConfig?.upgrade_gate?.token_address ?? ''
  const [copied, setCopied] = useState(false)
  const [chartVisible, setChartVisible] = useState(false)
  const [activeAlloc, setActiveAlloc] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const navigate = (path: string) => { window.location.href = path }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setChartVisible(true) },
      { threshold: 0.3 }
    )
    if (chartRef.current) observer.observe(chartRef.current)
    return () => observer.disconnect()
  }, [])

  const handleCopy = () => {
    if (!tokenAddress) return
    navigator.clipboard.writeText(tokenAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

  const cardStyle = {
    background: 'var(--surface-secondary)',
    border: '1px solid var(--panel-border)',
    backdropFilter: 'blur(12px)',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
      <HeaderBar
        isLoggedIn={!!(user && token)}
        currentPage="tokenomics"
        language={language}
        onLanguageChange={() => {}}
        user={user}
        onLogout={logout}
        onLoginRequired={() => {}}
        onPageChange={(page) => navigate(`/${page}`)}
      />

      <main className="pt-16">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-32 flex flex-col items-center text-center">
          {/* Subtle radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(51,153,140,0.12) 0%, transparent 70%)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3">
              <img
                src="/eye.gif"
                alt="OKO"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain"
                style={isMobile && theme === 'dark' ? { filter: 'invert(1)' } : undefined}
              />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                Token
              </h1>
            </div>

            <p className="text-lg" style={{ color: 'var(--text-secondary)', maxWidth: '480px' }}>
              The native utility and governance token powering the OKO protocol. Trade smarter, govern together.
            </p>

            {/* Mint address */}
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono"
              style={{ ...cardStyle }}
            >
              <span style={{ color: 'var(--text-tertiary)' }}>Contract:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {!tokenAddress
                  ? 'TBA'
                  : `${tokenAddress.slice(0, 10)}…${tokenAddress.slice(-8)}`}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={
                  !tokenAddress
                    ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
                    : { background: 'rgba(14,203,129,0.12)', color: '#0ECB81', border: '1px solid rgba(14,203,129,0.24)' }
                }
              >
                {!tokenAddress ? 'TBA' : 'Live'}
              </span>
              <button
                onClick={handleCopy}
                className="ml-1 transition-opacity hover:opacity-70"
                disabled={!tokenAddress}
              >
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#0ECB81' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />}
              </button>
            </div>
          </motion.div>
        </section>

        {/* ── Key Stats ── */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { label: 'Total Supply',     value: `${fmt(TOTAL_SUPPLY)}`,  sub: 'tokens' },
              { label: 'Token Standard',   value: 'SPL',                   sub: 'Solana ecosystem' },
              { label: 'Launch Network',   value: 'Solana',                sub: 'Layer 1' },
              { label: 'TGE',              value: 'Q2 2026',               sub: 'Estimated' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-5 flex flex-col gap-1" style={cardStyle}>
                <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.sub}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Allocation ── */}
        <section className="px-4 pb-20 max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold mb-8"
          >
            Token Allocation
          </motion.h2>

          <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center" style={{ overflow: 'visible' }}>
            {/* Donut */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <DonutChart animate={chartVisible} />
            </motion.div>

            {/* Bar breakdown */}
            <div className="flex flex-col gap-3">
              {ALLOCATIONS.map((a, i) => (
                <motion.div
                  key={a.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="relative cursor-pointer group"
                  onMouseEnter={() => setActiveAlloc(i)}
                  onMouseLeave={() => setActiveAlloc(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: a.color }}>{a.pct}%</span>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-tertiary)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: a.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${a.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 + 0.1, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  {/* Description tooltip — absolutely positioned, no layout shift */}
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 transition-opacity duration-150"
                    style={{
                      top: 'calc(100% + 4px)',
                      opacity: activeAlloc === i ? 1 : 0,
                    }}
                  >
                    <span
                      className="inline-block text-[11px] px-2.5 py-1 rounded-lg"
                      style={{
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--text-secondary)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                      }}
                    >
                      {a.desc}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Vesting Schedule ── */}
        <section className="px-4 pb-20 max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold mb-8"
          >
            Vesting Schedule
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden"
            style={cardStyle}
          >
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  {['Category', 'Cliff', 'Vesting', 'TGE Unlock'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-[11px] uppercase tracking-widest font-semibold"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VESTING.map((row, i) => {
                  const alloc = ALLOCATIONS.find(a => a.label === row.category)
                  return (
                    <tr
                      key={row.category}
                      style={{
                        borderBottom: i < VESTING.length - 1 ? '1px solid var(--panel-border)' : 'none',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: alloc?.color ?? '#888' }} />
                          <span style={{ color: 'var(--text-primary)' }}>{row.category}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{row.cliff}</td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{row.vesting}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: row.tge === '100%' ? 'rgba(14,203,129,0.1)' : 'rgba(51,153,140,0.1)',
                            color: row.tge === '100%' ? '#0ECB81' : 'var(--accent-primary)',
                          }}
                        >
                          {row.tge}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y" style={{ borderColor: 'var(--panel-border)' }}>
              {VESTING.map((row, i) => {
                const alloc = ALLOCATIONS.find(a => a.label === row.category)
                return (
                  <div key={row.category} className="px-4 py-3.5" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: alloc?.color ?? '#888' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.category}</span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: row.tge === '100%' ? 'rgba(14,203,129,0.1)' : 'rgba(51,153,140,0.1)',
                          color: row.tge === '100%' ? '#0ECB81' : 'var(--accent-primary)',
                        }}
                      >
                        {row.tge}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <span>Cliff: <span style={{ color: 'var(--text-secondary)' }}>{row.cliff}</span></span>
                      <span>Vesting: <span style={{ color: 'var(--text-secondary)' }}>{row.vesting}</span></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </section>

        {/* ── Token Utility ── */}
        <section className="px-4 pb-20 max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold mb-8"
          >
            Token Utility
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {UTILITY.map((u, i) => (
              <motion.div
                key={u.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="group relative rounded-2xl p-5 flex flex-col gap-4 overflow-hidden transition-all duration-300"
                style={{
                  background: 'var(--surface-secondary)',
                  border: `1px solid ${u.color}30`,
                }}
                whileHover={{ y: -3 }}
              >
                {/* Subtle glow background on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(ellipse 100% 70% at 50% 0%, ${u.glow} 0%, transparent 70%)` }}
                />

                {/* Number + icon row */}
                <div className="relative flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: u.glow, color: u.color }}
                  >
                    {u.icon}
                  </div>
                  <span
                    className="text-2xl font-black tabular-nums leading-none"
                    style={{ color: u.color, opacity: 0.2 }}
                  >
                    {u.num}
                  </span>
                </div>

                {/* Text */}
                <div className="relative flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: u.color }} />
                    <h3 className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>{u.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed pl-3.5" style={{ color: 'var(--text-secondary)' }}>{u.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-4 pb-24 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-7 sm:p-10 flex flex-col items-center sm:flex-row sm:justify-between gap-5 text-center sm:text-left"
          >
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center sm:justify-start gap-2.5" style={{ color: 'var(--text-primary)' }}>
                Be early to <img src="/logo.png" alt="OKO" className="w-6 h-6 sm:w-7 sm:h-7 object-contain inline-block" style={theme === 'light' ? { filter: 'invert(1)' } : undefined} />
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Follow our announcements for launch details, whitelist opportunities, and airdrop campaigns.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-shrink-0 flex-nowrap">
              <a
                href="https://x.com/okoagent"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-110 whitespace-nowrap"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
              >
                Follow on X
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://github.com/oko-trading/okotrading"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-110 whitespace-nowrap"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub
              </a>
              <button
                onClick={() => navigate('/docs')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-110 whitespace-nowrap"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                Learn more
              </button>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  )
}
