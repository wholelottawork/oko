import type { UpdateModelConfigRequest } from '../types'

interface ModelConfigUpdate {
  enabled: boolean
  apiKey?: string
  customApiUrl?: string
  customModelName?: string
}

export function buildModelConfigUpdateRequest(
  modelId: string,
  config: ModelConfigUpdate
): UpdateModelConfigRequest {
  const modelConfig: UpdateModelConfigRequest['models'][string] = {
    enabled: config.enabled,
    custom_api_url: config.customApiUrl || '',
    custom_model_name: config.customModelName || '',
  }

  if (config.apiKey !== undefined) {
    modelConfig.api_key = config.apiKey
  }

  return {
    models: {
      [modelId]: modelConfig,
    },
  }
}
