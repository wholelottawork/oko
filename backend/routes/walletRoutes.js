import { Router } from 'express'

const router = Router()

router.get('/wallet/:address/balances', (req, res) => {
  res.json({
    assets: [
      { tokenName: 'Solana', tokenSymbol: 'SOL', balance: '12.5', balanceUsd: '2236.50', tokenPrice: '178.92', blockchain: 'solana', contractAddress: '', thumbnail: '', tokenDecimals: 9, tokenType: 'NATIVE' },
      { tokenName: 'USD Coin', tokenSymbol: 'USDC', balance: '1500.00', balanceUsd: '1500.00', tokenPrice: '1.00', blockchain: 'solana', contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', thumbnail: '', tokenDecimals: 6, tokenType: 'SPL' },
    ],
    totalBalanceUsd: '3736.50',
  })
})

router.get('/wallet/:address/solana-token-balance', (req, res) => {
  res.json({ address: req.params.address, mint: req.query.mint || '', totalBalance: 0 })
})

router.get('/wallet/:address/analyze', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const chunks = [
    '## Wallet Analysis\n\n',
    `**Address:** \`${req.params.address.slice(0, 8)}...${req.params.address.slice(-6)}\`\n\n`,
    '### Holdings\n',
    '- **SOL**: 12.5 ($2,236.50)\n',
    '- **USDC**: 1,500.00 ($1,500.00)\n\n',
    '### Portfolio Summary\n',
    '- Total Value: **$3,736.50**\n',
    '- Primary chain: Solana\n',
    '- Risk level: Moderate\n\n',
    '### Recommendation\n',
    'This wallet shows a balanced portfolio with good liquidity. ',
    'Consider diversifying into more assets for better risk distribution.',
  ]

  let i = 0
  const send = () => {
    if (i < chunks.length) {
      res.write(`data: ${JSON.stringify({ chunk: chunks[i] })}\n\n`)
      i++
      setTimeout(send, 100)
    } else {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    }
  }
  send()
  req.on('close', () => { i = chunks.length })
})

router.post('/wallet/:address/chat', (req, res) => {
  res.json({ reply: `Based on the wallet analysis, ${req.body.message || 'here is my response'}: This wallet maintains a healthy portfolio balance.` })
})

router.post('/chat', (req, res) => {
  const msg = req.body.message || ''
  res.json({ reply: `I understand your question about "${msg.slice(0, 50)}". In the current market conditions, it's important to maintain proper risk management and diversification.` })
})

export default router
