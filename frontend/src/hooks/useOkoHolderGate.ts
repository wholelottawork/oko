import { useEffect, useMemo, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { api } from '../lib/api'
import {
  UPGRADE_MIN_OKO_BALANCE,
  OKO_SOLANA_MINT,
  isSolanaMintConfigured,
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
  const previewMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('upgradePreview')
    : null
  const [state, setState] = useState<Omit<OkoHolderGateState, 'address' | 'isConnected' | 'isEligible'>>({
    status: isConnected ? 'checking' : 'disconnected',
    threshold: UPGRADE_MIN_OKO_BALANCE,
    totalBalance: 0,
    missingBalance: UPGRADE_MIN_OKO_BALANCE,
    deploymentsChecked: 0,
  })

  useEffect(() => {
    if (!isConnected || !address) {
      setState({
        status: 'disconnected',
        threshold: UPGRADE_MIN_OKO_BALANCE,
        totalBalance: 0,
        missingBalance: UPGRADE_MIN_OKO_BALANCE,
        deploymentsChecked: isSolanaMintConfigured() ? 1 : 0,
      })
      return
    }
    if (!isSolanaMintConfigured()) {
      if (previewMode === 'eligible' || previewMode === 'ineligible') {
        const totalBalance = previewMode === 'eligible' ? UPGRADE_MIN_OKO_BALANCE : UPGRADE_MIN_OKO_BALANCE / 3
        setState({
          status: previewMode === 'eligible' ? 'eligible' : 'ineligible',
          threshold: UPGRADE_MIN_OKO_BALANCE,
          totalBalance,
          missingBalance: Math.max(0, UPGRADE_MIN_OKO_BALANCE - totalBalance),
          deploymentsChecked: 0,
        })
        return
      }
      setState({
        status: 'unconfigured',
        threshold: UPGRADE_MIN_OKO_BALANCE,
        totalBalance: 0,
        missingBalance: UPGRADE_MIN_OKO_BALANCE,
        deploymentsChecked: 0,
      })
      return
    }

    let cancelled = false
    setState((prev) => ({
      ...prev,
      status: 'checking',
      threshold: UPGRADE_MIN_OKO_BALANCE,
      deploymentsChecked: 1,
      error: undefined,
    }))

    ;(async () => {
      try {
        const response = await api.getSolanaTokenBalance(address, OKO_SOLANA_MINT)
        const totalBalance = response.totalBalance || 0

        if (cancelled) return
        const isEligible = totalBalance >= UPGRADE_MIN_OKO_BALANCE
        setState({
          status: isEligible ? 'eligible' : 'ineligible',
          threshold: UPGRADE_MIN_OKO_BALANCE,
          totalBalance,
          missingBalance: Math.max(0, UPGRADE_MIN_OKO_BALANCE - totalBalance),
          deploymentsChecked: 1,
        })
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to read OKO Solana balances'
        const friendlyMessage = message.includes('Non-base58 character') || message.includes('Invalid public key')
          ? 'Connected wallet is not a valid Solana address. Connect the Solana wallet that holds your OKO.'
          : message
        setState({
          status: 'error',
          threshold: UPGRADE_MIN_OKO_BALANCE,
          totalBalance: 0,
          missingBalance: UPGRADE_MIN_OKO_BALANCE,
          deploymentsChecked: 1,
          error: friendlyMessage,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, isConnected, previewMode])

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
