import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart2,
  BrainCircuit,
  FlaskConical,
  Globe,
  LayoutDashboard,
  Sword,
  TrendingUp,
  Users,
} from 'lucide-react'
import HeaderBar from '../components/HeaderBar'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import { LoginRequiredOverlay } from '../components/LoginRequiredOverlay'
import { useState } from 'react'

type FeatureItem = {
  icon: React.ReactNode
  label: string
  description: string
  path: string
  requiresAuth: boolean
  color: string
  colorBg: string
  colorBorder: string
  number: string
}

const FEATURES: FeatureItem[] = [
  {
    icon: <LayoutDashboard strokeWidth={1.5} className="w-5 h-5" />,
    label: 'Dashboard',
    description:
      'Your command center. P&L, equity curves, open positions, and every decision your AI traders have made — all in one view.',
    path: '/dashboard',
    requiresAuth: true,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '01',
  },
  {
    icon: <Users strokeWidth={1.5} className="w-5 h-5" />,
    label: 'AI Traders',
    description:
      'Spin up autonomous AI agents that trade 24/7. Configure risk tolerance, assign strategies, and watch them work.',
    path: '/traders',
    requiresAuth: true,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '02',
  },
  {
    icon: <BrainCircuit strokeWidth={1.5} className="w-5 h-5" />,
    label: 'Strategies',
    description:
      'Define exactly how your AI trades — from simple rules to complex multi-factor models. Built in plain language or code.',
    path: '/strategy',
    requiresAuth: true,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '03',
  },
  {
    icon: <Globe strokeWidth={1.5} className="w-5 h-5" />,
    label: 'Strategy Market',
    description:
      "Browse strategies built by the community. Fork what works. Share what you've built.",
    path: '/strategy-market',
    requiresAuth: true,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '04',
  },
  {
    icon: <TrendingUp strokeWidth={1.5} className="w-5 h-5" />,
    label: 'Live Competition',
    description:
      'Every AI trader, ranked in real time by performance. Watch the best rise and the rest fall behind.',
    path: '/competition',
    requiresAuth: false,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '05',
  },
  {
    icon: <Sword strokeWidth={1.5} className="w-5 h-5" />,
    label: 'AI Debate',
    description:
      'Multiple AI models argue live market positions — bull vs bear. Who makes the strongest case?',
    path: '/debate',
    requiresAuth: true,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '06',
  },
  {
    icon: <FlaskConical strokeWidth={1.5} className="w-5 h-5" />,
    label: 'Backtest',
    description:
      'Run any strategy against years of historical market data before you deploy a single dollar.',
    path: '/backtest',
    requiresAuth: true,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '07',
  },
  {
    icon: <BarChart2 strokeWidth={1.5} className="w-5 h-5" />,
    label: 'Data',
    description:
      'Order flow, open interest, funding rates, on-chain signals. The raw intelligence behind every good trade.',
    path: '/data',
    requiresAuth: false,
    color: '#33998C',
    colorBg: 'rgba(51,153,140,0.08)',
    colorBorder: 'rgba(51,153,140,0.2)',
    number: '08',
  },
]

const STATS = [
  { value: '24/7', label: 'Automated trading' },
  { value: '8', label: 'Integrated tools' },
  { value: '∞', label: 'Strategy combinations' },
]

