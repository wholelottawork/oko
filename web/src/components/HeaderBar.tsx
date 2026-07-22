import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react'
import { t, type Language } from '../i18n/translations'
import { useSystemConfig } from '../hooks/useSystemConfig'
import { OFFICIAL_LINKS } from '../constants/branding'
import { useTheme } from '../contexts/ThemeContext'

type Page =
  | 'competition'
  | 'traders'
  | 'trader'
  | 'backtest'
  | 'strategy'
  | 'strategy-market'
  | 'data'
  | 'debate'
  | 'faq'
  | 'login'
  | 'register'
  | 'tokenomics'
  | 'upgrade'

interface NavItem {
  page: Page
  path: string
  label: string
  description: string
  requiresAuth: boolean
}

interface NavCategory {
  id: string
  label: string
  activePages: Page[]
  items: NavItem[]
  columns?: number
}

interface HeaderBarProps {
  onLoginClick?: () => void
  isLoggedIn?: boolean
  isHomePage?: boolean
  currentPage?: Page
  language?: Language
  onLanguageChange?: (lang: Language) => void
  user?: { email: string } | null
  onLogout?: () => void
  onPageChange?: (page: Page) => void
  onLoginRequired?: (featureName: string) => void
}

export default function HeaderBar({
  isLoggedIn = false,
  isHomePage = false,
  currentPage,
  language = 'en' as Language,
  user,
  onLogout,
  onPageChange,
  onLoginRequired,
}: HeaderBarProps) {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false
  const { theme } = useTheme()

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavClick = useCallback((item: NavItem) => {
    if (item.requiresAuth && !isLoggedIn) {
      onLoginRequired?.(item.label)
      return
    }
    onPageChange?.(item.page)
    navigate(item.path)
    setMobileMenuOpen(false)
  }, [isLoggedIn, onLoginRequired, onPageChange, navigate])

  const categories: NavCategory[] = [
    {
      id: 'trade',
      label: 'Trade',
      activePages: ['trader', 'traders', 'strategy', 'strategy-market', 'competition', 'backtest', 'data', 'debate'],
      columns: 2,
      items: [
        {
          page: 'trader',
          path: '/dashboard',
          label: 'Dashboard',
          description: 'AI trader performance overview',
          requiresAuth: true,
        },
        {
          page: 'traders',
          path: '/traders',
          label: 'Traders',
          description: 'Configure and manage trading agents',
          requiresAuth: true,
        },
        {
          page: 'strategy',
          path: '/strategy',
          label: 'Strategies',
          description: 'Build & manage trading strategies',
          requiresAuth: true,
        },
        {
          page: 'strategy-market',
          path: '/strategy-market',
          label: 'Strategy Market',
          description: 'Browse community strategies',
          requiresAuth: true,
        },
        {
          page: 'competition',
          path: '/competition',
          label: 'Live Competition',
          description: 'Real-time AI trader leaderboard',
          requiresAuth: true,
        },
        {
          page: 'debate',
          path: '/debate',
          label: 'Debate',
          description: 'Watch AI traders debate market moves live',
          requiresAuth: true,
        },
        {
          page: 'backtest',
          path: '/backtest',
          label: 'Backtest',
          description: 'Test strategies against historical data',
          requiresAuth: true,
        },
        {
          page: 'data',
          path: '/data',
          label: 'Data',
          description: 'Market data & analytics',
          requiresAuth: false,
        },
      ],
    },
  ]

  return (
    <>
    <nav className="fixed top-0 w-full z-50 header-bar">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 max-w-[1920px] mx-auto">
        {/* Logo */}
        <div
          onClick={() => { window.location.href = '/' }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
        >
          <img src="/logo.png" alt="OKO Logo" className="w-7 h-auto header-logo-img" style={theme === 'light' ? { filter: 'invert(1)' } : undefined} />
          <span className="text-lg font-bold header-logo">OKO</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center justify-between flex-1 ml-8">
          {/* Left - Nav Links */}
          <div className="flex items-center gap-1">
            {/* Trade / Data link */}
            <button
              onClick={() => { navigate('/data'); onPageChange?.('data' as Page) }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors
                ${currentPage === 'data'
                  ? 'header-nav-active'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {'Trading'}
            </button>

            {/* Logged-in nav links — hidden on home/landing page */}
            {!isHomePage && (
              <>
                <button
                  onClick={() => { navigate('/competition'); onPageChange?.('competition' as Page) }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors
                    ${currentPage === 'competition' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {'Competition'}
                </button>
                <button
                  onClick={() => { navigate('/traders'); onPageChange?.('traders' as Page) }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors
                    ${currentPage === 'traders' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {'Traders'}
                </button>
                <button
                  onClick={() => { navigate('/dashboard'); onPageChange?.('trader' as Page) }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors
                    ${currentPage === 'trader' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {'Dashboard'}
                </button>
                <button
                  onClick={() => { navigate('/strategy'); onPageChange?.('strategy' as Page) }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors
                    ${currentPage === 'strategy' || currentPage === 'strategy-market' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {'Strategies'}
                </button>
                <button
                  onClick={() => { navigate('/debate'); onPageChange?.('debate' as Page) }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors
                    ${currentPage === 'debate' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {'Debate'}
                </button>
              </>
            )}

            {/* Token link */}
            <button
              onClick={() => { navigate('/tokenomics'); onPageChange?.('tokenomics' as Page) }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors
                ${currentPage === 'tokenomics' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Token
            </button>

            {/* Upgrade link */}
            <button
              onClick={() => { navigate('/upgrade'); onPageChange?.('upgrade' as Page); setMobileMenuOpen(false) }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors
                ${currentPage === 'upgrade' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {'Upgrade'}
            </button>

            {/* Docs link */}
            <button
              onClick={() => { navigate('/docs'); onPageChange?.('faq' as Page); setMobileMenuOpen(false) }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors
                ${currentPage === 'faq' ? 'header-nav-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {'Docs'}
            </button>
          </div>

          {/* Right Side - Social Links and User Actions */}
          <div className="flex items-center gap-4">
            {/* Social Links */}
            <div className="flex items-center gap-1">
              {OFFICIAL_LINKS.github ? (
                <a
                  href={OFFICIAL_LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-all hover:scale-110 text-oko-text-muted hover:text-white hover:bg-white/5"
                  title="GitHub"
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                </a>
              ) : (
                <span className="p-2 rounded-lg text-oko-text-muted cursor-default opacity-60" title="GitHub">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                </span>
              )}
              {OFFICIAL_LINKS.twitter ? (
                <a
                  href={OFFICIAL_LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-all hover:scale-110 text-oko-text-muted hover:text-white hover:bg-white/5"
                  title="Twitter"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              ) : (
                <span className="p-2 rounded-lg text-oko-text-muted cursor-default opacity-60" title="Twitter">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
              )}
              {OFFICIAL_LINKS.telegram ? (
                <a
                  href={OFFICIAL_LINKS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-all hover:scale-110 text-oko-text-muted hover:text-white hover:bg-white/5"
                  title="Telegram"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
              ) : (
                <span className="p-2 rounded-lg text-oko-text-muted cursor-default opacity-60" title="Telegram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="h-5 w-px" style={{ background: 'var(--surface-tertiary)' }} />

            {/* User Info / Login Buttons */}
            {isLoggedIn && user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded transition-colors bg-oko-bg-lighter header-border border hover:bg-white/5"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold header-user-avatar">
                    {user.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-oko-text-muted">{user.email}</span>
                  <ChevronDown className="w-4 h-4 text-oko-text-muted" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-full rounded-lg shadow-lg overflow-hidden z-50 bg-oko-bg-lighter header-border border">
                    <div className="px-3 py-2 border-b header-border">
                      <div className="text-xs text-oko-text-muted">{t('loggedInAs', language)}</div>
                      <div className="text-sm font-medium text-oko-text-muted">{user.email}</div>
                    </div>
                    {onLogout && (
                      <button
                        onClick={() => { onLogout(); setUserDropdownOpen(false) }}
                        className="w-full px-3 py-2 text-sm font-semibold transition-colors hover:opacity-80 text-center bg-oko-danger/20 text-oko-danger"
                      >
                        {t('exitLogin', language)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              currentPage !== 'login' && currentPage !== 'register' && (
                <div className="flex items-center gap-3">
                  <a
                    href="/login"
                    className="px-4 py-2 text-sm font-medium transition-colors rounded-lg"
                    style={{
                      color: 'var(--text-primary)',
                      border: '1px solid var(--surface-tertiary)',
                      background: 'var(--surface-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary-border)'
                      e.currentTarget.style.color = 'var(--accent-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--surface-tertiary)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                  >
                    {t('signIn', language)}
                  </a>
                  {registrationEnabled && (
                    <a
                      href="/register"
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-colors hover:opacity-90"
                      style={{ background: 'var(--accent-primary)', color: '#fff' }}
                    >
                      {t('signUp', language)}
                    </a>
                  )}
                </div>
              )
            )}

            {/* Theme is automatic: light on desktop, dark on mobile */}

            {/* Language Toggle — removed, defaulting to English */}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-oko-text-muted hover:text-white"
          whileTap={{ scale: 0.9 }}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </motion.button>
      </div>
    </nav>

    {/* Mobile Menu Overlay — rendered outside <nav> so backdrop-filter doesn't trap fixed positioning */}
    <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 md:hidden"
            style={{ background: 'var(--surface-primary)', top: '64px' }}
          >
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className="flex flex-col overflow-y-auto px-5 pt-6 pb-8"
              style={{ height: 'calc(100dvh - 64px)' }}
            >
              {/* Navigation */}
              <div className="flex-1">
                {/* Markets link always at top */}
                <div className="mb-6">
                  <motion.button
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 }}
                    onClick={() => { navigate('/data'); onPageChange?.('data' as Page); setMobileMenuOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors active:bg-white/5"
                    style={{ background: currentPage === 'data' ? 'var(--accent-primary-bg)' : 'transparent' }}
                  >
                    <span
                      className="text-[15px] font-medium"
                      style={{ color: currentPage === 'data' ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                    >
                      {'Markets'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  </motion.button>
                </div>

                {!isHomePage && categories.map((category) => (
                  <div key={category.id} className="mb-6">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {category.label}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {category.items.filter(item => item.page !== 'data').map((item, ii) => (
                        <motion.button
                          key={item.page}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.06 + ii * 0.03 }}
                          onClick={() => handleNavClick(item)}
                          className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors active:bg-white/5"
                          style={{
                            background: currentPage === item.page ? 'var(--accent-primary-bg)' : 'transparent',
                          }}
                        >
                          <span
                            className="text-[15px] font-medium"
                            style={{
                              color: currentPage === item.page
                                ? 'var(--accent-primary)'
                                : 'var(--text-primary)',
                            }}
                          >
                            {item.label}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Docs link */}
                <div className="mb-6">
                  <div
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {'Resources'}
                  </div>
                  <motion.button
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => { navigate('/tokenomics'); onPageChange?.('tokenomics' as Page); setMobileMenuOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors active:bg-white/5"
                    style={{
                      background: currentPage === 'tokenomics' ? 'var(--accent-primary-bg)' : 'transparent',
                    }}
                  >
                    <span
                      className="text-[15px] font-medium"
                      style={{
                        color: currentPage === 'tokenomics' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                    >
                      Token
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.165 }}
                    onClick={() => { navigate('/upgrade'); onPageChange?.('upgrade' as Page); setMobileMenuOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors active:bg-white/5"
                    style={{
                      background: currentPage === 'upgrade' ? 'var(--accent-primary-bg)' : 'transparent',
                    }}
                  >
                    <span
                      className="text-[15px] font-medium"
                      style={{
                        color: currentPage === 'upgrade' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {'Upgrade'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 }}
                    onClick={() => { navigate('/docs'); onPageChange?.('faq' as Page); setMobileMenuOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors active:bg-white/5"
                    style={{
                      background: currentPage === 'faq' ? 'var(--accent-primary-bg)' : 'transparent',
                    }}
                  >
                    <span
                      className="text-[15px] font-medium"
                      style={{
                        color: currentPage === 'faq' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {'Docs'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  </motion.button>
                </div>
              </div>

              {/* Footer controls */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--panel-border)' }}>
                {/* Auth */}
                <div className="mb-5">
                  {isLoggedIn && user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' }}
                        >
                          {user.email[0].toUpperCase()}
                        </div>
                        <span className="text-sm truncate max-w-[180px]" style={{ color: 'var(--text-secondary)' }}>
                          {user.email}
                        </span>
                      </div>
                      <button
                        onClick={() => { onLogout?.(); setMobileMenuOpen(false) }}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                      >
                        {t('exitLogin', language)}
                      </button>
                    </div>
                  ) : (
                    currentPage !== 'login' && currentPage !== 'register' && (
                      <div className="flex gap-3">
                        <a
                          href="/login"
                          className="flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-colors"
                          style={{ background: 'var(--accent-primary)', color: '#fff' }}
                        >
                          {t('signIn', language)}
                        </a>
                        {registrationEnabled && (
                          <a
                            href="/register"
                            className="flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-colors"
                            style={{ border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
                          >
                            {t('signUp', language)}
                          </a>
                        )}
                      </div>
                    )
                  )}
                </div>

                {/* Preferences row */}
                <div className="flex items-center gap-3">

                  <div className="flex-1" />

                  {/* Social icons */}
                  <div className="flex items-center gap-1">
                    {[
                      { href: OFFICIAL_LINKS.github, vb: '0 0 16 16', icon: <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /> },
                      { href: OFFICIAL_LINKS.twitter, vb: '0 0 24 24', icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /> },
                      { href: OFFICIAL_LINKS.telegram, vb: '0 0 24 24', icon: <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /> },
                    ].map((link, i) =>
                      link.href ? (
                        <a
                          key={i}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 text-[var(--text-tertiary)] hover:text-white hover:bg-white/5 active:bg-white/5"
                        >
                          <svg width="15" height="15" viewBox={link.vb} fill="currentColor">{link.icon}</svg>
                        </a>
                      ) : (
                        <span
                          key={i}
                          className="w-9 h-9 rounded-lg flex items-center justify-center opacity-40"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <svg width="15" height="15" viewBox={link.vb} fill="currentColor">{link.icon}</svg>
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
