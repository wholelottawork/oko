import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'
import traderRoutes from './routes/traderRoutes.js'
import tradingDataRoutes from './routes/tradingDataRoutes.js'
import modelExchangeRoutes from './routes/modelExchangeRoutes.js'
import strategyRoutes from './routes/strategyRoutes.js'
import backtestRoutes from './routes/backtestRoutes.js'
import debateRoutes from './routes/debateRoutes.js'
import marketRoutes from './routes/marketRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import cryptoRoutes from './routes/cryptoRoutes.js'

const app = express()
const PORT = process.env.PORT || 8080

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api', authRoutes)
app.use('/api', traderRoutes)
app.use('/api', tradingDataRoutes)
app.use('/api', modelExchangeRoutes)
app.use('/api', strategyRoutes)
app.use('/api', backtestRoutes)
app.use('/api', debateRoutes)
app.use('/api', marketRoutes)
app.use('/api', walletRoutes)
app.use('/api', cryptoRoutes)

app.listen(PORT, () => {
  console.log(`OKO Backend running on http://localhost:${PORT}`)
})
