import { describe, expect, it } from 'vitest'
import type { AIModel } from '../types'
import { getAccessibleDebateModels } from './debateModels'

const model = (overrides: Partial<AIModel>): AIModel => ({
  id: 'model-id',
  name: 'Model',
  provider: 'provider',
  enabled: false,
  ...overrides,
})

describe('getAccessibleDebateModels', () => {
  it('includes system models and enabled account models', () => {
    const systemModel = model({
      id: 'grok',
      provider: 'grok',
      hasSystemKey: true,
    })
    const accountModel = model({
      id: 'user_claude',
      provider: 'claude',
      enabled: true,
    })

    expect(
      getAccessibleDebateModels([accountModel], [systemModel])
    ).toEqual([systemModel, accountModel])
  })

  it('excludes disabled account model records', () => {
    const disabledModel = model({ id: 'old_openai' })

    expect(getAccessibleDebateModels([disabledModel])).toEqual([])
  })

  it('handles models that have not loaded yet', () => {
    expect(getAccessibleDebateModels(undefined)).toEqual([])
  })

  it('prefers the account record when the provider is already represented', () => {
    const systemModel = model({
      id: 'grok',
      provider: 'grok',
      hasSystemKey: true,
    })
    const accountModel = model({
      id: 'user_grok',
      provider: 'grok',
      enabled: true,
      hasSystemKey: true,
    })

    expect(
      getAccessibleDebateModels([accountModel], [systemModel])
    ).toEqual([accountModel])
  })
})
