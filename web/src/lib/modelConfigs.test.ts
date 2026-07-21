import { describe, expect, it } from 'vitest'
import { buildModelConfigUpdateRequest } from './modelConfigs'

describe('buildModelConfigUpdateRequest', () => {
  it('updates only the selected model and keys it by model id', () => {
    expect(
      buildModelConfigUpdateRequest('gpt-4o-mini', {
        enabled: true,
        apiKey: 'secret',
        customApiUrl: 'https://example.com/v1',
        customModelName: 'custom-gpt',
      })
    ).toEqual({
      models: {
        'gpt-4o-mini': {
          enabled: true,
          api_key: 'secret',
          custom_api_url: 'https://example.com/v1',
          custom_model_name: 'custom-gpt',
        },
      },
    })
  })

  it('builds a single disabled entry when removing a configuration', () => {
    expect(
      buildModelConfigUpdateRequest('deepseek-chat', {
        enabled: false,
        apiKey: '',
      })
    ).toEqual({
      models: {
        'deepseek-chat': {
          enabled: false,
          api_key: '',
          custom_api_url: '',
          custom_model_name: '',
        },
      },
    })
  })

  it('omits the API key when an edit should preserve the stored credential', () => {
    expect(
      buildModelConfigUpdateRequest('deepseek-chat', {
        enabled: true,
        customModelName: 'deepseek-reasoner',
      })
    ).toEqual({
      models: {
        'deepseek-chat': {
          enabled: true,
          custom_api_url: '',
          custom_model_name: 'deepseek-reasoner',
        },
      },
    })
  })
})
