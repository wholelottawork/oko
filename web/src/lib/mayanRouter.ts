/**
 * Mayan Finance router — wraps @mayanfinance/swap-sdk behind a
 * getRoute/executeRoute-style contract. This is the ONLY swap/bridge
 * backend SwapCard.tsx uses — Squid (squidRouter.ts) was removed entirely
 * once Mayan was confirmed to cover every chain this app exposes,
 * including pure EVM<->EVM routes (verified live: a Base->Arbitrum quote
 * request returns real SWIFT quotes, no Solana leg required). Chains Mayan
 * doesn't support (Fantom, Celo) are an accepted, documented tradeoff — see
 * .sol_migrate/01-CONTEXT.md.
 *
 * SDK surface verified against the installed @mayanfinance/swap-sdk@15.2.1
 * package's shipped .d.ts (node_modules/@mayanfinance/swap-sdk/dist/index.d.ts)
 * on 2026-08-23, not from memory/docs alone.
 */
import { BrowserProvider, JsonRpcSigner, type Eip1193Provider } from 'ethers'
import type { WalletClient } from 'viem'
import type { Connection, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { Provider as SolanaAppKitProvider } from '@reown/appkit-utils/solana'
import {
  fetchQuote,
  fetchTokenList as fetchMayanTokenList,
  swapFromEvm,
  swapFromSolana,
  addresses,
  type ChainName,
  type Quote,
  type SolanaTransactionSigner,
} from '@mayanfinance/swap-sdk'
export interface ResolvedToken {
  chainId: string
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

/** Mayan Forwarder contract address — the spender for EVM ERC-20 allowance. */
export const MAYAN_FORWARDER_CONTRACT = addresses.MAYAN_FORWARDER_CONTRACT

/**
 * Maps this app's internal chain-id strings (numeric EVM chain ids as
 * strings, or 'solana-mainnet-beta') to Mayan's ChainName enum. Only chains
 * Mayan actually supports are listed; anything else (e.g. Fantom/Celo)
 * can't resolve a non-native token or route a swap at all — an accepted
 * tradeoff, see .sol_migrate/01-CONTEXT.md. Native-token direct sends on
 * those chains still work (SwapCard.tsx's executeDirect native-token branch
 * never calls into this file).
 */
const CHAIN_ID_TO_MAYAN_NAME: Record<string, ChainName> = {
  '1': 'ethereum',
  '56': 'bsc',
  '137': 'polygon',
  '42161': 'arbitrum',
  '10': 'optimism',
  '8453': 'base',
  '43114': 'avalanche',
  'solana-mainnet-beta': 'solana',
}

export function toMayanChainName(chainId: string): ChainName | null {
  if (chainId.toLowerCase().includes('solana')) return 'solana'
  return CHAIN_ID_TO_MAYAN_NAME[chainId] ?? null
}

export function isMayanSupportedChain(chainId: string): boolean {
  return toMayanChainName(chainId) !== null
}

/** Reverse of CHAIN_ID_TO_MAYAN_NAME — Mayan chain name back to this app's internal chain-id string. */
const MAYAN_NAME_TO_CHAIN_ID: Partial<Record<ChainName, string>> = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_MAYAN_NAME).map(([id, name]) => [name, id])
)

const mayanTokenListCache = new Map<ChainName, Promise<import('@mayanfinance/swap-sdk').Token[]>>()

/**
 * Resolve a token symbol to an address on a given Mayan-supported chain,
 * using Mayan's OWN token list (@mayanfinance/swap-sdk's fetchTokenList).
 * Used for every route in this app — EVM<->EVM and Solana-touching alike.
 */
export async function resolveMayanToken(
  symbol: string,
  mayanChain: ChainName
): Promise<ResolvedToken | null> {
  let pending = mayanTokenListCache.get(mayanChain)
  if (!pending) {
    pending = fetchMayanTokenList(mayanChain)
    mayanTokenListCache.set(mayanChain, pending)
  }
  const tokens = await pending
  const sym = symbol.trim().toUpperCase()
  const match = tokens.find((t) => t.symbol?.toUpperCase() === sym)
  if (!match) return null
  const internalChainId = mayanChain === 'solana' ? 'solana-mainnet-beta' : (MAYAN_NAME_TO_CHAIN_ID[mayanChain] ?? mayanChain)
  return {
    chainId: internalChainId,
    address: mayanChain === 'solana' ? match.mint : match.contract,
    symbol: match.symbol,
    name: match.name,
    decimals: match.decimals,
    logoURI: match.logoURI,
  }
}

export interface MayanRoute {
  quote: Quote
  /** This app's internal chain-id string for the source side (e.g. '8453' or 'solana-mainnet-beta'). */
  fromChainId: string
  /** This app's internal chain-id string for the destination side. */
  toChainId: string
  fromDecimals: number
  toDecimals: number
}