export function TradePage() {
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const { theme } = useTheme()
  const isLoggedIn = !!user
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleFeatureClick = (feat: FeatureItem) => {
    if (feat.requiresAuth && !isLoggedIn) {
      setLoginOverlayFeature(feat.label)
      setLoginOverlayOpen(true)
      return
    }
    window.location.href = feat.path
  }

  const isDark = theme === 'dark'

  return (
    <>
      <HeaderBar
        isLoggedIn={isLoggedIn}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={(f) => {
          setLoginOverlayFeature(f)
          setLoginOverlayOpen(true)
        }}
        onPageChange={(page) => {
          const map: Record<string, string> = {
            data: '/data',
            competition: '/competition',
            'strategy-market': '/strategy-market',
            traders: '/traders',
            trader: '/dashboard',
            backtest: '/backtest',
            strategy: '/strategy',
            debate: '/debate',
            faq: '/docs',
            tokenomics: '/tokenomics',
            upgrade: '/upgrade',
          }
          const path = map[page]
          if (path) window.location.href = path
        }}
      />

      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--surface-primary)' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/bg1.png)',
            opacity: isDark ? 0.25 : 0.6,
          }}
          aria-hidden
        />
        {/* Subtle radial glow at top */}
        <div
          className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(51,153,140,0.12) 0%, transparent 70%)'
              : 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(51,153,140,0.08) 0%, transparent 70%)',
          }}
          aria-hidden
        />
      </div>

      <main className="relative z-10 min-h-screen">
        {/* ── HERO ── */}
        <section className="pt-28 pb-20 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto"
          >
            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span
                className="h-px w-8"
                style={{ background: 'var(--accent-primary)', opacity: 0.5 }}
              />
              <span
                className="text-xs font-semibold tracking-[0.15em] uppercase"
                style={{ color: 'var(--accent-primary)' }}
              >
                {'OKO Trading Suite'}
              </span>
              <span
                className="h-px w-8"
                style={{ background: 'var(--accent-primary)', opacity: 0.5 }}
              />
            </div>

            {/* Headline */}
            <h1
              className="font-bold tracking-tight mb-5 leading-[1.08]"
              style={{
                fontSize: 'clamp(2.6rem, 6vw, 4.2rem)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
              }}
            >
              {(
                <>ai-powered trading.</>
              )}
            </h1>

            {/* Subtext */}
            <p
              className="text-lg leading-relaxed max-w-xl mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              {'Strategy. Execution. Analysis. Everything runs together, powered by AI that learns from the market in real time.'}
            </p>

            {/* CTA row */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => {
                  window.location.href = isLoggedIn ? '/traders' : '/register'
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                {'Get started'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  window.location.href = '/'
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-80"
                style={{
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--surface-secondary)',
                }}
              >
                {'Try the AI assistant'}
              </button>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-10 mt-14"
          >
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    color: 'var(--accent-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── DIVIDER ── */}
        <div
          className="h-px mx-6 max-w-6xl 2xl:mx-auto"
          style={{ background: 'var(--panel-border)' }}
        />

        {/* ── FEATURE LIST ── */}
        <section className="py-8 px-6 max-w-6xl mx-auto">
          {FEATURES.map((feat, index) => {
            const isHovered = hoveredIndex === index
            const isEven = index % 2 === 0

            return (
              <motion.div
                key={feat.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.05 + index * 0.04,
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <button
                  onClick={() => handleFeatureClick(feat)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="group w-full text-left py-6 focus:outline-none relative"
                  style={{
                    borderBottom:
                      index < FEATURES.length - 1
                        ? '1px solid var(--panel-border)'
                        : 'none',
                  }}
                >
                  {/* Hover highlight bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-300"
                    style={{
                      background: feat.color,
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? 'scaleY(1)' : 'scaleY(0.3)',
                    }}
                  />

                  <div
                    className={`flex items-center gap-6 pl-5 ${isEven ? '' : ''}`}
                  >
                    {/* Number */}
                    <span
                      className="text-xs font-mono font-semibold shrink-0 w-6 tabular-nums transition-colors duration-200"
                      style={{
                        color: isHovered ? feat.color : 'var(--text-tertiary)',
                      }}
                    >
                      {feat.number}
                    </span>

                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                      style={{
                        background: isHovered
                          ? feat.colorBg
                          : 'var(--surface-secondary)',
                        color: isHovered ? feat.color : 'var(--text-secondary)',
                        border: `1px solid ${isHovered ? feat.colorBorder : 'var(--panel-border)'}`,
                      }}
                    >
                      {feat.icon}
                    </div>

                    {/* Title */}
                    <div className="w-40 shrink-0">
                      <span
                        className="text-base font-semibold transition-colors duration-200 block"
                        style={{
                          color: isHovered
                            ? 'var(--text-primary)'
                            : 'var(--text-secondary)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {feat.label}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className="flex-1 text-sm leading-relaxed hidden sm:block transition-colors duration-200"
                      style={{
                        color: isHovered
                          ? 'var(--text-secondary)'
                          : 'var(--text-tertiary)',
                      }}
                    >
                      {feat.description}
                    </p>

                    {/* Right side — tags + arrow */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {feat.requiresAuth && !isLoggedIn && null}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 mr-2"
                        style={{
                          background: isHovered ? feat.colorBg : 'transparent',
                          color: isHovered
                            ? feat.color
                            : 'var(--text-tertiary)',
                        }}
                      >
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Mobile description */}
                  <p
                    className="sm:hidden text-xs leading-relaxed mt-2 pl-[4.5rem]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {feat.description}
                  </p>
                </button>
              </motion.div>
            )
          })}
        </section>

        {/* ── BOTTOM CTA BAND ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mx-6 mb-16 max-w-6xl 2xl:mx-auto"
        >
          <div
            className="rounded-2xl px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(51,153,140,0.12) 0%, rgba(51,153,140,0.04) 100%)'
                : 'linear-gradient(135deg, rgba(51,153,140,0.08) 0%, rgba(51,153,140,0.03) 100%)',
              border: '1px solid var(--accent-primary-border)',
            }}
          >
            <div>
              <h3
                className="text-lg font-semibold mb-1"
                style={{
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {'Ready to let AI trade for you?'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {'Create an account and deploy your first AI trader in minutes.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  window.location.href = isLoggedIn ? '/traders' : '/register'
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 whitespace-nowrap"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                {isLoggedIn
                    ? 'Go to AI Traders'
                    : 'Create account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.section>
      </main>

      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />
    </>
  )
}
