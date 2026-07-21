import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { SwapIntent } from './SwapCard'
import { SwapCard } from './SwapCard'
import { useAppKitAccount } from '@reown/appkit/react'

interface InlineSwapWidgetProps {
  intent: SwapIntent
  language?: 'en' | 'zh'
}

export function InlineSwapWidget({ intent, language = 'en' }: InlineSwapWidgetProps) {
  const [open, setOpen] = useState(true)
  const { address: connectedAddress } = useAppKitAccount()
  const isSend = !!intent.toAddress

  const amountLabel = ['all', 'max', 'everything'].includes(intent.amount?.toLowerCase?.() ?? '') ? 'all' : intent.amount
  const label = isSend
    ? (language === 'zh' ? `发送 ${amountLabel} ${intent.fromToken}` : `Send ${amountLabel} ${intent.fromToken}`)
    : (language === 'zh' ? `兑换 ${amountLabel} ${intent.fromToken} → ${intent.toToken}` : `Swap ${amountLabel} ${intent.fromToken} → ${intent.toToken}`)

  return (
    <div className="mt-2 w-full">
      {/* Collapse toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 mb-1.5 text-xs transition-opacity hover:opacity-80"
        style={{ color: 'var(--accent-primary)' }}
      >
        {open
          ? <ChevronUp className="w-3.5 h-3.5" />
          : <ChevronDown className="w-3.5 h-3.5" />}
        <span className="font-medium">{label}</span>
      </button>

      {open && (
        <SwapCard
          intent={intent}
          address={connectedAddress}
          language={language}
          destAddressOverride={intent.toAddress}
        />
      )}
    </div>
  )
}
