import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const exchanges = [
  { name: 'Binance', icon: '/exchange-icons/binance.jpeg' },
  { name: 'Bybit', icon: '/exchange-icons/bybit.png' },
  { name: 'OKX', icon: '/exchange-icons/okx.svg' },
  { name: 'Bitget', icon: '/exchange-icons/bitget.svg' },
  { name: 'Gate.io', icon: '/exchange-icons/gate.svg' },
  { name: 'KuCoin', icon: '/exchange-icons/kucoin.svg' },
  { name: 'Hyperliquid', icon: '/exchange-icons/hyperliquid.png' },
  { name: 'Aster DEX', icon: '/exchange-icons/aster.svg' },
  { name: 'Lighter', icon: '/exchange-icons/lighter.png' },
]

const aiModels = [
  { name: 'DeepSeek', icon: '/icons/deepseek.svg' },
  { name: 'OpenAI', icon: '/icons/openai.svg' },
  { name: 'Claude', icon: '/icons/claude.svg' },
  { name: 'Gemini', icon: '/icons/gemini.svg' },
  { name: 'Grok', icon: '/icons/grok.svg' },
  { name: 'Qwen', icon: '/icons/qwen.svg' },
  { name: 'Kimi', icon: '/icons/kimi.svg' },
]

interface TerminalHeroProps {
  onProductChoice?: (product: 'wallet' | 'trader') => void
}

export default function TerminalHero({ onProductChoice }: TerminalHeroProps) {
  const content = {
      tagline: 'One platform. Two AI-powered products.',
      headline: 'AI-powered',
      headlineAccent: 'trading & wallet',
      description: 'OKO combines autonomous AI trading with intelligent wallet analysis. Deploy LLM-driven agents across 10+ exchanges, or connect your wallet for AI insights on holdings, historical performance, and swap suggestions.',
      walletTitle: 'AI Wallet Analyzer',
      walletDesc: 'Connect your wallet or enter an address. Get AI analysis of your holdings, historical price context, and personalized swap recommendations.',
      traderTitle: 'AI Trader',
      traderDesc: 'Deploy autonomous trading agents powered by DeepSeek, GPT, Claude, and more. Multi-exchange, backtesting, strategy market, and full control.',
      exchangesLabel: 'Supported Exchanges',
      aiLabel: 'AI Models',
    }

  const t = content

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden"
    >
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
          className="text-sm font-medium uppercase tracking-widest mb-4"
          style={{ color: 'var(--accent-primary)' }}
        >
          {t.tagline}
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          {t.headline}
          <br />
          <span style={{ color: 'var(--accent-primary)' }}>{t.headlineAccent}</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t.description}
        </motion.p>

        {/* Two product entry points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          {onProductChoice ? (
            <>
              <motion.button
                onClick={() => onProductChoice('wallet')}
                className="flex flex-col items-center gap-3 px-6 py-5 rounded-xl font-semibold text-sm transition-all border-2 text-left sm:text-center"
                style={{
                  background: 'var(--surface-primary)',
                  borderColor: 'var(--surface-tertiary)',
                  color: 'var(--text-primary)',
                }}
                whileHover={{
                  borderColor: 'var(--accent-primary)',
                  scale: 1.02,
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2 w-full justify-center sm:justify-center">
                  <span>{t.walletTitle}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </div>
                <p className="text-xs font-normal leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t.walletDesc}
                </p>
              </motion.button>
              <motion.button
                onClick={() => onProductChoice('trader')}
                className="flex flex-col items-center gap-3 px-6 py-5 rounded-xl font-semibold text-sm transition-all border-2 text-left sm:text-center"
                style={{
                  background: 'var(--surface-primary)',
                  borderColor: 'var(--surface-tertiary)',
                  color: 'var(--text-primary)',
                }}
                whileHover={{
                  borderColor: 'var(--accent-primary)',
                  scale: 1.02,
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2 w-full justify-center sm:justify-center">
                  <span>{t.traderTitle}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </div>
                <p className="text-xs font-normal leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t.traderDesc}
                </p>
              </motion.button>
            </>
          ) : (
            <a
              href="#market-scanner"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
              }}
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </motion.div>

        {/* Exchanges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            {t.exchangesLabel}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {exchanges.map((ex) => (
              <div
                key={ex.name}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}
              >
                <img src={ex.icon} alt={ex.name} className="w-4 h-4 rounded-sm object-contain" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ex.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Models */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            {t.aiLabel}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {aiModels.map((model) => (
              <div
                key={model.name}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}
              >
                <img src={model.icon} alt={model.name} className="w-4 h-4 object-contain" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{model.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
