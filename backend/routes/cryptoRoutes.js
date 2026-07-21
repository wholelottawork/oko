import { Router } from 'express'

const router = Router()

router.get('/crypto/config', (_req, res) => {
  res.json({ transport_encryption: false })
})

router.get('/crypto/public-key', (_req, res) => {
  res.json({ public_key: '' })
})

router.post('/crypto/decrypt', (req, res) => {
  res.json({ data: req.body })
})

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
