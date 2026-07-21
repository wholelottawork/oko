import { motion } from 'framer-motion'
import { useAuth } from '../../../contexts/AuthContext'

const strategies = [
  { name: 'Scalping', desc: 'High-frequency microstructure strategies.', apy: '142%', winRate: '68%', risk: 'High' },
  { name: 'Swing', desc: 'Multi-day trend extraction.', apy: '89%', winRate: '55%', risk: 'Medium' },
  { name: 'Arbitrage', desc: 'Low-risk spatial price equalization.', apy: '24%', winRate: '99%', risk: 'Low' },
]

export default function AgentGrid() {
  const { user } = useAuth()

  const handleGetStarted = () => {
    if (user) window.location.href = '/strategy-market'
    else window.location.href = '/login'
  }

  return (
    <section id="market-scanner" className="py-20 md:py-28" style={{ background: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Strategy templates
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Pre-configured strategies you can deploy. Customize prompts, timeframes, and risk parameters.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {strategies.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-6"
              style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
            >
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{s.name}</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>APY</div>
                  <div className="font-semibold" style={{ color: 'var(--binance-green)' }}>{s.apy}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Win rate</div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.winRate}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Risk</div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.risk}</div>
                </div>
              </div>
              <button
                onClick={handleGetStarted}
                className="w-full py-3 rounded-lg font-medium text-sm"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                Get started
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-12">
          <button
            onClick={handleGetStarted}
            className="inline-flex px-6 py-3 rounded-lg font-medium text-sm"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-primary)' }}
          >
            View all strategies
          </button>
        </motion.div>
      </div>
    </section>
  )
}
