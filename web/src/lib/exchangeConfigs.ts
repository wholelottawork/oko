import type { UpdateExchangeConfigRequest } from '../types'

interface ExchangeConfigUpdate {
  accountName: string
  enabled: boolean
  apiKey?: string
  secretKey?: string
  passphrase?: string
  testnet?: boolean
  hyperliquidWalletAddr?: string
  asterUser?: string
  asterSigner?: string
  asterPrivateKey?: string
  lighterWalletAddr?: string
  lighterPrivateKey?: string
  lighterApiKeyPrivateKey?: string
  lighterApiKeyIndex?: number
}

export function buildExchangeConfigUpdateRequest(
  exchangeId: string,
  update: ExchangeConfigUpdate
): UpdateExchangeConfigRequest {
  const config: UpdateExchangeConfigRequest['exchanges'][string] = {
    account_name: update.accountName,
    enabled: update.enabled,
    testnet: update.testnet || false,
    hyperliquid_wallet_addr: update.hyperliquidWalletAddr || '',
    aster_user: update.asterUser || '',
    aster_signer: update.asterSigner || '',
    lighter_wallet_addr: update.lighterWalletAddr || '',
    lighter_api_key_index: update.lighterApiKeyIndex || 0,
  }

  const sensitiveFields = {
    api_key: update.apiKey,
    secret_key: update.secretKey,
    passphrase: update.passphrase,
    aster_private_key: update.asterPrivateKey,
    lighter_private_key: update.lighterPrivateKey,
    lighter_api_key_private_key: update.lighterApiKeyPrivateKey,
  }

  for (const [key, value] of Object.entries(sensitiveFields)) {
    if (value !== undefined) {
      config[key as keyof typeof sensitiveFields] = value
    }
  }

  return { exchanges: { [exchangeId]: config } }
}
