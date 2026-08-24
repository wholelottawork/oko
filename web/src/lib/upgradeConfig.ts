export const UPGRADE_MIN_TOKEN_BALANCE_FALLBACK = 150_000
export const UPGRADE_CHAIN_NAME = 'Solana'

export const UPGRADE_SUPPORTED_CHAINS = [
  { id: '1', label: 'Ethereum' },
  { id: '56', label: 'BNB Chain' },
  { id: '137', label: 'Polygon' },
  { id: '42161', label: 'Arbitrum' },
  { id: '10', label: 'Optimism' },
  { id: '8453', label: 'Base' },
  { id: '43114', label: 'Avalanche' },
] as const
