export const UPGRADE_MIN_OKO_BALANCE = 150_000

/**
 * Fill this in once the OKO SPL mint is live on Solana mainnet.
 */
export const OKO_SOLANA_MINT: string = '9HeebAYf3c8PPGXCE4hACkjKe355Q2Du1tJNyNbEpump'

export const UPGRADE_SUPPORTED_CHAINS = [
  { id: '1', label: 'Ethereum' },
  { id: '56', label: 'BNB Chain' },
  { id: '137', label: 'Polygon' },
  { id: '42161', label: 'Arbitrum' },
  { id: '10', label: 'Optimism' },
  { id: '8453', label: 'Base' },
  { id: '43114', label: 'Avalanche' },
] as const

export function isSolanaMintConfigured(): boolean {
  return OKO_SOLANA_MINT !== 'TBA'
}
 