import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { t, Language } from '../../i18n/translations'
import { useSystemConfig } from '../../hooks/useSystemConfig'
import { ProductChoiceStep } from '../ProductChoiceStep'

const AUTH_INTENT_KEY = 'authIntent'

export type AuthIntent = 'wallet' | 'trader'

export function setAuthIntent(intent: AuthIntent) {
  sessionStorage.setItem(AUTH_INTENT_KEY, intent)
}

export function getAuthIntent(): AuthIntent | null {
  const v = sessionStorage.getItem(AUTH_INTENT_KEY)
  return (v === 'wallet' || v === 'trader') ? v : null
}

export function clearAuthIntent() {
  sessionStorage.removeItem(AUTH_INTENT_KEY)
}

interface LoginModalProps {
  onClose: () => void
  language: Language
  initialIntent?: AuthIntent | null
}

export default function LoginModal({ onClose, language, initialIntent }: LoginModalProps) {
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false
  const [step, setStep] = useState<'choice' | 'auth'>(initialIntent ? 'auth' : 'choice')

  const handleChoice = () => {
    setStep('auth')
  }

  const handleSignIn = () => {
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
    onClose()
  }

  const handleRegister = () => {
    window.history.pushState({}, '', '/register')
    window.dispatchEvent(new PopStateEvent('popstate'))
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-w-md w-full rounded-2xl p-8"
        style={{
          background: 'var(--brand-dark-gray)',
          border: '1px solid var(--oko-border)',
        }}
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.button
          onClick={step === 'auth' ? () => setStep('choice') : onClose}
          className="absolute top-4 right-4 flex items-center gap-1"
          style={{ color: 'var(--text-secondary)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {step === 'auth' ? (
            <ArrowLeft className="w-5 h-5" />
          ) : (
            <X className="w-6 h-6" />
          )}
        </motion.button>

        <AnimatePresence mode="wait">
          {step === 'choice' ? (
            <div key="choice" style={{ color: 'var(--brand-light-gray)' }}>
              <ProductChoiceStep language={language} onChoice={handleChoice} />
            </div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h2
                className="text-2xl font-bold mb-6"
                style={{ color: 'var(--brand-light-gray)' }}
              >
                {t('accessOkoPlatform', language)}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {t('loginRegisterPrompt', language)}
              </p>
              <div className="space-y-3">
                <motion.button
                  onClick={handleSignIn}
                  className="block w-full px-6 py-3 rounded-lg font-semibold text-center"
                  style={{
                    background: 'var(--brand-yellow)',
                    color: 'var(--brand-black)',
                  }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: '0 10px 30px var(--accent-primary-glow)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('signIn', language)}
                </motion.button>
                {registrationEnabled && (
                  <motion.button
                    onClick={handleRegister}
                    className="block w-full px-6 py-3 rounded-lg font-semibold text-center"
                    style={{
                      background: 'var(--brand-dark-gray)',
                      color: 'var(--brand-light-gray)',
                      border: '1px solid var(--oko-border)',
                    }}
                    whileHover={{ scale: 1.02, borderColor: 'var(--brand-yellow)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('registerNewAccount', language)}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
