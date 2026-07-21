import { describe, expect, it } from 'vitest'
import { buildExchangeConfigUpdateRequest } from './exchangeConfigs'

describe('buildExchangeConfigUpdateRequest', () => {
  it('omits blank credentials so an edit preserves stored secrets', () => {
    const request = buildExchangeConfigUpdateRequest('exchange-1', {
      accountName: 'Primary account',
      enabled: true,
      testnet: true,
    })

    expect(request.exchanges['exchange-1']).toEqual({
      account_name: 'Primary account',
      enabled: true,
      testnet: true,
      hyperliquid_wallet_addr: '',
      aster_user: '',
      aster_signer: '',
      lighter_wallet_addr: '',
      lighter_api_key_index: 0,
    })
  })

  it('includes only credentials that should be replaced', () => {
    const request = buildExchangeConfigUpdateRequest('exchange-1', {
      accountName: 'Primary account',
      enabled: true,
      apiKey: 'new-api-key',
      secretKey: 'new-secret-key',
    })

    expect(request.exchanges['exchange-1']).toMatchObject({
      api_key: 'new-api-key',
      secret_key: 'new-secret-key',
    })
    expect(request.exchanges['exchange-1']).not.toHaveProperty('passphrase')
  })
})
