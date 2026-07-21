import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, UserPlus, X, Lock } from 'lucide-react'
import { DeepVoidBackground } from './DeepVoidBackground'

interface LoginRequiredOverlayProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

export function LoginRequiredOverlay({ isOpen, onClose, featureName }: LoginRequiredOverlayProps) {
  const texts = {
      title: 'Sign in required',
      subtitle: featureName ? `"${featureName}" requires sign in` : 'This feature requires sign in',
      description: 'Sign in to access AI Trader configuration, Strategy Market, backtest simulation, and more.',
      benefits: [
        'AI Trader Control',
        'Strategy Market Data',
        'Historical Backtest Engine',
        'Full System Visualization'
      ],
      login: 'Sign in',
      register: 'Create account',
      later: 'Maybe later'
    }

  const t = texts

  const btnPrimary =
    'w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const btnPrimaryStyle = {
    background: 'var(--accent-primary)',
    color: '#fff',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <DeepVoidBackground
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            disableAnimation
            onClick={onClose}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="relative w-full rounded-2xl p-8 shadow-xl"
              style={{
                background: 'var(--surface-primary)',
                border: '1px solid var(--surface-tertiary)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={'Close'}
              >
                <X size={18} />
              </button>

              {/* Logo & heading */}
              <div className="text-center mb-6">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)' }}
                >
                  <Lock className="w-7 h-7" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {t.title}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t.subtitle}
                </p>
              </div>

              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {t.description}
              </p>

              <ul className="space-y-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
                {t.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'var(--surface-tertiary)', color: 'var(--accent-primary)' }}>
                      {i + 1}
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* Action buttons */}
              <div className="space-y-3">
                <a
                  href="/login"
                  className={`flex items-center justify-center gap-2 ${btnPrimary}`}
                  style={btnPrimaryStyle}
                >
                  <LogIn size={18} />
                  {t.login}
                </a>

                <a
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors"
                  style={{
                    background: 'var(--surface-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <UserPlus size={18} />
                  {t.register}
                </a>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={onClose}
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t.later}
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
