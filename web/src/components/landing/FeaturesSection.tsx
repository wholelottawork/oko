import { motion } from 'framer-motion'
import { Brain, Swords, BarChart3, Shield, Blocks, LineChart } from 'lucide-react'
import { t, Language } from '../../i18n/translations'

interface FeaturesSectionProps {
  language: Language
}

export default function FeaturesSection({ language }: FeaturesSectionProps) {
  const features = [
    {
      icon: Brain,
      title: 'AI Strategy Orchestration',
      desc: 'Support DeepSeek, GPT, Claude, Qwen and more. Custom prompts, AI autonomously analyzes markets and makes trading decisions',
      highlight: true,
      badge: 'Core',
    },
    {
      icon: Swords,
      title: 'Multi-AI Arena',
      desc: 'Multiple AI traders compete in real-time, live PnL leaderboard, automatic survival of the fittest',
      highlight: true,
      badge: 'Unique',
    },
    {
      icon: LineChart,
      title: 'Pro Quant Data',
      desc: 'Integrated candlesticks, indicators, order book, funding rates, open interest - comprehensive data for AI decisions',
      highlight: true,
      badge: 'Pro',
    },
    {
      icon: Blocks,
      title: 'Multi-Exchange Support',
      desc: 'Binance, OKX, Bybit, Hyperliquid, Aster DEX - one system, multiple exchanges',
    },
    {
      icon: BarChart3,
      title: 'Real-time Dashboard',
      desc: 'Trade monitoring, PnL curves, position analysis, AI decision logs at a glance',
    },
    {
      icon: Shield,
      title: 'Open Source & Self-Hosted',
      desc: 'Fully open source, data stored locally, API keys never leave your server',
    },
  ]

  return (
    <section className="py-24 relative" style={{ background: 'var(--surface-primary)' }}>
      {/* Background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(var(--nofx-gold) 1px, transparent 1px), linear-gradient(90deg, var(--nofx-gold) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('whyChooseNofx', language)}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {'Not just a trading bot, but a complete AI trading operating system'}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative group rounded-2xl p-6 transition-all duration-300
                ${feature.highlight ? 'md:col-span-1 lg:col-span-1' : ''}
              `}
              style={{
                background: feature.highlight
                  ? 'linear-gradient(135deg, var(--accent-primary-bg) 0%, var(--accent-primary-bg) 100%)'
                  : '#12161C',
                border: feature.highlight
                  ? '1px solid var(--nofx-border)'
                  : '1px solid var(--glass-border)',
              }}
            >
              {/* Badge */}
              {feature.badge && (
                <div
                  className="absolute top-4 right-4 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    background: 'var(--nofx-border)',
                    color: 'var(--nofx-gold)',
                  }}
                >
                  {feature.badge}
                </div>
              )}

              {/* Icon */}
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: feature.highlight
                    ? 'var(--nofx-border)'
                    : 'var(--nofx-border)',
                  border: '1px solid var(--nofx-border)',
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <feature.icon
                  className="w-6 h-6"
                  style={{ color: 'var(--nofx-gold)' }}
                />
              </motion.div>

              {/* Text */}
              <h3
                className="text-xl font-bold mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {feature.desc}
              </p>

              {/* Hover Glow */}
              <div
                className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{ background: 'var(--nofx-gold)' }}
              />
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {[
            { value: '10+', label: 'AI Models' },
            { value: '5+', label: 'Exchanges' },
            { value: '24/7', label: 'Auto Trading' },
            { value: '100%', label: 'Open Source' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div
                className="text-2xl font-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, var(--nofx-gold) 0%, var(--accent-primary-hover) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
