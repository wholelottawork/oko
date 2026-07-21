import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { authMiddleware, optionalAuth } from '../auth.js'

const router = Router()

router.get('/my-traders', authMiddleware, (req, res) => {
  const traders = db.prepare('SELECT * FROM traders WHERE user_id = ?').all(req.userId)
  res.json(traders.map(mapTrader))
})

router.get('/traders', (req, res) => {
  const traders = db.prepare('SELECT * FROM traders WHERE show_in_competition = 1').all()
  res.json(traders.map(mapTrader))
})

router.post('/traders', authMiddleware, (req, res) => {
  const id = uuid()
  const b = req.body
  db.prepare(`INSERT INTO traders (id, user_id, name, ai_model_id, exchange_id, strategy_id,
    initial_balance, scan_interval_minutes, is_cross_margin, show_in_competition,
    btc_eth_leverage, altcoin_leverage, trading_symbols, custom_prompt, system_prompt_template,
    use_ai500, use_oi_top) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, req.userId, b.name, b.ai_model_id, b.exchange_id, b.strategy_id || null,
    b.initial_balance || 10000, b.scan_interval_minutes || 15,
    b.is_cross_margin ? 1 : 0, b.show_in_competition ? 1 : 0,
    b.btc_eth_leverage || 5, b.altcoin_leverage || 3,
    b.trading_symbols || '', b.custom_prompt || '', b.system_prompt_template || '',
    b.use_ai500 ? 1 : 0, b.use_oi_top ? 1 : 0
  )
  const trader = db.prepare('SELECT * FROM traders WHERE id = ?').get(id)
  res.json(mapTrader(trader))
})

router.put('/traders/:id', authMiddleware, (req, res) => {
  const b = req.body
  const trader = db.prepare('SELECT * FROM traders WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!trader) return res.status(404).json({ error: 'Trader not found' })

  db.prepare(`UPDATE traders SET name=?, ai_model_id=?, exchange_id=?, strategy_id=?,
    initial_balance=?, scan_interval_minutes=?, is_cross_margin=?, show_in_competition=?,
    btc_eth_leverage=?, altcoin_leverage=?, trading_symbols=?, custom_prompt=?,
    system_prompt_template=?, use_ai500=?, use_oi_top=? WHERE id=?`).run(
    b.name ?? trader.name, b.ai_model_id ?? trader.ai_model_id, b.exchange_id ?? trader.exchange_id,
    b.strategy_id ?? trader.strategy_id, b.initial_balance ?? trader.initial_balance,
    b.scan_interval_minutes ?? trader.scan_interval_minutes,
    b.is_cross_margin !== undefined ? (b.is_cross_margin ? 1 : 0) : trader.is_cross_margin,
    b.show_in_competition !== undefined ? (b.show_in_competition ? 1 : 0) : trader.show_in_competition,
    b.btc_eth_leverage ?? trader.btc_eth_leverage, b.altcoin_leverage ?? trader.altcoin_leverage,
    b.trading_symbols ?? trader.trading_symbols, b.custom_prompt ?? trader.custom_prompt,
    b.system_prompt_template ?? trader.system_prompt_template,
    b.use_ai500 !== undefined ? (b.use_ai500 ? 1 : 0) : trader.use_ai500,
    b.use_oi_top !== undefined ? (b.use_oi_top ? 1 : 0) : trader.use_oi_top,
    req.params.id
  )
  const updated = db.prepare('SELECT * FROM traders WHERE id = ?').get(req.params.id)
  res.json(mapTrader(updated))
})

router.delete('/traders/:id', authMiddleware, (req, res) => {
  const r = db.prepare('DELETE FROM traders WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  if (r.changes === 0) return res.status(404).json({ error: 'Trader not found' })
  res.json({ message: 'Trader deleted' })
})

router.post('/traders/:id/start', authMiddleware, (req, res) => {
  db.prepare('UPDATE traders SET is_running = 1, start_time = datetime("now") WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId)
  res.json({ message: 'Trader started' })
})

router.post('/traders/:id/stop', authMiddleware, (req, res) => {
  db.prepare('UPDATE traders SET is_running = 0 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ message: 'Trader stopped' })
})

router.put('/traders/:id/competition', authMiddleware, (req, res) => {
  db.prepare('UPDATE traders SET show_in_competition = ? WHERE id = ? AND user_id = ?')
    .run(req.body.show_in_competition ? 1 : 0, req.params.id, req.userId)
  res.json({ message: 'Updated' })
})

router.post('/traders/:id/close-position', authMiddleware, (req, res) => {
  res.json({ message: 'Position closed' })
})

router.put('/traders/:id/prompt', authMiddleware, (req, res) => {
  db.prepare('UPDATE traders SET custom_prompt = ? WHERE id = ? AND user_id = ?')
    .run(req.body.custom_prompt || '', req.params.id, req.userId)
  res.json({ message: 'Prompt updated' })
})

router.get('/traders/:id/config', authMiddleware, (req, res) => {
  const trader = db.prepare('SELECT * FROM traders WHERE id = ?').get(req.params.id)
  if (!trader) return res.status(404).json({ error: 'Trader not found' })
  res.json(mapTraderConfig(trader))
})

router.get('/traders/:id/grid-risk', authMiddleware, (req, res) => {
  res.json({
    current_leverage: 1, effective_leverage: 1, recommended_leverage: 3,
    current_position: 0, max_position: 10000, position_percent: 0,
    liquidation_price: 0, liquidation_distance: 100,
    regime_level: 'normal',
    short_box_upper: 0, short_box_lower: 0,
    mid_box_upper: 0, mid_box_lower: 0,
    long_box_upper: 0, long_box_lower: 0,
    current_price: 0, breakout_level: 'none', breakout_direction: 'none',
  })
})

router.get('/trader/:id/config', (req, res) => {
  const trader = db.prepare('SELECT * FROM traders WHERE id = ?').get(req.params.id)
  if (!trader) return res.status(404).json({ error: 'Trader not found' })
  res.json(mapTraderConfig(trader))
})

router.get('/top-traders', (_req, res) => {
  const traders = db.prepare('SELECT * FROM traders WHERE show_in_competition = 1 LIMIT 5').all()
  res.json(traders.map(mapTrader))
})

router.get('/competition', (_req, res) => {
  const traders = db.prepare('SELECT * FROM traders WHERE show_in_competition = 1').all()
  res.json({
    traders: traders.map(t => ({
      trader_id: t.id, trader_name: t.name, ai_model: t.ai_model_id || 'gpt-4o',
      exchange: 'binance', total_equity: t.initial_balance || 10000,
      total_pnl: 0, total_pnl_pct: 0, position_count: 0, margin_used_pct: 0,
      is_running: !!t.is_running,
    })),
    count: traders.length,
  })
})

function mapTrader(t) {
  return {
    trader_id: t.id, trader_name: t.name, ai_model: t.ai_model_id || '',
    exchange_id: t.exchange_id, is_running: !!t.is_running,
    show_in_competition: !!t.show_in_competition, strategy_id: t.strategy_id,
    strategy_name: t.strategy_name, custom_prompt: t.custom_prompt,
    use_ai500: !!t.use_ai500, use_oi_top: !!t.use_oi_top,
    system_prompt_template: t.system_prompt_template,
  }
}

function mapTraderConfig(t) {
  return {
    trader_id: t.id, trader_name: t.name, ai_model: t.ai_model_id || '',
    exchange_id: t.exchange_id || '', strategy_id: t.strategy_id,
    strategy_name: t.strategy_name, is_cross_margin: !!t.is_cross_margin,
    show_in_competition: !!t.show_in_competition,
    scan_interval_minutes: t.scan_interval_minutes || 15,
    initial_balance: t.initial_balance || 10000, is_running: !!t.is_running,
    btc_eth_leverage: t.btc_eth_leverage, altcoin_leverage: t.altcoin_leverage,
    trading_symbols: t.trading_symbols, custom_prompt: t.custom_prompt,
    system_prompt_template: t.system_prompt_template,
    use_ai500: !!t.use_ai500, use_oi_top: !!t.use_oi_top,
  }
}

export default router
