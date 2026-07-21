import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { Toaster } from 'sonner'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient, wagmiAdapter } from './config/wallet'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    if (
      error.message?.includes('insertBefore') ||
      error.message?.includes('removeChild') ||
      error.message?.includes('appendChild')
    ) {
      console.warn('DOM error caused by browser extension — reloading component tree')
      this.setState({ hasError: false })
      return
    }
    console.error('Uncaught error:', error)
  }

  render() {
    if (this.state.hasError) {
      this.setState({ hasError: false })
      return null
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <Toaster
          theme="dark"
          richColors
          closeButton
          position="top-center"
          duration={2200}
          toastOptions={{
            className: 'nofx-toast',
            style: {
              background: '#0b0e11',
              border: '1px solid var(--panel-border)',
              color: 'var(--text-primary)',
            },
          }}
        />
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
)
