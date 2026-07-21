import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { api } from './lib/api'
import { TraderDashboardPage } from './pages/TraderDashboardPage'

import { AITradersPage } from './components/AITradersPage'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { ResetPasswordPage } from './components/ResetPasswordPage'
import { CompetitionPage } from './components/CompetitionPage'
import { LandingPage } from './pages/LandingPage'
import { TradePage } from './pages/TradePage'
import { TokenomicsPage } from './pages/TokenomicsPage'
import { UpgradePage } from './pages/UpgradePage'
import { DocsPage } from './pages/DocsPage'
import { StrategyStudioPage } from './pages/StrategyStudioPage'
import { DebateArenaPage } from './pages/DebateArenaPage'
import { StrategyMarketPage } from './pages/StrategyMarketPage'
import { DataPage } from './pages/DataPage'
import { LoginRequiredOverlay } from './components/LoginRequiredOverlay'
import HeaderBar from './components/HeaderBar'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useAppKitTheme } from '@reown/appkit/react'
import { ConfirmDialogProvider } from './components/ConfirmDialog'
import { t } from './i18n/translations'
import { useSystemConfig } from './hooks/useSystemConfig'

import { OFFICIAL_LINKS } from './constants/branding'
import { BacktestPage } from './components/BacktestPage'
import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  Exchange,
} from './types'

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



