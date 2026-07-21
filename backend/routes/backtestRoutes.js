import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()

router.get('/backtest/runs', authMiddleware, (req, res) => {
  const { state, search, limit = 20, offset = 0 } = req.query
  let sql = 'SELECT * FROM backtest_runs WHERE user_id = ?'
  const params = [req.userId]
  if (state) { sql += ' AND state = ?'; params.push(state) }
  if (search) { sql += ' AND label LIKE ?'; params.push(`%${search}%`) }
  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))

  const rows = db.prepare(sql).all(...params)
  const total = db.prepare('SELECT COUNT(*) as c FROM backtest_runs WHERE user_id = ?').get(req.userId)
  res.json({ total: total.c, items: rows.map(mapRun) })
})

router.post('/backtest/start', authMiddleware, (req, res) => {
  const id = req.body.config?.run_id || uuid()
  const config = req.body.config || {}
  db.prepare(`INSERT INTO backtest_runs (id, user_id, state, config, summary, updated_at)
    VALUES (?,?,'running',?,?,datetime('now'))`)
    .run(id, req.userId, JSON.stringify(config), JSON.stringify({
      symbol_count: config.symbols?.length || 0, decision_tf: config.decision_timeframe || '4h',
      processed_bars: 0, progress_pct: 0, equity_last: config.initial_balance || 10000,
      max_drawdown_pct: 0, liquidated: false,
    }))
  const row = db.prepare('SELECT * FROM backtest_runs WHERE id = ?').get(id)
  res.json(mapRun(row))
})

router.post('/backtest/pause', authMiddleware, (req, res) => {
  db.prepare("UPDATE backtest_runs SET state='paused', updated_at=datetime('now') WHERE id=? AND user_id=?")
    .run(req.body.run_id, req.userId)
  const row = db.prepare('SELECT * FROM backtest_runs WHERE id = ?').get(req.body.run_id)
  res.json(mapRun(row))
})

router.post('/backtest/resume', authMiddleware, (req, res) => {
  db.prepare("UPDATE backtest_runs SET state='running', updated_at=datetime('now') WHERE id=? AND user_id=?")
    .run(req.body.run_id, req.userId)
  const row = db.prepare('SELECT * FROM backtest_runs WHERE id = ?').get(req.body.run_id)
  res.json(mapRun(row))
})

router.post('/backtest/stop', authMiddleware, (req, res) => {
  db.prepare("UPDATE backtest_runs SET state='completed', updated_at=datetime('now') WHERE id=? AND user_id=?")
    .run(req.body.run_id, req.userId)
  const row = db.prepare('SELECT * FROM backtest_runs WHERE id = ?').get(req.body.run_id)
  res.json(mapRun(row))
})

router.post('/backtest/label', authMiddleware, (req, res) => {
  db.prepare("UPDATE backtest_runs SET label=?, updated_at=datetime('now') WHERE id=? AND user_id=?")
    .run(req.body.label, req.body.run_id, req.userId)
  const row = db.prepare('SELECT * FROM backtest_runs WHERE id = ?').get(req.body.run_id)
  res.json(mapRun(row))
})

router.post('/backtest/delete', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM backtest_runs WHERE id = ? AND user_id = ?').run(req.body.run_id, req.userId)
  res.json({ message: 'Deleted' })
})

router.get('/backtest/status', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM backtest_runs WHERE id = ?').get(req.query.run_id)
  if (!row) return res.status(404).json({ error: 'Run not found' })
  const summary = JSON.parse(row.summary || '{}')
  res.json({
    run_id: row.id, state: row.state, progress_pct: summary.progress_pct || 0,
    processed_bars: summary.processed_bars || 0, current_time: Date.now(),
    decision_cycle: 0, equity: summary.equity_last || 10000,
    unrealized_pnl: 0, realized_pnl: 0, positions: [],
    last_updated_iso: row.updated_at,
  })
})

router.get('/backtest/equity', authMiddleware, (_req, res) => res.json([]))
router.get('/backtest/trades', authMiddleware, (_req, res) => res.json([]))
router.get('/backtest/metrics', authMiddleware, (_req, res) => {
  res.json({
    total_return_pct: 0, max_drawdown_pct: 0, sharpe_ratio: 0,
    profit_factor: 0, win_rate: 0, trades: 0, avg_win: 0, avg_loss: 0,
    best_symbol: '', worst_symbol: '', liquidated: false,
  })
})
router.get('/backtest/klines', authMiddleware, (req, res) => {
  res.json({ symbol: req.query.symbol || '', timeframe: '4h', start_ts: 0, end_ts: 0, count: 0, klines: [], run_id: req.query.run_id || '' })
})
router.get('/backtest/trace', authMiddleware, (_req, res) => res.json({}))
router.get('/backtest/decisions', authMiddleware, (_req, res) => res.json([]))
router.get('/backtest/config', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT config FROM backtest_runs WHERE id = ?').get(req.query.run_id)
  res.json(row ? JSON.parse(row.config) : {})
})
router.get('/backtest/export', authMiddleware, (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify({ export: 'data' }))
})

function mapRun(r) {
  return {
    run_id: r.id, label: r.label, user_id: r.user_id, state: r.state,
    version: r.version, last_error: r.last_error,
    summary: JSON.parse(r.summary || '{}'),
    created_at: r.created_at, updated_at: r.updated_at,
  }
}

export default router
