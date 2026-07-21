import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'oko-dev-secret-change-in-production'

export function generateToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET)
    req.userId = decoded.userId
    req.userEmail = decoded.email
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET)
      req.userId = decoded.userId
      req.userEmail = decoded.email
    } catch { /* ignore */ }
  }
  next()
}
