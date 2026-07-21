import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()

const PERSONALITIES = [
  { id: 'bull', name: 'Bull', emoji: '🐂', color: '#22c55e', description: 'Optimistic outlook, focuses on upside potential' },
  { id: 'bear', name: 'Bear', emoji: '🐻', color: '#ef4444', description: 'Cautious outlook, focuses on downside risks' },
  { id: 'analyst', name: 'Analyst', emoji: '📊', color: '#3b82f6', description: 'Data-driven, focuses on technical analysis' },
  { id: 'contrarian', name: 'Contrarian', emoji: '🔄', color: '#f59e0b', description: 'Goes against the crowd, looks for hidden opportunities' },
  { id: 'risk_manager', name: 'Risk Manager', emoji: '🛡️', color: '#8b5cf6', description: 'Focuses on risk management and capital preservation' },
]

const PERSONALITY_COLORS = { bull: '#22c55e', bear: '#ef4444', analyst: '#3b82f6', contrarian: '#f59e0b', risk_manager: '#8b5cf6' }

router.get('/debates/personalities', authMiddleware, (_req, res) => res.json(PERSONALITIES))

router.get('/debates', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM debates WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId)
  res.json(rows.map(mapDebate))
})

router.get('/debates/:id', authMiddleware, (req, res) => {
  const debate = db.prepare('SELECT * FROM debates WHERE id = ?').get(req.params.id)
  if (!debate) return res.status(404).json({ error: 'Debate not found' })
  const participants = db.prepare('SELECT * FROM debate_participants WHERE session_id = ? ORDER BY speak_order').all(req.params.id)
  const messages = db.prepare('SELECT * FROM debate_messages WHERE session_id = ? ORDER BY created_at').all(req.params.id)
  const votes = db.prepare('SELECT * FROM debate_votes WHERE session_id = ? ORDER BY created_at').all(req.params.id)
  res.json({
    ...mapDebate(debate),
    participants: participants.map(mapParticipant),
    messages: messages.map(mapMessage),
    votes: votes.map(mapVote),
  })
})

router.post('/debates', authMiddleware, (req, res) => {
  const id = uuid()
  const b = req.body
  db.prepare(`INSERT INTO debates (id, user_id, name, strategy_id, symbol, max_rounds,
    interval_minutes, prompt_variant, auto_execute, trader_id, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
    id, req.userId, b.name, b.strategy_id || '', b.symbol,
    b.max_rounds || 3, b.interval_minutes || 15, b.prompt_variant || 'balanced',
    b.auto_execute ? 1 : 0, b.trader_id || null
  )

  if (Array.isArray(b.participants)) {
    const insert = db.prepare(`INSERT INTO debate_participants (id, session_id, ai_model_id, ai_model_name, provider, personality, color, speak_order)
      VALUES (?,?,?,?,?,?,?,?)`)
    b.participants.forEach((p, i) => {
      insert.run(uuid(), id, p.ai_model_id, p.ai_model_id, '', p.personality,
        PERSONALITY_COLORS[p.personality] || '#888', i)
    })
  }

  const debate = db.prepare('SELECT * FROM debates WHERE id = ?').get(id)
  const participants = db.prepare('SELECT * FROM debate_participants WHERE session_id = ?').all(id)
  res.json({ ...mapDebate(debate), participants: participants.map(mapParticipant), messages: [], votes: [] })
})

router.post('/debates/:id/start', authMiddleware, (req, res) => {
  db.prepare("UPDATE debates SET status='running', updated_at=datetime('now') WHERE id=?").run(req.params.id)
  res.json({ message: 'Debate started' })
})

router.post('/debates/:id/cancel', authMiddleware, (req, res) => {
  db.prepare("UPDATE debates SET status='cancelled', updated_at=datetime('now') WHERE id=?").run(req.params.id)
  res.json({ message: 'Debate cancelled' })
})

router.post('/debates/:id/execute', authMiddleware, (req, res) => {
  const debate = db.prepare('SELECT * FROM debates WHERE id = ?').get(req.params.id)
  if (!debate) return res.status(404).json({ error: 'Debate not found' })
  const participants = db.prepare('SELECT * FROM debate_participants WHERE session_id = ?').all(req.params.id)
  const messages = db.prepare('SELECT * FROM debate_messages WHERE session_id = ?').all(req.params.id)
  const votes = db.prepare('SELECT * FROM debate_votes WHERE session_id = ?').all(req.params.id)
  res.json({
    message: 'Trade executed',
    session: { ...mapDebate(debate), participants: participants.map(mapParticipant), messages: messages.map(mapMessage), votes: votes.map(mapVote) },
  })
})

router.delete('/debates/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM debates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ message: 'Debate deleted' })
})

router.get('/debates/:id/messages', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM debate_messages WHERE session_id = ? ORDER BY created_at').all(req.params.id)
  res.json(rows.map(mapMessage))
})

router.get('/debates/:id/votes', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM debate_votes WHERE session_id = ? ORDER BY created_at').all(req.params.id)
  res.json(rows.map(mapVote))
})

router.get('/debates/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write('data: {"type":"connected"}\n\n')
  const interval = setInterval(() => res.write('data: {"type":"ping"}\n\n'), 15000)
  req.on('close', () => clearInterval(interval))
})

function mapDebate(d) {
  return {
    id: d.id, user_id: d.user_id, name: d.name, strategy_id: d.strategy_id,
    status: d.status, symbol: d.symbol, interval_minutes: d.interval_minutes,
    prompt_variant: d.prompt_variant, trader_id: d.trader_id,
    max_rounds: d.max_rounds, current_round: d.current_round,
    final_decision: d.final_decision ? JSON.parse(d.final_decision) : undefined,
    final_decisions: d.final_decisions ? JSON.parse(d.final_decisions) : undefined,
    auto_execute: !!d.auto_execute,
    created_at: d.created_at, updated_at: d.updated_at,
  }
}

function mapParticipant(p) {
  return {
    id: p.id, session_id: p.session_id, ai_model_id: p.ai_model_id,
    ai_model_name: p.ai_model_name, provider: p.provider,
    personality: p.personality, color: p.color, speak_order: p.speak_order,
    created_at: p.created_at,
  }
}

function mapMessage(m) {
  return {
    id: m.id, session_id: m.session_id, round: m.round,
    ai_model_id: m.ai_model_id, ai_model_name: m.ai_model_name,
    provider: m.provider, personality: m.personality,
    message_type: m.message_type, content: m.content,
    decision: m.decision ? JSON.parse(m.decision) : undefined,
    decisions: m.decisions ? JSON.parse(m.decisions) : undefined,
    confidence: m.confidence, created_at: m.created_at,
  }
}

function mapVote(v) {
  return {
    id: v.id, session_id: v.session_id, ai_model_id: v.ai_model_id,
    ai_model_name: v.ai_model_name, action: v.action, symbol: v.symbol,
    confidence: v.confidence, leverage: v.leverage, position_pct: v.position_pct,
    stop_loss_pct: v.stop_loss_pct, take_profit_pct: v.take_profit_pct,
    reasoning: v.reasoning, created_at: v.created_at,
  }
}

export default router
