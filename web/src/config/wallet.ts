import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  solana,
} from '@reown/appkit/networks'
import { QueryClient } from '@tanstack/react-query'
import type { AppKitNetwork } from '@reown/appkit-common'

// Get projectId from https://dashboard.reown.com (formerly WalletConnect Cloud)
const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || 'a134ef324774906f376e04c3451f3925'

if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is required for wallet connection')
}

const metadata = {
  name: 'OKO',
  description: 'AI Wallet Analyzer & Trading',
  url:
    typeof window !== 'undefined' ? window.location.origin : 'https://oko.com',
  icons: ['/logo.png'],
}

const networks = [
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  solana,
] as [AppKitNetwork, ...AppKitNetwork[]]

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
})
const solanaAdapter = new SolanaAdapter()

export const queryClient = new QueryClient()

createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  projectId,
  metadata,
  themeMode: 'dark',
  allowUnsupportedChain: true,
  themeVariables: {
    '--apkt-accent': '#154a4a',
    '--apkt-color-mix': '#154a4a',
    '--apkt-color-mix-strength': 40,
    '--apkt-font-family': 'Inter, sans-serif',
    '--apkt-border-radius-master': '12px',
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
  ],
  includeWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
  ],
  features: {
    analytics: false,
  },
})

export { wagmiAdapter }
