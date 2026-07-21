import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()

router.get('/status', authMiddleware, (req, res) => {
  const traderId = req.query.trader_id
  if (traderId) {
    const trader = db.prepare('SELECT * FROM traders WHERE id = ?').get(traderId)
    if (!trader) return res.status(404).json({ error: 'Trader not found' })
    return res.json({
      trader_id: trader.id, trader_name: trader.name,
      ai_model: trader.ai_model_id || 'gpt-4o', is_running: !!trader.is_running,
      start_time: trader.start_time || '', runtime_minutes: 0, call_count: trader.call_count || 0,
      initial_balance: trader.initial_balance || 10000, scan_interval: `${trader.scan_interval_minutes || 15}m`,
      stop_until: '', last_reset_time: '', ai_provider: 'openai',
    })
  }
  res.json({
    trader_id: '', trader_name: '', ai_model: '', is_running: false,
    start_time: '', runtime_minutes: 0, call_count: 0, initial_balance: 10000,
    scan_interval: '15m', stop_until: '', last_reset_time: '', ai_provider: '',
  })
})

router.get('/account', authMiddleware, (req, res) => {
  const traderId = req.query.trader_id
  let balance = 10000
  if (traderId) {
    const trader = db.prepare('SELECT initial_balance FROM traders WHERE id = ?').get(traderId)
    if (trader) balance = trader.initial_balance || 10000
  }
  res.json({
    total_equity: balance, wallet_balance: balance, unrealized_profit: 0,
    available_balance: balance, total_pnl: 0, total_pnl_pct: 0,
    initial_balance: balance, daily_pnl: 0, position_count: 0,
    margin_used: 0, margin_used_pct: 0,
  })
})

router.get('/positions', authMiddleware, (req, res) => {
  const traderId = req.query.trader_id
  if (traderId) {
    const positions = db.prepare('SELECT * FROM positions WHERE trader_id = ? AND is_open = 1').all(traderId)
    return res.json(positions.map(p => ({
      symbol: p.symbol, side: p.side, entry_price: p.entry_price,
      mark_price: p.mark_price, quantity: p.quantity, leverage: p.leverage,
      unrealized_pnl: p.unrealized_pnl, unrealized_pnl_pct: p.unrealized_pnl_pct,
      liquidation_price: p.liquidation_price, margin_used: p.margin_used,
    })))
  }
  res.json([])
})

router.get('/decisions', authMiddleware, (req, res) => {
  const traderId = req.query.trader_id
  if (traderId) {
    const rows = db.prepare('SELECT * FROM decisions WHERE trader_id = ? ORDER BY id DESC LIMIT 50').all(traderId)
    return res.json(rows.map(mapDecision))
  }
  res.json([])
})

router.get('/decisions/latest', authMiddleware, (req, res) => {
  const traderId = req.query.trader_id
  const limit = parseInt(req.query.limit) || 5
  if (traderId) {
    const rows = db.prepare('SELECT * FROM decisions WHERE trader_id = ? ORDER BY id DESC LIMIT ?').all(traderId, limit)
    return res.json(rows.map(mapDecision))
  }
  res.json([])
})

router.get('/statistics', authMiddleware, (req, res) => {
  res.json({
    total_cycles: 0, successful_cycles: 0, failed_cycles: 0,
    total_open_positions: 0, total_close_positions: 0,
  })
})

router.get('/equity-history', authMiddleware, (req, res) => {
  const traderId = req.query.trader_id
  if (traderId) {
    const rows = db.prepare('SELECT * FROM equity_history WHERE trader_id = ? ORDER BY timestamp').all(traderId)
    return res.json(rows.map(r => ({
      timestamp: r.timestamp, equity: r.equity, pnl: r.pnl, pnl_pct: r.pnl_pct,
    })))
  }
  res.json([])
})

router.post('/equity-history-batch', (req, res) => {
  const { trader_ids, hours } = req.body
  const result = {}
  if (Array.isArray(trader_ids)) {
    for (const id of trader_ids) {
      const rows = db.prepare('SELECT * FROM equity_history WHERE trader_id = ? ORDER BY timestamp').all(id)
      result[id] = rows.map(r => ({
        timestamp: r.timestamp, equity: r.equity, pnl: r.pnl, pnl_pct: r.pnl_pct,
      }))
    }
  }
  res.json(result)
})

router.get('/positions/history', authMiddleware, (req, res) => {
  const traderId = req.query.trader_id
  const limit = parseInt(req.query.limit) || 100
  if (traderId) {
    const positions = db.prepare('SELECT * FROM position_history WHERE trader_id = ? ORDER BY id DESC LIMIT ?').all(traderId, limit)
    return res.json({
      positions: positions.map(mapHistoricalPosition),
      stats: { total_trades: 0, win_trades: 0, loss_trades: 0, win_rate: 0, profit_factor: 0, sharpe_ratio: 0, total_pnl: 0, total_fee: 0, avg_win: 0, avg_loss: 0, max_drawdown_pct: 0 },
      symbol_stats: [],
      direction_stats: [],
    })
  }
  res.json({ positions: [], stats: null, symbol_stats: [], direction_stats: [] })
})

router.get('/server-ip', authMiddleware, (_req, res) => {
  res.json({ public_ip: '127.0.0.1', message: 'Development server' })
})

function mapDecision(d) {
  return {
    timestamp: d.timestamp, cycle_number: d.cycle_number,
    system_prompt: d.system_prompt, input_prompt: d.input_prompt,
    cot_trace: d.cot_trace, decision_json: d.decision_json,
    account_state: JSON.parse(d.account_state || '{}'),
    positions: JSON.parse(d.positions || '[]'),
    candidate_coins: JSON.parse(d.candidate_coins || '[]'),
    decisions: JSON.parse(d.decisions_data || '[]'),
    execution_log: JSON.parse(d.execution_log || '[]'),
    success: !!d.success, error_message: d.error_message,
  }
}

function mapHistoricalPosition(p) {
  return {
    id: p.id, trader_id: p.trader_id, exchange_id: p.exchange_id,
    exchange_type: p.exchange_type, symbol: p.symbol, side: p.side,
    quantity: p.quantity, entry_quantity: p.entry_quantity,
    entry_price: p.entry_price, entry_order_id: p.entry_order_id,
    entry_time: p.entry_time, exit_price: p.exit_price,
    exit_order_id: p.exit_order_id, exit_time: p.exit_time,
    realized_pnl: p.realized_pnl, fee: p.fee, leverage: p.leverage,
    status: p.status, close_reason: p.close_reason,
    created_at: p.created_at, updated_at: p.updated_at,
  }
}

export default router
