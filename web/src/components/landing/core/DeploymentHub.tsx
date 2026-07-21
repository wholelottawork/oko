import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'

export default function DeploymentHub() {
  const [copied, setCopied] = useState(false)
  const installCmd = 'curl -fsSL https://raw.githubusercontent.com/NoFxAiOS/nofx/main/install.sh | bash'

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section
      id="get-started"
      className="py-20 md:py-28"
      style={{
        background: 'var(--surface-primary)',
        borderTop: '1px solid var(--surface-tertiary)',
      }}
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Deploy in seconds
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            One command to install. Runs locally with your own API keys.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl p-6 overflow-hidden"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--surface-tertiary)',
          }}
        >
          <div className="flex items-start gap-4 p-4 rounded-lg">
            <code
              className="flex-1 text-sm font-mono break-all"
              style={{ color: 'var(--text-primary)' }}
            >
              {installCmd}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg transition-all hover:opacity-80 flex items-center gap-1.5 text-sm font-medium"
              style={{
                background: 'var(--surface-tertiary)',
                color: copied ? 'var(--binance-green)' : 'var(--text-secondary)',
              }}
            >
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <p className="text-xs mt-4 px-4" style={{ color: 'var(--text-tertiary)' }}>
            Requires Docker. See{' '}
            <a
              href="https://github.com/NoFxAiOS/nofx/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              documentation
            </a>{' '}
            for details.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
