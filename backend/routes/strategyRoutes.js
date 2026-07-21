import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()

const DEFAULT_CONFIG = {
  strategy_type: 'ai_trading',
  language: 'en',
  coin_source: {
    source_type: 'static', static_coins: ['BTCUSDT', 'ETHUSDT'], excluded_coins: [],
    use_ai500: false, ai500_limit: 10, use_oi_top: false, oi_top_limit: 10,
    use_oi_low: false, oi_low_limit: 10,
  },
  indicators: {
    klines: { primary_timeframe: '4h', primary_count: 50, enable_multi_timeframe: false },
    enable_raw_klines: true, enable_ema: true, enable_macd: true, enable_rsi: true,
    enable_atr: false, enable_boll: false, enable_volume: true, enable_oi: false,
    enable_funding_rate: false, ema_periods: [9, 21], rsi_periods: [14], atr_periods: [14],
  },
  risk_control: {
    max_positions: 3, btc_eth_max_leverage: 10, altcoin_max_leverage: 5,
    max_margin_usage: 0.9, min_position_size: 10, min_risk_reward_ratio: 1.5, min_confidence: 60,
  },
}

router.get('/strategies', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM strategies WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId)
  res.json({ strategies: rows.map(mapStrategy) })
})

router.get('/strategies/active', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM strategies WHERE user_id = ? AND is_active = 1 LIMIT 1').get(req.userId)
  if (!row) return res.status(404).json({ error: 'No active strategy' })
  res.json(mapStrategy(row))
})

router.get('/strategies/default-config', authMiddleware, (req, res) => {
  res.json(DEFAULT_CONFIG)
})

router.get('/strategies/public', (_req, res) => {
  const rows = db.prepare('SELECT * FROM strategies WHERE is_public = 1 ORDER BY updated_at DESC').all()
  res.json({ strategies: rows.map(mapStrategy) })
})

router.post('/strategies/preview-prompt', authMiddleware, (req, res) => {
  res.json({ prompt: 'Preview prompt for strategy configuration.\n\nThis is a generated preview based on your strategy settings.' })
})

router.post('/strategies/test-run', authMiddleware, (req, res) => {
  res.json({ result: 'Test run completed successfully', decisions: [] })
})

router.get('/strategies/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!row) return res.status(404).json({ error: 'Strategy not found' })
  res.json(mapStrategy(row))
})

router.post('/strategies', authMiddleware, (req, res) => {
  const id = uuid()
  const { name, description, config } = req.body
  db.prepare(`INSERT INTO strategies (id, user_id, name, description, config, updated_at) VALUES (?,?,?,?,?,datetime('now'))`)
    .run(id, req.userId, name || 'Untitled', description || '', JSON.stringify(config || DEFAULT_CONFIG))
  const row = db.prepare('SELECT * FROM strategies WHERE id = ?').get(id)
  res.json(mapStrategy(row))
})

router.put('/strategies/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT * FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!existing) return res.status(404).json({ error: 'Strategy not found' })

  const { name, description, config } = req.body
  db.prepare(`UPDATE strategies SET name=?, description=?, config=?, updated_at=datetime('now') WHERE id=?`)
    .run(name ?? existing.name, description ?? existing.description,
      config ? JSON.stringify(config) : existing.config, req.params.id)
  const row = db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.params.id)
  res.json(mapStrategy(row))
})

router.delete('/strategies/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM strategies WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ message: 'Strategy deleted' })
})

router.post('/strategies/:id/activate', authMiddleware, (req, res) => {
  db.prepare('UPDATE strategies SET is_active = 0 WHERE user_id = ?').run(req.userId)
  db.prepare('UPDATE strategies SET is_active = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  const row = db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.params.id)
  res.json(mapStrategy(row))
})

router.post('/strategies/:id/duplicate', authMiddleware, (req, res) => {
  const src = db.prepare('SELECT * FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!src) return res.status(404).json({ error: 'Strategy not found' })
  const id = uuid()
  db.prepare(`INSERT INTO strategies (id, user_id, name, description, config, updated_at) VALUES (?,?,?,?,?,datetime('now'))`)
    .run(id, req.userId, `${src.name} (copy)`, src.description, src.config)
  const row = db.prepare('SELECT * FROM strategies WHERE id = ?').get(id)
  res.json(mapStrategy(row))
})

function mapStrategy(s) {
  return {
    id: s.id, name: s.name, description: s.description,
    is_active: !!s.is_active, is_default: !!s.is_default,
    is_public: !!s.is_public, config_visible: !!s.config_visible,
    config: JSON.parse(s.config || '{}'),
    created_at: s.created_at, updated_at: s.updated_at,
  }
}

export default router
