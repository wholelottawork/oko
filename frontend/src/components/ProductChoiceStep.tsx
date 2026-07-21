import { motion } from 'framer-motion'
import { Wallet, Bot } from 'lucide-react'
import type { Language } from '../i18n/translations'
import { setAuthIntent, type AuthIntent } from './landing/LoginModal'

interface ProductChoiceStepProps {
  language: Language
  onChoice: (intent: AuthIntent) => void
  title?: string
  subtitle?: string
}

export function ProductChoiceStep({
  language,
  onChoice,
  title,
  subtitle,
}: ProductChoiceStepProps) {
  const defaultTitle = language === 'zh' ? '选择您的路径' : 'Choose your path'
  const defaultSubtitle =
    language === 'zh' ? '登录后您将进入所选产品' : 'You will be taken to your chosen product after sign in'

  const handleChoice = (intent: AuthIntent) => {
    setAuthIntent(intent)
    onChoice(intent)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title ?? defaultTitle}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {subtitle ?? defaultSubtitle}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.button
          onClick={() => handleChoice('wallet')}
          className="flex flex-col items-center gap-3 p-5 rounded-xl text-left border transition-colors"
          style={{
            background: 'var(--surface-secondary)',
            borderColor: 'var(--surface-tertiary)',
            color: 'var(--text-primary)',
          }}
          whileHover={{
            borderColor: 'var(--accent-primary)',
            scale: 1.02,
          }}
          whileTap={{ scale: 0.98 }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-primary)' }}
          >
            <Wallet className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="w-full">
            <div className="font-semibold text-sm mb-0.5">
              {language === 'zh' ? 'AI 钱包分析' : 'AI Wallet Analyzer'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {language === 'zh' ? '分析持仓、获取兑换建议' : 'Analyze holdings, get swap suggestions'}
            </div>
          </div>
        </motion.button>
        <motion.button
          onClick={() => handleChoice('trader')}
          className="flex flex-col items-center gap-3 p-5 rounded-xl text-left border transition-colors"
          style={{
            background: 'var(--surface-secondary)',
            borderColor: 'var(--surface-tertiary)',
            color: 'var(--text-primary)',
          }}
          whileHover={{
            borderColor: 'var(--accent-primary)',
            scale: 1.02,
          }}
          whileTap={{ scale: 0.98 }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-primary)' }}
          >
            <Bot className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="w-full">
            <div className="font-semibold text-sm mb-0.5">
              {language === 'zh' ? 'AI 交易员' : 'AI Trader'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {language === 'zh' ? '配置交易员、运行策略' : 'Configure traders, run strategies'}
            </div>
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
}