function App() {
  const { language, setLanguage } = useLanguage()
  const { user, token, logout, isLoading } = useAuth()
  const { loading: configLoading } = useSystemConfig()
  const { theme } = useTheme()
  const { setThemeMode } = useAppKitTheme()
  const [route, setRoute] = useState(window.location.pathname)

  useEffect(() => {
    setThemeMode('dark')
  }, [setThemeMode])

  // Debug log
  useEffect(() => {
    console.log('[App] Mounted. Route:', window.location.pathname);
  }, []);

  // Read the initial page state from the URL path (supports refreshing the page)
  const getInitialPage = (): Page => {
    const path = window.location.pathname
    const hash = window.location.hash.slice(1) // Remove #

    if (path === '/traders' || hash === 'traders') return 'traders'
    if (path === '/backtest' || hash === 'backtest') return 'backtest'
    if (path === '/strategy' || hash === 'strategy') return 'strategy'
    if (path === '/strategy-market' || hash === 'strategy-market') return 'strategy-market'
    if (path === '/data' || hash === 'data') return 'data'
    if (path === '/debate' || hash === 'debate') return 'debate'
    if (path === '/dashboard' || hash === 'trader' || hash === 'details')
      return 'trader'
    return 'competition' // Defaults to contest page
  }

  // Login required overlay state
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')

  const handleLoginRequired = (featureName: string) => {
    setLoginOverlayFeature(featureName)
    setLoginOverlayOpen(true)
  }

  // Unified page navigation handler
  const navigateToPage = (page: Page) => {
    const pathMap: Record<Page, string> = {
      'competition': '/competition',
      'strategy-market': '/strategy-market',
      'data': '/data',
      'traders': '/traders',
      'trader': '/dashboard',
      'backtest': '/backtest',
      'strategy': '/strategy',
      'debate': '/debate',
      'faq': '/faq',
      'login': '/login',
      'register': '/register',
      'tokenomics': '/tokenomics',
      'upgrade': '/upgrade',
    }
    const path = pathMap[page]
    if (path) {
      window.history.pushState({}, '', path)
      setRoute(path)
      setCurrentPage(page)
    }
  }

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage())
  // Read the initial trader ID from the URL parameter (format: first 4 digits of name-id)
  const [selectedTraderSlug, setSelectedTraderSlug] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('trader') || undefined
  })
  const [selectedTraderId, setSelectedTraderId] = useState<string | undefined>()

  // Generate trader URL slug (name + first 4 digits of ID)
  const getTraderSlug = (trader: TraderInfo) => {
    const idPrefix = trader.trader_id.slice(0, 4)
    return `${trader.trader_name}-${idPrefix}`
  }

  // Parse and match trader from slug
  const findTraderBySlug = (slug: string, traderList: TraderInfo[]) => {
    // Slug format: name-xxxx (xxxx is the first 4 digits of the ID)
    const lastDashIndex = slug.lastIndexOf('-')
    if (lastDashIndex === -1) {
      // Without dash, match directly by name
      return traderList.find(t => t.trader_name === slug)
    }
    const name = slug.slice(0, lastDashIndex)
    const idPrefix = slug.slice(lastDashIndex + 1)
    return traderList.find(t =>
      t.trader_name === name && t.trader_id.startsWith(idPrefix)
    )
  }
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  const [decisionsLimit, setDecisionsLimit] = useState<number>(5)

  // Monitor URL changes and synchronize page status
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(window.location.search)
      const traderParam = params.get('trader')

      if (path === '/traders' || hash === 'traders') {
        setCurrentPage('traders')
      } else if (path === '/backtest' || hash === 'backtest') {
        setCurrentPage('backtest')
      } else if (path === '/strategy' || hash === 'strategy') {
        setCurrentPage('strategy')
      } else if (path === '/strategy-market' || hash === 'strategy-market') {
        setCurrentPage('strategy-market')
      } else if (path === '/data' || hash === 'data') {
        setCurrentPage('data')
      } else if (path === '/debate' || hash === 'debate') {
        setCurrentPage('debate')
      } else if (
        path === '/dashboard' ||
        hash === 'trader' ||
        hash === 'details'
      ) {
        setCurrentPage('trader')
        // If there is a trader parameter (slug format) in the URL, update the selected trader
        if (traderParam) {
          setSelectedTraderSlug(traderParam)
        }
      } else if (
        path === '/competition' ||
        hash === 'competition' ||
        hash === ''
      ) {
        setCurrentPage('competition')
      }
      setRoute(path)
    }

    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // Update the URL hash when switching pages (setCurrentPage is currently called directly through the button, this function is temporarily reserved for future expansion)
  // const navigateToPage = (page: Page) => {
  //   setCurrentPage(page);
  //   window.location.hash = page === 'competition' ? '' : 'trader';
  // };

  // Get trader list (only when user is logged in)
  const { data: traders, error: tradersError } = useSWR<TraderInfo[]>(
    user && token ? 'traders' : null,
    api.getTraders,
    {
      refreshInterval: 10000,
      shouldRetryOnError: false, // Avoid infinite retries when the backend is not running
    }
  )

  // Get the exchanges list (used to display exchange names)
  const { data: exchanges } = useSWR<Exchange[]>(
    user && token ? 'exchanges' : null,
    api.getExchangeConfigs,
    {
      refreshInterval: 60000, // Refresh once every 1 minute
      shouldRetryOnError: false,
    }
  )

  // After obtaining the traders, set the selected trader according to the trader slug in the URL, or select the first one by default
  useEffect(() => {
    if (traders && traders.length > 0 && !selectedTraderId) {
      if (selectedTraderSlug) {
        // Find the corresponding trader through slug
        const trader = findTraderBySlug(selectedTraderSlug, traders)
        if (trader) {
          setSelectedTraderId(trader.trader_id)
        } else {
          // If not found, select the first one
          setSelectedTraderId(traders[0].trader_id)
        }
      } else {
        setSelectedTraderId(traders[0].trader_id)
      }
    }
  }, [traders, selectedTraderId, selectedTraderSlug])

  // If you are on the trader page, get the data of the trader
  const { data: status } = useSWR<SystemStatus>(
    currentPage === 'trader' && selectedTraderId
      ? `status-${selectedTraderId}`
      : null,
    () => api.getStatus(selectedTraderId),
    {
      refreshInterval: 15000, // 15 seconds refresh (with backend 15 seconds cache)
      revalidateOnFocus: false, // Disable revalidation when focusing, reducing requests
      dedupingInterval: 10000, // Deduplication in 10 seconds to prevent repeated requests within a short period of time
    }
  )

  const { data: account } = useSWR<AccountInfo>(
    currentPage === 'trader' && selectedTraderId
      ? `account-${selectedTraderId}`
      : null,
    () => api.getAccount(selectedTraderId),
    {
      refreshInterval: 15000, // 15 seconds refresh (with backend 15 seconds cache)
      revalidateOnFocus: false, // Disable revalidation when focusing, reducing requests
      dedupingInterval: 10000, // Deduplication in 10 seconds to prevent repeated requests within a short period of time
    }
  )

  const { data: positions } = useSWR<Position[]>(
    currentPage === 'trader' && selectedTraderId
      ? `positions-${selectedTraderId}`
      : null,
    () => api.getPositions(selectedTraderId),
    {
      refreshInterval: 15000, // 15 seconds refresh (with backend 15 seconds cache)
      revalidateOnFocus: false, // Disable revalidation when focusing, reducing requests
      dedupingInterval: 10000, // Deduplication in 10 seconds to prevent repeated requests within a short period of time
    }
  )

  const { data: decisions } = useSWR<DecisionRecord[]>(
    currentPage === 'trader' && selectedTraderId
      ? `decisions/latest-${selectedTraderId}-${decisionsLimit}`
      : null,
    () => api.getLatestDecisions(selectedTraderId, decisionsLimit),
    {
      refreshInterval: 30000, // Refresh in 30 seconds (decisions are updated less frequently)
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  const { data: stats } = useSWR<Statistics>(
    currentPage === 'trader' && selectedTraderId
      ? `statistics-${selectedTraderId}`
      : null,
    () => api.getStatistics(selectedTraderId),
    {
      refreshInterval: 30000, // Refresh in 30 seconds (statistics are updated less frequently)
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  useEffect(() => {
    if (account) {
      const now = new Date().toLocaleTimeString()
      setLastUpdate(now)
    }
  }, [account])

  const selectedTrader = traders?.find((t) => t.trader_id === selectedTraderId)

  // Handle routing
  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Set current page based on route for consistent navigation state
  useEffect(() => {
    if (route === '/competition') {
      setCurrentPage('competition')
    } else if (route === '/traders') {
      setCurrentPage('traders')
    } else if (route === '/dashboard') {
      setCurrentPage('trader')
    } else if (route === '/data') {
      setCurrentPage('data')
    } else if (route === '/strategy') {
      setCurrentPage('strategy')
    } else if (route === '/strategy-market') {
      setCurrentPage('strategy-market')
    } else if (route === '/backtest') {
      setCurrentPage('backtest')
    } else if (route === '/debate') {
      setCurrentPage('debate')
    }
  }, [route])

  // Show loading spinner while checking auth or config
  if (isLoading || configLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--surface-primary)' }}
      >
        <img
          src="/logo.png"
          alt="OKO Logo"
          className="w-16 h-auto hero-logo-mark"
          style={{ opacity: 1, filter: theme === 'light' ? 'invert(1)' : 'none' }}
        />
      </div>
    )
  }

  // Handle specific routes regardless of authentication
  if (route === '/login') {
    return <LoginPage />
  }
  if (route === '/register') {
    return <RegisterPage />
  }
  if (route === '/faq' || route === '/docs') {
    return (
      <div
        className="min-h-screen"
        style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}
      >
        <HeaderBar
          isLoggedIn={!!user}
          currentPage="faq"
          language={language}
          onLanguageChange={setLanguage}
          user={user}
          onLogout={logout}
          onLoginRequired={handleLoginRequired}
          onPageChange={navigateToPage}
        />
        <DocsPage />
        <LoginRequiredOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          featureName={loginOverlayFeature}
        />
      </div>
    )
  }
  if (route === '/reset-password') {
    return <ResetPasswordPage />
  }
  if (route === '/trade') {
    return <TradePage />
  }
  if (route === '/tokenomics') {
    return <TokenomicsPage />
  }
  if (route === '/upgrade') {
    return <UpgradePage />
  }
  // Data page - publicly accessible even without login
  if (route === '/data' && (!user || !token)) {
    return (
      <div
        className="min-h-screen"
        style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}
      >
        <HeaderBar
          isLoggedIn={false}
          currentPage="data"
          language={language}
          onLanguageChange={setLanguage}
          user={null}
          onLogout={logout}
          onLoginRequired={handleLoginRequired}
          onPageChange={navigateToPage}
        />
        <main className="pt-16">
          <DataPage />
        </main>
        <LoginRequiredOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          featureName={loginOverlayFeature}
        />
      </div>
    )
  }
  // Show landing page for root route
  if (route === '/' || route === '') {
    return <LandingPage />
  }

  // Redirect unauthenticated users to login
  if (!user || !token) {
    window.history.replaceState({}, '', '/login')
    return <LoginPage />
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}
    >
      <HeaderBar
        isLoggedIn={!!user}
        currentPage={currentPage as Parameters<typeof HeaderBar>[0]['currentPage']}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={handleLoginRequired}
        onPageChange={navigateToPage}
      />

      {/* Main Content with Page Transitions */}
      <main className="min-h-screen pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {currentPage === 'competition' ? (
              <CompetitionPage />
            ) : currentPage === 'data' ? (
              <DataPage />
            ) : currentPage === 'strategy-market' ? (
              <StrategyMarketPage />
            ) : currentPage === 'traders' ? (
              <AITradersPage
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  window.history.pushState({}, '', '/dashboard')
                  setRoute('/dashboard')
                  setCurrentPage('trader')
                }}
              />
            ) : currentPage === 'backtest' ? (
              <BacktestPage />
            ) : currentPage === 'strategy' ? (
              <StrategyStudioPage />
            ) : currentPage === 'debate' ? (
              <DebateArenaPage />
            ) : (
              <TraderDashboardPage
                selectedTrader={selectedTrader}
                status={status}
                account={account}
                positions={positions}
                decisions={decisions}
                decisionsLimit={decisionsLimit}
                onDecisionsLimitChange={setDecisionsLimit}
                stats={stats}
                lastUpdate={lastUpdate}
                language={language}
                traders={traders}
                tradersError={tradersError}
                selectedTraderId={selectedTraderId}
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  // Update URL parameters (use slug: first 4 digits of name-id)
                  const trader = traders?.find(t => t.trader_id === traderId)
                  if (trader) {
                    const url = new URL(window.location.href)
                    url.searchParams.set('trader', getTraderSlug(trader))
                    window.history.replaceState({}, '', url.toString())
                  }
                }}
                onNavigateToTraders={() => {
                  window.history.pushState({}, '', '/traders')
                  setRoute('/traders')
                  setCurrentPage('traders')
                }}
                exchanges={exchanges}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer - Hidden on debate page */}
      {currentPage !== 'debate' && (
        <footer
          className="mt-16"
          style={{ borderTop: '1px solid var(--footer-border)', background: 'var(--footer-bg)' }}
        >
          <div
            className="max-w-[1920px] mx-auto px-6 py-6 text-center text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <p>{t('footerTitle', language)}</p>
            <p className="mt-1">{t('footerWarning', language)}</p>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              {[
                {
                  href: OFFICIAL_LINKS.github,
                  label: 'GitHub',
                  icon: <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>,
                },
                {
                  href: OFFICIAL_LINKS.twitter,
                  label: 'Twitter',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
                },
                {
                  href: OFFICIAL_LINKS.telegram,
                  label: 'Telegram',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>,
                },
              ].map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: 'var(--surface-secondary)',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--panel-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.borderColor = 'var(--surface-tertiary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                    e.currentTarget.style.borderColor = 'var(--panel-border)'
                  }}
                >
                  {icon}{label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      )}

      {/* Login Required Overlay */}
      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />
    </div>
  )
}


// Wrap App with providers
export default function AppWithProviders() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ConfirmDialogProvider>
            <App />
          </ConfirmDialogProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
