import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()

const SUPPORTED_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', enabled: false, hasSystemKey: false },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', enabled: false, hasSystemKey: false },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', enabled: false, hasSystemKey: false },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', enabled: false, hasSystemKey: false },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', enabled: false, hasSystemKey: false },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', enabled: false, hasSystemKey: false },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', enabled: false, hasSystemKey: false },
  { id: 'grok-3-mini', name: 'Grok 3 Mini', provider: 'xai', enabled: false, hasSystemKey: false },
]

const SUPPORTED_EXCHANGES = [
  { id: '', exchange_type: 'binance', account_name: '', name: 'Binance', type: 'cex', enabled: false },
  { id: '', exchange_type: 'bybit', account_name: '', name: 'Bybit', type: 'cex', enabled: false },
  { id: '', exchange_type: 'okx', account_name: '', name: 'OKX', type: 'cex', enabled: false },
  { id: '', exchange_type: 'hyperliquid', account_name: '', name: 'Hyperliquid', type: 'dex', enabled: false },
  { id: '', exchange_type: 'aster', account_name: '', name: 'Aster', type: 'dex', enabled: false },
  { id: '', exchange_type: 'lighter', account_name: '', name: 'Lighter', type: 'dex', enabled: false },
]

router.get('/supported-models', (_req, res) => res.json(SUPPORTED_MODELS))
router.get('/supported-exchanges', (_req, res) => res.json(SUPPORTED_EXCHANGES))

router.get('/models', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM ai_models WHERE user_id = ?').all(req.userId)
  if (rows.length === 0) return res.json(SUPPORTED_MODELS)
  res.json(rows.map(m => ({
    id: m.id, name: m.name, provider: m.provider, enabled: !!m.enabled,
    apiKey: m.api_key ? '••••••' : undefined,
    customApiUrl: m.custom_api_url, customModelName: m.custom_model_name,
    hasSystemKey: !!m.has_system_key,
  })))
})

router.put('/models', authMiddleware, (req, res) => {
  const { models } = req.body
  if (!models) return res.status(400).json({ error: 'Models required' })

  const upsert = db.prepare(`INSERT INTO ai_models (id, user_id, name, provider, enabled, api_key, custom_api_url, custom_model_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled, api_key=excluded.api_key,
    custom_api_url=excluded.custom_api_url, custom_model_name=excluded.custom_model_name`)

  for (const [id, cfg] of Object.entries(models)) {
    const base = SUPPORTED_MODELS.find(m => m.id === id) || { name: id, provider: 'custom' }
    upsert.run(id, req.userId, base.name, base.provider, cfg.enabled ? 1 : 0,
      cfg.api_key || '', cfg.custom_api_url || '', cfg.custom_model_name || '')
  }
  res.json({ message: 'Models updated' })
})

router.get('/exchanges', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM exchanges WHERE user_id = ?').all(req.userId)
  res.json(rows.map(mapExchange))
})

router.post('/exchanges', authMiddleware, (req, res) => {
  const b = req.body
  const id = uuid()
  const displayName = SUPPORTED_EXCHANGES.find(e => e.exchange_type === b.exchange_type)?.name || b.exchange_type
  const exType = SUPPORTED_EXCHANGES.find(e => e.exchange_type === b.exchange_type)?.type || 'cex'

  db.prepare(`INSERT INTO exchanges (id, user_id, exchange_type, account_name, name, type, enabled,
    api_key, secret_key, passphrase, testnet, hyperliquid_wallet_addr,
    aster_user, aster_signer, aster_private_key,
    lighter_wallet_addr, lighter_private_key, lighter_api_key_private_key, lighter_api_key_index)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, req.userId, b.exchange_type, b.account_name || '', displayName, exType,
    b.enabled ? 1 : 0, b.api_key || '', b.secret_key || '', b.passphrase || '',
    b.testnet ? 1 : 0, b.hyperliquid_wallet_addr || '',
    b.aster_user || '', b.aster_signer || '', b.aster_private_key || '',
    b.lighter_wallet_addr || '', b.lighter_private_key || '',
    b.lighter_api_key_private_key || '', b.lighter_api_key_index || 0
  )
  res.json({ id })
})

router.put('/exchanges', authMiddleware, (req, res) => {
  const { exchanges } = req.body
  if (!exchanges) return res.status(400).json({ error: 'Exchanges required' })

  for (const [id, cfg] of Object.entries(exchanges)) {
    db.prepare(`UPDATE exchanges SET enabled=?, api_key=?, secret_key=?, passphrase=?,
      testnet=?, hyperliquid_wallet_addr=?, aster_user=?, aster_signer=?, aster_private_key=?,
      lighter_wallet_addr=?, lighter_private_key=?, lighter_api_key_private_key=?, lighter_api_key_index=?
      WHERE id=? AND user_id=?`).run(
      cfg.enabled ? 1 : 0, cfg.api_key || '', cfg.secret_key || '', cfg.passphrase || '',
      cfg.testnet ? 1 : 0, cfg.hyperliquid_wallet_addr || '',
      cfg.aster_user || '', cfg.aster_signer || '', cfg.aster_private_key || '',
      cfg.lighter_wallet_addr || '', cfg.lighter_private_key || '',
      cfg.lighter_api_key_private_key || '', cfg.lighter_api_key_index || 0,
      id, req.userId
    )
  }
  res.json({ message: 'Exchanges updated' })
})

router.delete('/exchanges/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM exchanges WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ message: 'Exchange deleted' })
})

router.get('/prompt-templates', (_req, res) => {
  res.json({ templates: [
    { name: 'balanced' }, { name: 'aggressive' }, { name: 'conservative' },
    { name: 'scalping' }, { name: 'swing' },
  ]})
})

function mapExchange(e) {
  return {
    id: e.id, exchange_type: e.exchange_type, account_name: e.account_name,
    name: e.name, type: e.type, enabled: !!e.enabled,
    apiKey: e.api_key ? '••••••' : undefined,
    secretKey: e.secret_key ? '••••••' : undefined,
    passphrase: e.passphrase ? '••••••' : undefined,
    testnet: !!e.testnet,
    hyperliquidWalletAddr: e.hyperliquid_wallet_addr || undefined,
    asterUser: e.aster_user || undefined,
    asterSigner: e.aster_signer || undefined,
    lighterWalletAddr: e.lighter_wallet_addr || undefined,
    lighterApiKeyIndex: e.lighter_api_key_index || undefined,
  }
}

export default router
