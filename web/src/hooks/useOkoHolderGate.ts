import { useEffect, useMemo, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { api } from '../lib/api'
import { useSystemConfig } from './useSystemConfig'
import {
  UPGRADE_CHAIN_ID,
  UPGRADE_CHAIN_NAME,
  UPGRADE_MIN_TOKEN_BALANCE_FALLBACK,
} from '../lib/upgradeConfig'

type GateStatus =
  | 'disconnected'
  | 'unconfigured'
  | 'checking'
  | 'eligible'
  | 'ineligible'
  | 'error'

export interface OkoHolderGateState {
  status: GateStatus
  address?: string
  tokenAddress: string
  chainId: number
  chainName: string
  threshold: number
  totalBalance: number
  missingBalance: number
  deploymentsChecked: number
  error?: string
  isConnected: boolean
  isEligible: boolean
}

export function useOkoHolderGate(): OkoHolderGateState {
  const { address, isConnected } = useAppKitAccount()
  const { config, loading: configLoading } = useSystemConfig()
  const upgradeConfig = config?.upgrade_gate
  const previewMode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('upgradePreview')
      : null
  const [state, setState] = useState<
    Omit<OkoHolderGateState, 'address' | 'isConnected' | 'isEligible'>
  >({
    status: isConnected ? 'checking' : 'disconnected',
    tokenAddress: '',
    chainId: UPGRADE_CHAIN_ID,
    chainName: UPGRADE_CHAIN_NAME,
    threshold: UPGRADE_MIN_TOKEN_BALANCE_FALLBACK,
    totalBalance: 0,
    missingBalance: UPGRADE_MIN_TOKEN_BALANCE_FALLBACK,
    deploymentsChecked: 0,
  })

  useEffect(() => {
    const threshold =
      upgradeConfig?.threshold ?? UPGRADE_MIN_TOKEN_BALANCE_FALLBACK
    const chainId = upgradeConfig?.chain_id ?? UPGRADE_CHAIN_ID
    const chainName = upgradeConfig?.chain_name ?? UPGRADE_CHAIN_NAME
    const tokenAddress = upgradeConfig?.token_address ?? ''

    if (!isConnected || !address) {
      setState({
        status: 'disconnected',
        tokenAddress,
        chainId,
        chainName,
        threshold,
        totalBalance: 0,
        missingBalance: threshold,
        deploymentsChecked: upgradeConfig?.configured ? 1 : 0,
      })
      return
    }

    if (configLoading) {
      setState((prev) => ({ ...prev, status: 'checking' }))
      return
    }

    if (!upgradeConfig?.configured) {
      if (previewMode === 'eligible' || previewMode === 'ineligible') {
        const totalBalance =
          previewMode === 'eligible' ? threshold : threshold / 3
        setState({
          status: previewMode === 'eligible' ? 'eligible' : 'ineligible',
          tokenAddress,
          chainId,
          chainName,
          threshold,
          totalBalance,
          missingBalance: Math.max(0, threshold - totalBalance),
          deploymentsChecked: 0,
        })
        return
      }
      setState({
        status: 'unconfigured',
        tokenAddress,
        chainId,
        chainName,
        threshold,
        totalBalance: 0,
        missingBalance: threshold,
        deploymentsChecked: 0,
      })
      return
    }

    let cancelled = false
    setState((prev) => ({
      ...prev,
      status: 'checking',
      tokenAddress,
      chainId,
      chainName,
      threshold,
      deploymentsChecked: 1,
      error: undefined,
    }))
    ;(async () => {
      try {
        const response = await api.getUpgradeEligibility(address)
        if (cancelled) return

        if (!response.configured) {
          setState({
            status: 'unconfigured',
            tokenAddress: '',
            chainId: response.chainId,
            chainName: response.chainName,
            threshold: response.threshold,
            totalBalance: 0,
            missingBalance: response.threshold,
            deploymentsChecked: 0,
          })
          return
        }

        setState({
          status: response.eligible ? 'eligible' : 'ineligible',
          tokenAddress: response.tokenAddress,
          chainId: response.chainId,
          chainName: response.chainName,
          threshold: response.threshold,
          totalBalance: response.totalBalance,
          missingBalance:
            response.missingBalance ??
            Math.max(0, response.threshold - response.totalBalance),
          deploymentsChecked: 1,
        })
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to read the Robinhood Chain token balance'
        const friendlyMessage = message
          .toLowerCase()
          .includes('valid evm address')
          ? 'Connected wallet is not a valid EVM address. Connect the wallet that holds your OKO on Robinhood Chain.'
          : message
        setState({
          status: 'error',
          tokenAddress,
          chainId,
          chainName,
          threshold,
          totalBalance: 0,
          missingBalance: threshold,
          deploymentsChecked: 1,
          error: friendlyMessage,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, configLoading, isConnected, previewMode, upgradeConfig])

  return useMemo(
    () => ({
      ...state,
      address,
      isConnected,
      isEligible: state.status === 'eligible',
    }),
    [address, isConnected, state]
  )
}
