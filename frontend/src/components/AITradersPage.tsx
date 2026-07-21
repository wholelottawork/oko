import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { api } from '../lib/api'
import type {
  TraderInfo,
  CreateTraderRequest,
  AIModel,
  Exchange,
} from '../types'
import { useLanguage } from '../contexts/LanguageContext'
import { t, type Language } from '../i18n/translations'
import { useAuth } from '../contexts/AuthContext'
import { getExchangeIcon } from './ExchangeIcons'
import { getModelIcon } from './ModelIcons'
import { TraderConfigModal } from './TraderConfigModal'
import { DeepVoidBackground } from './DeepVoidBackground'
import { ExchangeConfigModal } from './traders/ExchangeConfigModal'
import { PunkAvatar, getTraderAvatar } from './PunkAvatar'
import {
  Bot,
  Brain,
  Landmark,
  BarChart3,
  Trash2,
  Plus,
  Users,
  Pencil,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import { confirmToast } from '../lib/notify'
import { toast } from 'sonner'

// 获取友好的AI模型名称
function getModelDisplayName(modelId: string): string {
  switch (modelId.toLowerCase()) {
    case 'deepseek':
      return 'DeepSeek'
    case 'qwen':
      return 'Qwen'
    case 'claude':
      return 'Claude'
    default:
      return modelId.toUpperCase()
  }
}

// 提取下划线后面的名称部分
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

// AI Provider configuration - default models and API links
const AI_PROVIDER_CONFIG: Record<string, {
  defaultModel: string
  apiUrl: string
  apiName: string
}> = {
  deepseek: {
    defaultModel: 'deepseek-chat',
    apiUrl: 'https://platform.deepseek.com/api_keys',
    apiName: 'DeepSeek',
  },
  qwen: {
    defaultModel: 'qwen3-max',
    apiUrl: 'https://dashscope.console.aliyun.com/apiKey',
    apiName: 'Alibaba Cloud',
  },
  openai: {
    defaultModel: 'gpt-5.2',
    apiUrl: 'https://platform.openai.com/api-keys',
    apiName: 'OpenAI',
  },
  claude: {
    defaultModel: 'claude-opus-4-6',
    apiUrl: 'https://console.anthropic.com/settings/keys',
    apiName: 'Anthropic',
  },
  gemini: {
    defaultModel: 'gemini-3-pro-preview',
    apiUrl: 'https://aistudio.google.com/app/apikey',
    apiName: 'Google AI Studio',
  },
  grok: {
    defaultModel: 'grok-3-latest',
    apiUrl: 'https://console.x.ai/',
    apiName: 'xAI',
  },
  kimi: {
    defaultModel: 'moonshot-v1-auto',
    apiUrl: 'https://platform.moonshot.ai/console/api-keys',
    apiName: 'Moonshot',
  },
}

interface AITradersPageProps {
  onTraderSelect?: (traderId: string) => void
}

// Helper function to get exchange display name from exchange ID (UUID)
function getExchangeDisplayName(exchangeId: string | undefined, exchanges: Exchange[]): string {
  if (!exchangeId) return 'Unknown'
  const exchange = exchanges.find(e => e.id === exchangeId)
  if (!exchange) return exchangeId.substring(0, 8).toUpperCase() + '...' // Show truncated UUID if not found
  const typeName = exchange.exchange_type?.toUpperCase() || exchange.name
  return exchange.account_name ? `${typeName} - ${exchange.account_name}` : typeName
}

// Helper function to check if exchange is a perp-dex type (wallet-based)
function isPerpDexExchange(exchangeType: string | undefined): boolean {
  if (!exchangeType) return false
  const perpDexTypes = ['hyperliquid', 'lighter', 'aster']
  return perpDexTypes.includes(exchangeType.toLowerCase())
}

// Helper function to get wallet address for perp-dex exchanges
function getWalletAddress(exchange: Exchange | undefined): string | undefined {
  if (!exchange) return undefined
  const type = exchange.exchange_type?.toLowerCase()
  switch (type) {
    case 'hyperliquid':
      return exchange.hyperliquidWalletAddr
    case 'lighter':
      return exchange.lighterWalletAddr
    case 'aster':
      return exchange.asterSigner
    default:
      return undefined
  }
}

// Helper function to truncate wallet address for display
function truncateAddress(address: string, startLen = 6, endLen = 4): string {
  if (address.length <= startLen + endLen + 3) return address
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`
}

export function AITradersPage({ onTraderSelect }: AITradersPageProps) {
  const { language } = useLanguage()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [editingModel, setEditingModel] = useState<string | null>(null)
  const [editingExchange, setEditingExchange] = useState<string | null>(null)
  const [editingTrader, setEditingTrader] = useState<any>(null)
  const [allModels, setAllModels] = useState<AIModel[]>([])
  const [allExchanges, setAllExchanges] = useState<Exchange[]>([])
  const [supportedModels, setSupportedModels] = useState<AIModel[]>([])
  const [visibleTraderAddresses, setVisibleTraderAddresses] = useState<Set<string>>(new Set())
  const [visibleExchangeAddresses, setVisibleExchangeAddresses] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Toggle wallet address visibility for a trader
  const toggleTraderAddressVisibility = (traderId: string) => {
    setVisibleTraderAddresses(prev => {
      const next = new Set(prev)
      if (next.has(traderId)) {
        next.delete(traderId)
      } else {
        next.add(traderId)
      }
      return next
    })
  }

  // Toggle wallet address visibility for an exchange
  const toggleExchangeAddressVisibility = (exchangeId: string) => {
    setVisibleExchangeAddresses(prev => {
      const next = new Set(prev)
      if (next.has(exchangeId)) {
        next.delete(exchangeId)
      } else {
        next.add(exchangeId)
      }
      return next
    })
  }

  // Copy wallet address to clipboard
  const handleCopyAddress = async (id: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const { data: traders, mutate: mutateTraders, isLoading: isTradersLoading } = useSWR<TraderInfo[]>(
    user && token ? 'traders' : null,
    api.getTraders,
    { refreshInterval: 5000 }
  )

  // 加载AI模型和交易所配置
  useEffect(() => {
    const loadConfigs = async () => {
      if (!user || !token) {
        // 未登录时只加载公开的支持模型
        try {
          const supportedModels = await api.getSupportedModels()
          setSupportedModels(supportedModels)
        } catch (err) {
          console.error('Failed to load supported configs:', err)
        }
        return
      }

      try {
        const [
          modelConfigs,
          exchangeConfigs,
          supportedModels,
        ] = await Promise.all([
          api.getModelConfigs(),
          api.getExchangeConfigs(),
          api.getSupportedModels(),
        ])
        setAllModels(modelConfigs)
        setAllExchanges(exchangeConfigs)
        setSupportedModels(supportedModels)
      } catch (error) {
        console.error('Failed to load configs:', error)
      }
    }
    loadConfigs()
  }, [user, token])

  // 只显示已配置的模型和交易所
  // 注意：后端返回的数据不包含敏感信息（apiKey等），所以通过其他字段判断是否已配置
  const configuredModels =
    allModels?.filter((m) => {
      // 如果模型已启用，说明已配置
      // 或者有系统 API Key 可用，也视为可配置
      // 或者有自定义API URL，也说明已配置
      return m.enabled || m.hasSystemKey || (m.customApiUrl && m.customApiUrl.trim() !== '')
    }) || []
  const configuredExchanges =
    allExchanges?.filter((e) => {
      // Aster 交易所检查特殊字段
      if (e.id === 'aster') {
        return e.asterUser && e.asterUser.trim() !== ''
      }
      // Hyperliquid 需要检查钱包地址（后端会返回这个字段）
      if (e.id === 'hyperliquid') {
        return e.hyperliquidWalletAddr && e.hyperliquidWalletAddr.trim() !== ''
      }
      // 其他交易所：如果已启用，说明已配置（后端返回的已配置交易所会有 enabled: true）
      return e.enabled
    }) || []

  // 只在创建交易员时使用已启用且配置完整的（enabled 由后端计算，含 system key 场景）
  // 注意：后端返回的数据不包含敏感信息，所以只检查 enabled 状态和必要的非敏感字段
  const enabledModels = allModels?.filter((m) => m.enabled || m.hasSystemKey) || []
  const enabledExchanges =
    allExchanges?.filter((e) => {
      if (!e.enabled) return false

      // Aster 交易所需要特殊字段（后端会返回这些非敏感字段）
      if (e.id === 'aster') {
        return (
          e.asterUser &&
          e.asterUser.trim() !== '' &&
          e.asterSigner &&
          e.asterSigner.trim() !== ''
        )
      }

      // Hyperliquid 需要钱包地址（后端会返回这个字段）
      if (e.id === 'hyperliquid') {
        return e.hyperliquidWalletAddr && e.hyperliquidWalletAddr.trim() !== ''
      }

      // 其他交易所：如果已启用，说明已配置完整（后端只返回已配置的交易所）
      return true
    }) || []

  // 检查模型是否正在被运行中的交易员使用（用于UI禁用）
  const isModelInUse = (modelId: string) => {
    return traders?.some((t) => t.ai_model === modelId && t.is_running)
  }

  // 检查模型被哪些交易员使用
  const getModelUsageInfo = (modelId: string) => {
    const usingTraders = traders?.filter((t) => t.ai_model === modelId) || []
    const runningCount = usingTraders.filter((t) => t.is_running).length
    const totalCount = usingTraders.length
    return { runningCount, totalCount, usingTraders }
  }

  // 检查交易所是否正在被运行中的交易员使用（用于UI禁用）
  const isExchangeInUse = (exchangeId: string) => {
    return traders?.some((t) => t.exchange_id === exchangeId && t.is_running)
  }

  // 检查交易所被哪些交易员使用
  const getExchangeUsageInfo = (exchangeId: string) => {
    const usingTraders = traders?.filter((t) => t.exchange_id === exchangeId) || []
    const runningCount = usingTraders.filter((t) => t.is_running).length
    const totalCount = usingTraders.length
    return { runningCount, totalCount, usingTraders }
  }

  // 检查模型是否被任何交易员使用（包括停止状态的）
  const isModelUsedByAnyTrader = (modelId: string) => {
    return traders?.some((t) => t.ai_model === modelId) || false
  }

  // 检查交易所是否被任何交易员使用（包括停止状态的）
  const isExchangeUsedByAnyTrader = (exchangeId: string) => {
    return traders?.some((t) => t.exchange_id === exchangeId) || false
  }

  // 获取使用特定模型的交易员列表
  const getTradersUsingModel = (modelId: string) => {
    return traders?.filter((t) => t.ai_model === modelId) || []
  }

  // 获取使用特定交易所的交易员列表
  const getTradersUsingExchange = (exchangeId: string) => {
    return traders?.filter((t) => t.exchange_id === exchangeId) || []
  }

  const handleCreateTrader = async (data: CreateTraderRequest) => {
    try {
      const model = allModels?.find((m) => m.id === data.ai_model_id)
      const exchange = allExchanges?.find((e) => e.id === data.exchange_id)

      if (!model?.enabled) {
        toast.error(t('modelNotConfigured', language))
        return
      }

      if (!exchange?.enabled) {
        toast.error(t('exchangeNotConfigured', language))
        return
      }

      await toast.promise(api.createTrader(data), {
        loading: '正在创建…',
        success: '创建成功',
        error: '创建失败',
      })
      setShowCreateModal(false)
      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to create trader:', error)
      toast.error(t('createTraderFailed', language))
    }
  }

  const handleEditTrader = async (traderId: string) => {
    try {
      const traderConfig = await api.getTraderConfig(traderId)
      setEditingTrader(traderConfig)
      setShowEditModal(true)
    } catch (error) {
      console.error('Failed to fetch trader config:', error)
      toast.error(t('getTraderConfigFailed', language))
    }
  }

  const handleSaveEditTrader = async (data: CreateTraderRequest) => {
    console.log('🔥🔥🔥 handleSaveEditTrader CALLED with data:', data)
    if (!editingTrader) return

    try {
      const model = enabledModels?.find((m) => m.id === data.ai_model_id)
      const exchange = enabledExchanges?.find((e) => e.id === data.exchange_id)

      if (!model) {
        toast.error(t('modelConfigNotExist', language))
        return
      }

      if (!exchange) {
        toast.error(t('exchangeConfigNotExist', language))
        return
      }

      const request = {
        name: data.name,
        ai_model_id: data.ai_model_id,
        exchange_id: data.exchange_id,
        strategy_id: data.strategy_id,
        initial_balance: data.initial_balance,
        scan_interval_minutes: data.scan_interval_minutes,
        is_cross_margin: data.is_cross_margin,
        show_in_competition: data.show_in_competition,
      }

      console.log('🔥 handleSaveEditTrader - data:', data)
      console.log('🔥 handleSaveEditTrader - data.strategy_id:', data.strategy_id)
      console.log('🔥 handleSaveEditTrader - request:', request)

      await toast.promise(api.updateTrader(editingTrader.trader_id, request), {
        loading: '正在保存…',
        success: '保存成功',
        error: '保存失败',
      })
      setShowEditModal(false)
      setEditingTrader(null)
      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to update trader:', error)
      toast.error(t('updateTraderFailed', language))
    }
  }

  const handleDeleteTrader = async (traderId: string) => {
    {
      const ok = await confirmToast(t('confirmDeleteTrader', language))
      if (!ok) return
    }

    try {
      await toast.promise(api.deleteTrader(traderId), {
        loading: '正在删除…',
        success: '删除成功',
        error: '删除失败',
      })

      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to delete trader:', error)
      toast.error(t('deleteTraderFailed', language))
    }
  }

  const handleToggleTrader = async (traderId: string, running: boolean) => {
    try {
      if (running) {
        await toast.promise(api.stopTrader(traderId), {
          loading: '正在停止…',
          success: '已停止',
          error: '停止失败',
        })
      } else {
        await toast.promise(api.startTrader(traderId), {
          loading: '正在启动…',
          success: '已启动',
          error: '启动失败',
        })
      }

      // Immediately refresh traders list to update running status
      await mutateTraders()
    } catch (error) {
      console.error('Failed to toggle trader:', error)
      toast.error(t('operationFailed', language))
    }
  }

  const handleToggleCompetition = async (traderId: string, currentShowInCompetition: boolean) => {
    try {
      const newValue = !currentShowInCompetition
      await toast.promise(api.toggleCompetition(traderId, newValue), {
        loading: '正在更新…',
        success: newValue ? '已在竞技场显示' : '已在竞技场隐藏',
        error: '更新失败',
      })

      // Immediately refresh traders list to update status
      await mutateTraders()
    } catch (error) {
      console.error('Failed to toggle competition visibility:', error)
      toast.error(t('operationFailed', language))
    }
  }

  const handleModelClick = (modelId: string) => {
    if (!isModelInUse(modelId)) {
      setEditingModel(modelId)
      setShowModelModal(true)
    }
  }

  const handleExchangeClick = (exchangeId: string) => {
    if (!isExchangeInUse(exchangeId)) {
      setEditingExchange(exchangeId)
      setShowExchangeModal(true)
    }
  }

  // 通用删除配置处理函数
  const handleDeleteConfig = async <T extends { id: string }>(config: {
    id: string
    type: 'model' | 'exchange'
    checkInUse: (id: string) => boolean
    getUsingTraders: (id: string) => any[]
    cannotDeleteKey: string
    confirmDeleteKey: string
    allItems: T[] | undefined
    clearFields: (item: T) => T
    buildRequest: (items: T[]) => any
    updateApi: (request: any) => Promise<void>
    refreshApi: () => Promise<T[]>
    setItems: (items: T[]) => void
    closeModal: () => void
    errorKey: string
  }) => {
    // 检查是否有交易员正在使用
    if (config.checkInUse(config.id)) {
      const usingTraders = config.getUsingTraders(config.id)
      const traderNames = usingTraders.map((t) => t.trader_name).join(', ')
      toast.error(
        `${t(config.cannotDeleteKey, language)} · ${t('tradersUsing', language)}: ${traderNames} · ${t('pleaseDeleteTradersFirst', language)}`
      )
      return
    }

    {
      const ok = await confirmToast(t(config.confirmDeleteKey, language))
      if (!ok) return
    }

    try {
      const updatedItems =
        config.allItems?.map((item) =>
          item.id === config.id ? config.clearFields(item) : item
        ) || []

      const request = config.buildRequest(updatedItems)
      await toast.promise(config.updateApi(request), {
        loading: '正在更新配置…',
        success: '配置已更新',
        error: '更新配置失败',
      })

      // 重新获取用户配置以确保数据同步
      const refreshedItems = await config.refreshApi()
      config.setItems(refreshedItems)

      config.closeModal()
    } catch (error) {
      console.error(`Failed to delete ${config.type} config:`, error)
      toast.error(t(config.errorKey, language))
    }
  }

  const handleDeleteModelConfig = async (modelId: string) => {
    await handleDeleteConfig({
      id: modelId,
      type: 'model',
      checkInUse: isModelUsedByAnyTrader,
      getUsingTraders: getTradersUsingModel,
      cannotDeleteKey: 'cannotDeleteModelInUse',
      confirmDeleteKey: 'confirmDeleteModel',
      allItems: allModels,
      clearFields: (m) => ({
        ...m,
        apiKey: '',
        customApiUrl: '',
        customModelName: '',
        enabled: false,
      }),
      buildRequest: (models) => ({
        models: Object.fromEntries(
          models.map((model) => [
            model.provider,
            {
              enabled: model.enabled,
              api_key: model.apiKey || '',
              custom_api_url: model.customApiUrl || '',
              custom_model_name: model.customModelName || '',
            },
          ])
        ),
      }),
      updateApi: api.updateModelConfigs,
      refreshApi: api.getModelConfigs,
      setItems: (items) => {
        // 使用函数式更新确保状态正确更新
        setAllModels([...items])
      },
      closeModal: () => {
        setShowModelModal(false)
        setEditingModel(null)
      },
      errorKey: 'deleteConfigFailed',
    })
  }

  const handleSaveModelConfig = async (
    modelId: string,
    apiKey: string,
    customApiUrl?: string,
    customModelName?: string
  ) => {
    try {
      // 创建或更新用户的模型配置
      const existingModel = allModels?.find((m) => m.id === modelId)
      let updatedModels

      // 找到要配置的模型（优先从已配置列表，其次从支持列表）
      const modelToUpdate =
        existingModel || supportedModels?.find((m) => m.id === modelId)
      if (!modelToUpdate) {
        toast.error(t('modelNotExist', language))
        return
      }

      if (existingModel) {
        // 更新现有配置
        updatedModels =
          allModels?.map((m) =>
            m.id === modelId
              ? {
                ...m,
                apiKey,
                customApiUrl: customApiUrl || '',
                customModelName: customModelName || '',
                enabled: true,
              }
              : m
          ) || []
      } else {
        // 添加新配置
        const newModel = {
          ...modelToUpdate,
          apiKey,
          customApiUrl: customApiUrl || '',
          customModelName: customModelName || '',
          enabled: true,
        }
        updatedModels = [...(allModels || []), newModel]
      }

      const request = {
        models: Object.fromEntries(
          updatedModels.map((model) => [
            model.provider, // 使用 provider 而不是 id
            {
              enabled: model.enabled,
              api_key: model.apiKey || '',
              custom_api_url: model.customApiUrl || '',
              custom_model_name: model.customModelName || '',
            },
          ])
        ),
      }

      await toast.promise(api.updateModelConfigs(request), {
        loading: '正在更新模型配置…',
        success: '模型配置已更新',
        error: '更新模型配置失败',
      })

      // 重新获取用户配置以确保数据同步
      const refreshedModels = await api.getModelConfigs()
      setAllModels(refreshedModels)

      setShowModelModal(false)
      setEditingModel(null)
    } catch (error) {
      console.error('Failed to save model config:', error)
      toast.error(t('saveConfigFailed', language))
    }
  }

  const handleDeleteExchangeConfig = async (exchangeId: string) => {
    // 检查是否有trader在使用此交易所账户
    if (isExchangeUsedByAnyTrader(exchangeId)) {
      const tradersUsing = getTradersUsingExchange(exchangeId)
      toast.error(
        `${t('cannotDeleteExchangeInUse', language)}: ${tradersUsing.join(', ')}`
      )
      return
    }

    // 确认删除
    const ok = await confirmToast(t('confirmDeleteExchange', language))
    if (!ok) return

    try {
      await toast.promise(api.deleteExchange(exchangeId), {
        loading: language === 'zh' ? '正在删除交易所账户…' : 'Deleting exchange account...',
        success: language === 'zh' ? '交易所账户已删除' : 'Exchange account deleted',
        error: language === 'zh' ? '删除交易所账户失败' : 'Failed to delete exchange account',
      })

      // 重新获取用户配置以确保数据同步
      const refreshedExchanges = await api.getExchangeConfigs()
      setAllExchanges(refreshedExchanges)

      setShowExchangeModal(false)
      setEditingExchange(null)
    } catch (error) {
      console.error('Failed to delete exchange config:', error)
      toast.error(t('deleteExchangeConfigFailed', language))
    }
  }

  const handleSaveExchangeConfig = async (
    exchangeId: string | null, // null for creating new account
    exchangeType: string,
    accountName: string,
    apiKey: string,
    secretKey?: string,
    passphrase?: string,
    testnet?: boolean,
    hyperliquidWalletAddr?: string,
    asterUser?: string,
    asterSigner?: string,
    asterPrivateKey?: string,
    lighterWalletAddr?: string,
    lighterPrivateKey?: string,
    lighterApiKeyPrivateKey?: string,
    lighterApiKeyIndex?: number
  ) => {
    try {
      if (exchangeId) {
        // 更新现有账户配置
        const existingExchange = allExchanges?.find((e) => e.id === exchangeId)
        if (!existingExchange) {
          toast.error(t('exchangeNotExist', language))
          return
        }

        const request = {
          exchanges: {
            [exchangeId]: {
              enabled: true,
              api_key: apiKey || '',
              secret_key: secretKey || '',
              passphrase: passphrase || '',
              testnet: testnet || false,
              hyperliquid_wallet_addr: hyperliquidWalletAddr || '',
              aster_user: asterUser || '',
              aster_signer: asterSigner || '',
              aster_private_key: asterPrivateKey || '',
              lighter_wallet_addr: lighterWalletAddr || '',
              lighter_private_key: lighterPrivateKey || '',
              lighter_api_key_private_key: lighterApiKeyPrivateKey || '',
              lighter_api_key_index: lighterApiKeyIndex || 0,
            },
          },
        }

        await toast.promise(api.updateExchangeConfigsEncrypted(request), {
          loading: language === 'zh' ? '正在更新交易所配置…' : 'Updating exchange config...',
          success: language === 'zh' ? '交易所配置已更新' : 'Exchange config updated',
          error: language === 'zh' ? '更新交易所配置失败' : 'Failed to update exchange config',
        })
      } else {
        // 创建新账户
        const createRequest = {
          exchange_type: exchangeType,
          account_name: accountName,
          enabled: true,
          api_key: apiKey || '',
          secret_key: secretKey || '',
          passphrase: passphrase || '',
          testnet: testnet || false,
          hyperliquid_wallet_addr: hyperliquidWalletAddr || '',
          aster_user: asterUser || '',
          aster_signer: asterSigner || '',
          aster_private_key: asterPrivateKey || '',
          lighter_wallet_addr: lighterWalletAddr || '',
          lighter_private_key: lighterPrivateKey || '',
          lighter_api_key_private_key: lighterApiKeyPrivateKey || '',
          lighter_api_key_index: lighterApiKeyIndex || 0,
        }

        await toast.promise(api.createExchangeEncrypted(createRequest), {
          loading: language === 'zh' ? '正在创建交易所账户…' : 'Creating exchange account...',
          success: language === 'zh' ? '交易所账户已创建' : 'Exchange account created',
          error: language === 'zh' ? '创建交易所账户失败' : 'Failed to create exchange account',
        })
      }

      // 重新获取用户配置以确保数据同步
      const refreshedExchanges = await api.getExchangeConfigs()
      setAllExchanges(refreshedExchanges)

      setShowExchangeModal(false)
      setEditingExchange(null)
    } catch (error) {
      console.error('Failed to save exchange config:', error)
      toast.error(t('saveConfigFailed', language))
    }
  }

  const handleAddModel = () => {
    setEditingModel(null)
    setShowModelModal(true)
  }

  const handleAddExchange = () => {
    setEditingExchange(null)
    setShowExchangeModal(true)
  }

  return (
    <DeepVoidBackground className="py-6 md:py-8" disableAnimation>
      <div className="w-full px-4 md:px-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('aiTraders', language)}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {language === 'zh'
                ? `管理你的 AI 模型、交易所和交易员`
                : `Manage your AI models, exchanges, and traders`}
              {(traders?.length || 0) > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }}>
                  {traders?.length || 0} {language === 'zh' ? '活跃' : 'active'}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            disabled={configuredModels.length === 0 || configuredExchanges.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            <Plus className="w-4 h-4" />
            {t('createTrader', language)}
          </button>
        </div>

        {/* Configuration Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Models */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--surface-tertiary)' }}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('aiModels', language)}
                </h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-tertiary)', color: 'var(--text-secondary)' }}>
                  {configuredModels.length}
                </span>
              </div>
              <button
                onClick={handleAddModel}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:bg-white/5"
                style={{ color: 'var(--accent-primary)' }}
              >
                <Plus className="w-3 h-3" />
                {language === 'zh' ? '添加' : 'Add'}
              </button>
            </div>

            <div className="p-3 space-y-2">
              {configuredModels.length > 0 ? configuredModels.map((model) => {
                const usageInfo = getModelUsageInfo(model.id)
                return (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-2.5 rounded-md transition-colors hover:bg-white/5 cursor-pointer"
                    onClick={() => handleModelClick(model.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--surface-tertiary)' }}>
                        {getModelIcon(model.provider || model.id, { width: 18, height: 18 }) || (
                          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{getShortName(model.name)[0]}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {getShortName(model.name)}
                        </div>
                        <div className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          {model.customModelName || AI_PROVIDER_CONFIG[model.provider]?.defaultModel || ''}
                          {model.hasSystemKey && (
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--binance-green-bg)', color: 'var(--binance-green)' }}>
                              {language === 'zh' ? '系统' : 'System'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {usageInfo.totalCount > 0 ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={usageInfo.runningCount > 0
                        ? { background: 'var(--binance-green-bg)', color: 'var(--binance-green)' }
                        : { background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' }}>
                        {usageInfo.runningCount}/{usageInfo.totalCount}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        {language === 'zh' ? '就绪' : 'Standby'}
                      </span>
                    )}
                  </div>
                )
              }) : (
                <div className="text-center py-6">
                  <Brain className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('noModelsConfigured', language)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Exchanges */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--surface-tertiary)' }}
            >
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('exchanges', language)}
                </h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-tertiary)', color: 'var(--text-secondary)' }}>
                  {configuredExchanges.length}
                </span>
              </div>
              <button
                onClick={handleAddExchange}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:bg-white/5"
                style={{ color: 'var(--accent-primary)' }}
              >
                <Plus className="w-3 h-3" />
                {language === 'zh' ? '添加' : 'Add'}
              </button>
            </div>

            <div className="p-3 space-y-2">
              {configuredExchanges.length > 0 ? configuredExchanges.map((exchange) => {
                const usageInfo = getExchangeUsageInfo(exchange.id)
                return (
                  <div
                    key={exchange.id}
                    className="flex items-center justify-between p-2.5 rounded-md transition-colors hover:bg-white/5 cursor-pointer"
                    onClick={() => handleExchangeClick(exchange.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--surface-tertiary)' }}>
                        {getExchangeIcon(exchange.exchange_type || exchange.id, { width: 18, height: 18 })}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                          <span className="truncate">{exchange.exchange_type?.toUpperCase() || getShortName(exchange.name)}</span>
                          <span className="text-[10px] px-1 py-0.5 rounded shrink-0" style={{ background: 'var(--surface-tertiary)', color: 'var(--text-secondary)' }}>
                            {exchange.account_name || 'Default'}
                          </span>
                        </div>
                        <div className="text-[11px] flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          {exchange.type?.toUpperCase() || 'CEX'}
                          {(() => {
                            const walletAddr = exchange.hyperliquidWalletAddr || exchange.asterUser || exchange.lighterWalletAddr
                            if (exchange.type !== 'dex' || !walletAddr) return null
                            const isVisible = visibleExchangeAddresses.has(exchange.id)
                            const isCopied = copiedId === `exchange-${exchange.id}`
                            return (
                              <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <span className="font-mono text-[10px]">{isVisible ? walletAddr : truncateAddress(walletAddr)}</span>
                                <button onClick={(e) => { e.stopPropagation(); toggleExchangeAddressVisibility(exchange.id) }} className="hover:opacity-70">
                                  {isVisible ? <EyeOff size={10} /> : <Eye size={10} />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleCopyAddress(`exchange-${exchange.id}`, walletAddr) }} className="hover:opacity-70">
                                  {isCopied ? <Check size={10} style={{ color: 'var(--binance-green)' }} /> : <Copy size={10} />}
                                </button>
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    {usageInfo.totalCount > 0 ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={usageInfo.runningCount > 0
                        ? { background: 'var(--binance-green-bg)', color: 'var(--binance-green)' }
                        : { background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' }}>
                        {usageInfo.runningCount}/{usageInfo.totalCount}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        {language === 'zh' ? '就绪' : 'Standby'}
                      </span>
                    )}
                  </div>
                )
              }) : (
                <div className="text-center py-6">
                  <Landmark className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('noExchangesConfigured', language)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Traders List */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
        >
          <div
            className="flex items-center justify-between px-4 md:px-5 py-3"
            style={{ borderBottom: '1px solid var(--surface-tertiary)' }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('currentTraders', language)}
              </h3>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-tertiary)', color: 'var(--text-secondary)' }}>
                {traders?.length || 0}
              </span>
            </div>
          </div>

          <div className="p-3 md:p-4">
            {isTradersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg gap-3 animate-pulse"
                    style={{ background: 'var(--surface-secondary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg skeleton"></div>
                      <div className="space-y-2">
                        <div className="skeleton h-4 w-28"></div>
                        <div className="skeleton h-3 w-20"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="skeleton h-7 w-14"></div>
                      <div className="skeleton h-7 w-14"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : traders && traders.length > 0 ? (
              <div className="space-y-2">
                {traders.map((trader) => (
                  <div
                    key={trader.trader_id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg transition-colors gap-3"
                    style={{ background: 'var(--surface-secondary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <PunkAvatar
                          seed={getTraderAvatar(trader.trader_id, trader.trader_name)}
                          size={40}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {trader.trader_name}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {getModelDisplayName(trader.ai_model.split('_').pop() || trader.ai_model)} &middot; {getExchangeDisplayName(trader.exchange_id, allExchanges)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                      {/* Wallet Address */}
                      {(() => {
                        const exchange = allExchanges.find(e => e.id === trader.exchange_id)
                        const walletAddr = getWalletAddress(exchange)
                        const isPerpDex = isPerpDexExchange(exchange?.exchange_type)
                        if (!isPerpDex || !walletAddr) return null
                        const isVisible = visibleTraderAddresses.has(trader.trader_id)
                        const isCopied = copiedId === trader.trader_id
                        return (
                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono"
                            style={{ background: 'var(--surface-tertiary)', color: 'var(--text-secondary)' }}
                          >
                            {isVisible ? walletAddr : truncateAddress(walletAddr)}
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleTraderAddressVisibility(trader.trader_id) }} className="hover:opacity-70">
                              {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleCopyAddress(trader.trader_id, walletAddr) }} className="hover:opacity-70">
                              {isCopied ? <Check className="w-3 h-3" style={{ color: 'var(--binance-green)' }} /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )
                      })()}

                      {/* Status badge */}
                      <span
                        className="text-[11px] font-semibold px-2 py-1 rounded-md"
                        style={trader.is_running
                          ? { background: 'var(--binance-green-bg)', color: 'var(--binance-green)' }
                          : { background: 'var(--binance-red-bg)', color: 'var(--binance-red)' }}
                      >
                        {trader.is_running ? t('running', language) : t('stopped', language)}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => {
                            if (onTraderSelect) {
                              onTraderSelect(trader.trader_id)
                            } else {
                              const slug = `${trader.trader_name}-${trader.trader_id.slice(0, 4)}`
                              navigate(`/dashboard?trader=${encodeURIComponent(slug)}`)
                            }
                          }}
                          className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                          title={t('view', language)}
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleEditTrader(trader.trader_id)}
                          disabled={trader.is_running}
                          className="p-1.5 rounded-md transition-colors hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('edit', language)}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleTrader(trader.trader_id, trader.is_running || false)}
                          className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                          title={trader.is_running ? t('stop', language) : t('start', language)}
                          style={{ color: trader.is_running ? 'var(--binance-red)' : 'var(--binance-green)' }}
                        >
                          {trader.is_running
                            ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                            : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z" /></svg>}
                        </button>

                        <button
                          onClick={() => handleToggleCompetition(trader.trader_id, trader.show_in_competition ?? true)}
                          className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                          title={trader.show_in_competition !== false
                            ? (language === 'zh' ? '在竞技场显示' : 'Visible in competition')
                            : (language === 'zh' ? '在竞技场隐藏' : 'Hidden from competition')}
                          style={{ color: trader.show_in_competition !== false ? 'var(--text-secondary)' : 'var(--text-secondary)', opacity: trader.show_in_competition !== false ? 1 : 0.4 }}
                        >
                          {trader.show_in_competition !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteTrader(trader.trader_id)}
                          className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
                          title={language === 'zh' ? '删除' : 'Delete'}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <Bot className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  {t('noTraders', language)}
                </div>
                <div className="text-xs mb-3">
                  {t('createFirstTrader', language)}
                </div>
                {(configuredModels.length === 0 || configuredExchanges.length === 0) && (
                  <div className="text-xs" style={{ color: 'var(--accent-primary)' }}>
                    {configuredModels.length === 0 && configuredExchanges.length === 0
                      ? t('configureModelsAndExchangesFirst', language)
                      : configuredModels.length === 0
                        ? t('configureModelsFirst', language)
                        : t('configureExchangesFirst', language)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Trader Modal */}
        {showCreateModal && (
          <TraderConfigModal
            isOpen={showCreateModal}
            isEditMode={false}
            availableModels={enabledModels}
            availableExchanges={enabledExchanges}
            onSave={handleCreateTrader}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {/* Edit Trader Modal */}
        {showEditModal && editingTrader && (
          <TraderConfigModal
            isOpen={showEditModal}
            isEditMode={true}
            traderData={editingTrader}
            availableModels={enabledModels}
            availableExchanges={enabledExchanges}
            onSave={handleSaveEditTrader}
            onClose={() => {
              setShowEditModal(false)
              setEditingTrader(null)
            }}
          />
        )}

        {/* Model Configuration Modal */}
        {showModelModal && (
          <ModelConfigModal
            allModels={supportedModels}
            configuredModels={allModels}
            editingModelId={editingModel}
            onSave={handleSaveModelConfig}
            onDelete={handleDeleteModelConfig}
            onClose={() => {
              setShowModelModal(false)
              setEditingModel(null)
            }}
            language={language}
          />
        )}

        {/* Exchange Configuration Modal */}
        {showExchangeModal && (
          <ExchangeConfigModal
            allExchanges={allExchanges}
            editingExchangeId={editingExchange}
            onSave={handleSaveExchangeConfig}
            onDelete={handleDeleteExchangeConfig}
            onClose={() => {
              setShowExchangeModal(false)
              setEditingExchange(null)
            }}
            language={language}
          />
        )}
      </div>
    </DeepVoidBackground>
  )
}

// Step indicator component for Model Config
// Model Configuration Modal Component
function ModelConfigModal({
  allModels,
  configuredModels,
  editingModelId,
  onSave,
  onDelete,
  onClose,
  language,
}: {
  allModels: AIModel[]
  configuredModels: AIModel[]
  editingModelId: string | null
  onSave: (
    modelId: string,
    apiKey: string,
    baseUrl?: string,
    modelName?: string
  ) => void
  onDelete: (modelId: string) => void
  onClose: () => void
  language: Language
}) {
  const [currentStep, setCurrentStep] = useState(editingModelId ? 1 : 0)
  const [selectedModelId, setSelectedModelId] = useState(editingModelId || '')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [modelName, setModelName] = useState('')

  const selectedModel = editingModelId
    ? configuredModels?.find((m) => m.id === selectedModelId)
    : allModels?.find((m) => m.id === selectedModelId)

  useEffect(() => {
    if (editingModelId && selectedModel) {
      setApiKey(selectedModel.apiKey || '')
      setBaseUrl(selectedModel.customApiUrl || '')
      setModelName(selectedModel.customModelName || '')
    }
  }, [editingModelId, selectedModel])

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId)
    setCurrentStep(1)
  }

  const handleBack = () => {
    if (editingModelId) {
      onClose()
    } else {
      setCurrentStep(0)
      setSelectedModelId('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModelId) return
    const hasSystemKey = !!selectedModel?.hasSystemKey
    if (!apiKey.trim() && !hasSystemKey) return
    onSave(selectedModelId, apiKey.trim(), baseUrl.trim() || undefined, modelName.trim() || undefined)
  }

  const availableModels = allModels || []
  const configuredIds = new Set(configuredModels?.map(m => m.id) || [])

  const mInputClass = 'w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--traders-model-accent)]'
  const mInputStyle: React.CSSProperties = {
    background: 'var(--surface-primary)',
    border: '1px solid var(--surface-tertiary)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-xl w-full max-w-lg relative shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface-secondary)', maxHeight: 'calc(100vh - 4rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--surface-tertiary)' }}
        >
          <div className="flex items-center gap-2.5">
            {currentStep > 0 && !editingModelId && (
              <button type="button" onClick={handleBack} className="p-1 rounded-md transition-colors hover:bg-white/10">
                <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {editingModelId ? t('editAIModel', language) : t('addAIModel', language)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!editingModelId && (
              <div className="flex items-center gap-1.5">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === currentStep ? 20 : 6,
                      height: 6,
                      background: i <= currentStep ? 'var(--traders-model-accent)' : 'var(--surface-tertiary)',
                      opacity: i <= currentStep ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
            )}
            {editingModelId && (
              <button
                type="button"
                onClick={() => onDelete(editingModelId)}
                className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
                title={language === 'zh' ? '删除' : 'Delete'}
              >
                <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
            >
              <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
          {/* Step 0: Select Model */}
          {currentStep === 0 && !editingModelId && (
            <div className="space-y-4">
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--surface-tertiary)' }}
              >
                {availableModels.map((model, i) => {
                  const isConfigured = configuredIds.has(model.id)
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelectModel(model.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/5"
                      style={{
                        background: 'var(--surface-primary)',
                        borderTop: i > 0 ? '1px solid var(--surface-tertiary)' : undefined,
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black shrink-0" style={{ border: '1px solid var(--surface-tertiary)' }}>
                        {getModelIcon(model.provider || model.id, { width: 20, height: 20 }) || (
                          <span className="text-xs font-bold" style={{ color: 'var(--traders-model-accent-muted)' }}>{model.name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {getShortName(model.name)}
                          </span>
                          {model.hasSystemKey && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-medium" style={{ background: 'var(--binance-green-bg)', color: 'var(--binance-green)' }}>
                              System
                            </span>
                          )}
                          {isConfigured && (
                            <Check className="w-3.5 h-3.5" style={{ color: 'var(--traders-accent)' }} />
                          )}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {AI_PROVIDER_CONFIG[model.provider]?.defaultModel || model.id}
                        </div>
                      </div>
                      <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 1: Configure */}
          {(currentStep === 1 || editingModelId) && selectedModel && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected Model Pill */}
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black shrink-0" style={{ border: '1px solid var(--surface-tertiary)' }}>
                    {getModelIcon(selectedModel.provider || selectedModel.id, { width: 20, height: 20 }) || (
                      <span className="text-xs font-bold" style={{ color: 'var(--traders-model-accent-muted)' }}>{selectedModel.name[0]}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {getShortName(selectedModel.name)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {AI_PROVIDER_CONFIG[selectedModel.provider]?.defaultModel || selectedModel.id}
                    </div>
                  </div>
                </div>
                {AI_PROVIDER_CONFIG[selectedModel.provider] && (
                  <a
                    href={AI_PROVIDER_CONFIG[selectedModel.provider].apiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors hover:brightness-110"
                    style={{ background: 'var(--traders-model-accent)', color: '#fff' }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {language === 'zh' ? '获取 Key' : 'Get Key'}
                  </a>
                )}
              </div>

              {/* Kimi Warning */}
              {selectedModel.provider === 'kimi' && (
                <div
                  className="p-3 rounded-lg text-xs"
                  style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                >
                  <div style={{ color: '#ef4444' }}>{t('kimiApiNote', language)}</div>
                </div>
              )}

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  API Key {selectedModel?.hasSystemKey ? '' : '*'}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedModel?.hasSystemKey ? (language === 'zh' ? '留空使用系统 API Key' : 'Leave blank to use system API key') : t('enterAPIKey', language)}
                  className={mInputClass}
                  style={mInputStyle}
                  required={!selectedModel?.hasSystemKey}
                />
                {selectedModel?.hasSystemKey && (
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {language === 'zh' ? '系统已配置 API Key，留空即可使用' : 'System API key available — leave blank to use it.'}
                  </div>
                )}
              </div>

              {/* Custom Base URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('customBaseURL', language)}
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={t('customBaseURLPlaceholder', language)}
                  className={mInputClass}
                  style={mInputStyle}
                />
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t('leaveBlankForDefault', language)}
                </div>
              </div>

              {/* Custom Model Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('customModelName', language)}
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={t('customModelNamePlaceholder', language)}
                  className={mInputClass}
                  style={mInputStyle}
                />
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t('leaveBlankForDefaultModel', language)}
                </div>
              </div>

              {/* Info Box */}
              <div
                className="p-3 rounded-lg text-xs"
                style={{ background: 'var(--traders-model-accent-bg)', border: '1px solid var(--traders-model-accent-border)' }}
              >
                <div className="font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--traders-model-accent-muted)' }}>
                  <Brain className="w-3.5 h-3.5" />
                  {t('information', language)}
                </div>
                <div className="space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <div>• {t('modelConfigInfo1', language)}</div>
                  <div>• {t('modelConfigInfo2', language)}</div>
                  <div>• {t('modelConfigInfo3', language)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex gap-2.5 pt-3"
                style={{ borderTop: '1px solid var(--surface-tertiary)' }}
              >
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                  style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {editingModelId ? t('cancel', language) : (language === 'zh' ? '返回' : 'Back')}
                </button>
                <button
                  type="submit"
                  disabled={!selectedModel || (!apiKey.trim() && !selectedModel?.hasSystemKey)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                  style={{ background: 'var(--traders-model-accent)', color: '#fff' }}
                >
                  {t('saveConfig', language)}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