export interface GetMayanRouteParams {
  fromChainId: string
  fromToken: string // contract address (EVM) or mint address (Solana)
  fromAmount: string // raw base-unit amount, as a string (e.g. output of parseUnits(...).toString())
  fromDecimals: number
  toChainId: string
  toToken: string
  toDecimals: number
  toAddress: string
  slippageBps?: number
}

/**
 * Fetch a Mayan quote for a route where at least one side is Solana.
 * Mirrors squidRouter.ts's getRoute() shape: returns a route object that
 * executeMayanRoute() can later execute.
 */
export async function getMayanRoute(params: GetMayanRouteParams): Promise<MayanRoute> {
  const fromChain = toMayanChainName(params.fromChainId)
  const toChain = toMayanChainName(params.toChainId)
  if (!fromChain || !toChain) {
    throw new Error(`Mayan does not support this chain pair (${params.fromChainId} -> ${params.toChainId})`)
  }
  const quotes = await fetchQuote({
    amountIn64: params.fromAmount,
    fromToken: params.fromToken,
    fromChain,
    toToken: params.toToken,
    toChain,
    slippageBps: params.slippageBps ?? 100, // 1% default, matches Squid's default
    destinationAddress: params.toAddress,
  })
  if (!quotes || quotes.length === 0) {
    throw new Error('No route found via Mayan for this pair')
  }
  return {
    quote: quotes[0],
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromDecimals: params.fromDecimals,
    toDecimals: params.toDecimals,
  }
}

/**
 * Converts a wagmi/viem WalletClient into an ethers v6 Signer, the shape
 * swapFromEvm() requires. This is the standard wagmi<->ethers adapter
 * pattern (see wagmi's "Ethers Adapters" guide) — viem's WalletClient
 * transport implements the EIP-1193 request() method ethers' BrowserProvider
 * expects, regardless of which connector (injected, WalletConnect, etc.)
 * backs it.
 */
function walletClientToEthersSigner(walletClient: WalletClient): JsonRpcSigner {
  const { account, chain, transport } = walletClient
  if (!account) throw new Error('Wallet client has no connected account')
  const network = chain
    ? { chainId: chain.id, name: chain.name, ensAddress: chain.contracts?.ensRegistry?.address }
    : undefined
  const provider = new BrowserProvider(transport as Eip1193Provider, network)
  return new JsonRpcSigner(provider, account.address)
}

export interface ExecuteMayanRouteOpts {
  /** Required when the route's source side is Solana. */
  solanaProvider?: SolanaAppKitProvider
  solanaConnection?: Connection
  /** Required when the route's source side is EVM. */
  evmWalletClient?: WalletClient
}

/**
 * Executes a Mayan route: signs and sends the transaction on whichever
 * chain the route starts from. Returns a transaction hash / signature in
 * the same `{ hash }` shape squidRouter's execution path resolves to, so
 * SwapCard.tsx's success-state handling doesn't need to branch further.
 */
export async function executeMayanRoute(
  route: MayanRoute,
  swapperAddress: string,
  destinationAddress: string,
  opts: ExecuteMayanRouteOpts
): Promise<{ hash: string }> {
  const sourceIsSolana = route.fromChainId.toLowerCase().includes('solana')

  if (sourceIsSolana) {
    if (!opts.solanaProvider || !opts.solanaConnection) {
      throw new Error('Connect a Solana wallet (e.g. Phantom) to continue')
    }
    const provider = opts.solanaProvider
    // Mayan's SolanaTransactionSigner is an overloaded (Transaction) / (VersionedTransaction)
    // function type; the AppKit provider exposes an equivalent generic
    // `signTransaction<T extends AnyTransaction>(tx: T): Promise<T>` — functionally
    // identical, so this cast is safe (AnyTransaction === Transaction | VersionedTransaction).
    const signTransaction = ((tx: Transaction | VersionedTransaction) =>
      provider.signTransaction(tx)) as unknown as SolanaTransactionSigner

    const result = await swapFromSolana(
      route.quote,
      swapperAddress,
      destinationAddress,
      null,
      signTransaction,
      opts.solanaConnection
    )
    return { hash: result.signature }
  }

  // Source is EVM.
  if (!opts.evmWalletClient) {
    throw new Error('Connect an EVM wallet to continue')
  }
  const signer = walletClientToEthersSigner(opts.evmWalletClient)
  const result = await swapFromEvm(route.quote, swapperAddress, destinationAddress, null, signer, null, null, null)
  const hash = typeof result === 'string' ? result : result.hash
  return { hash }
}
