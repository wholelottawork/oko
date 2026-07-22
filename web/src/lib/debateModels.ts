import type { AIModel } from '../types'

export function getAccessibleDebateModels(
  accountModels: AIModel[] | undefined,
  supportedModels: AIModel[] | undefined = []
): AIModel[] {
  const accessibleAccountModels = (accountModels || []).filter(
    (model) => model.enabled || model.hasSystemKey
  )
  const accountProviders = new Set(
    accessibleAccountModels.map((model) => model.provider.toLowerCase())
  )
  const systemModels = supportedModels.filter(
    (model) =>
      model.hasSystemKey && !accountProviders.has(model.provider.toLowerCase())
  )

  return [...systemModels, ...accessibleAccountModels]
}
