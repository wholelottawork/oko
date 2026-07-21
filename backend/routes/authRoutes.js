import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { generateToken, authMiddleware } from '../auth.js'

const router = Router()

router.get('/config', (_req, res) => {
  res.json({ beta_mode: false, registration_enabled: true })
})

router.post('/register', async (req, res) => {
  const { email, password, beta_code } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const id = uuid()
  const hash = await bcrypt.hash(password, 10)
  db.prepare('INSERT INTO users (id, email, password_hash, registration_complete) VALUES (?, ?, ?, 1)').run(id, email, hash)

  const token = generateToken(id, email)
  res.json({
    user_id: id,
    email,
    token,
    message: 'Registration successful',
  })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  const token = generateToken(user.id, user.email)
  res.json({
    requires_otp: false,
    token,
    user_id: user.id,
    email: user.email,
    message: 'Login successful',
  })
})

router.post('/admin-login', (req, res) => {
  const { password } = req.body
  const adminPass = process.env.ADMIN_PASSWORD || 'admin'
  if (password !== adminPass) return res.status(401).json({ error: 'Invalid password' })

  const token = generateToken('admin', 'admin@localhost')
  res.json({ token, user_id: 'admin', email: 'admin@localhost' })
})

router.post('/verify-otp', (req, res) => {
  const { user_id, otp_code } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const token = generateToken(user.id, user.email)
  res.json({ token, user_id: user.id, email: user.email, message: 'OTP verified' })
})

router.post('/complete-registration', (req, res) => {
  const { user_id, otp_code } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  db.prepare('UPDATE users SET registration_complete = 1 WHERE id = ?').run(user_id)
  const token = generateToken(user.id, user.email)
  res.json({ token, user_id: user.id, email: user.email, message: 'Registration complete' })
})

router.post('/reset-password', async (req, res) => {
  const { email, new_password, otp_code } = req.body
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const hash = await bcrypt.hash(new_password, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id)
  res.json({ message: 'Password reset successful' })
})

router.post('/logout', authMiddleware, (_req, res) => {
  res.json({ message: 'Logged out' })
})

router.post('/setup-otp', authMiddleware, (req, res) => {
  res.json({ otp_secret: 'JBSWY3DPEHPK3PXP', qr_code_url: '' })
})

router.get('/account/security', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT email, otp_enabled FROM users WHERE id = ?').get(req.userId)
  res.json({ email: user?.email || '', otp_enabled: !!user?.otp_enabled })
})

export default router
