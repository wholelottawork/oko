import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react'
import { DeepVoidBackground } from './DeepVoidBackground'
import { toast } from 'sonner'
import { useSystemConfig } from '../hooks/useSystemConfig'
export function LoginPage() {
  const { language } = useLanguage()
  const { login, loginAdmin, verifyOTP, completeRegistration } = useAuth()
  const [step, setStep] = useState<'login' | 'otp' | 'setup-otp'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [userID, setUserID] = useState('')
  const [qrCodeURL, setQrCodeURL] = useState('')
  const [otpSecret, setOtpSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const adminMode = false
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false
  const [expiredToastId, setExpiredToastId] = useState<string | number | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem('from401') === 'true') {
      const id = toast.warning(t('sessionExpired', language), { duration: Infinity })
      setExpiredToastId(id)
      sessionStorage.removeItem('from401')
    }
  }, [language])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await loginAdmin(adminPassword)
    if (!result.success) {
      const msg = result.message || t('loginFailed', language)
      setError(msg)
      toast.error(msg)
    } else {
      if (expiredToastId) toast.dismiss(expiredToastId)
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)

    if (result.success) {
      if (result.requiresOTPSetup && result.userID) {
        setUserID(result.userID)
        setQrCodeURL(result.qrCodeURL || '')
        setOtpSecret(result.otpSecret || '')
        setStep('setup-otp')
        toast.info('Pending 2FA setup detected. Please complete configuration.')
      } else if (result.requiresOTP && result.userID) {
        setUserID(result.userID)
        if (result.qrCodeURL) {
          setQrCodeURL(result.qrCodeURL)
          setOtpSecret(result.otpSecret || '')
          setStep('setup-otp')
          toast.info('Pending 2FA setup detected. Please complete configuration.')
        } else {
          setStep('otp')
        }
      } else {
        if (expiredToastId) toast.dismiss(expiredToastId)
      }
    } else {
      if (result.qrCodeURL) {
        setUserID(result.userID || '')
        setQrCodeURL(result.qrCodeURL)
        setOtpSecret(result.otpSecret || '')
        setStep('setup-otp')
        toast.warning(t('completeGapSetup', language) || 'Incomplete setup detected. Please configure 2FA.')
      } else {
        const msg = result.message || t('loginFailed', language)
        setError(msg)
        toast.error(msg)
      }
    }
    setLoading(false)
  }

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = qrCodeURL
      ? await completeRegistration(userID, otpCode)
      : await verifyOTP(userID, otpCode)

    if (!result.success) {
      const msg = result.message || t('verificationFailed', language)
      setError(msg)
      toast.error(msg)
    } else {
      if (expiredToastId) toast.dismiss(expiredToastId)
      setQrCodeURL('')
      setOtpSecret('')
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const inputClass =
    'w-full px-4 py-3 rounded-lg text-sm transition-all outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50'
  const inputStyle = {
    background: 'var(--surface-primary)',
    border: '1px solid var(--surface-tertiary)',
    color: 'var(--text-primary)',
  }
  const focusRing = 'focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]'
  const labelClass = 'block text-sm font-medium mb-2'
  const labelStyle = { color: 'var(--text-secondary)' }
  const btnPrimary =
    'w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const btnPrimaryStyle = {
    background: 'var(--accent-primary)',
    color: '#fff',
  }

  return (
    <DeepVoidBackground className="min-h-screen flex flex-col" disableAnimation bgImage="/images/bg1.png">
      <div className="flex-1 flex items-start sm:items-center justify-center w-full min-h-0 py-4 sm:py-12 overflow-y-auto">
        <div className="w-full max-w-md px-4 sm:px-6">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-4 sm:mb-8 transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {'Back to home'}
        </a>

        {/* Card - login form */}
        <div
          className="rounded-2xl p-5 sm:p-8 shadow-xl"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--surface-tertiary)',
          }}
        >
          {/* Logo & heading */}
          <div className="text-center mb-5 sm:mb-8">
            <img src="/logo.png" alt="OKO" className="w-10 sm:w-12 h-auto mx-auto mb-4 sm:mb-6 opacity-90" />
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {step === 'login'
                ? 'Sign in'
                : step === 'otp'
                  ? 'Verification'
                  : 'Set up 2FA'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {step === 'login'
                ? 'Sign in to your account to continue'
                : step === 'otp'
                  ? 'Enter your verification code'
                  : 'Scan the QR code to complete setup'}
            </p>
          </div>

          {adminMode ? (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className={labelClass} style={labelStyle}>
                  Admin Key
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className={`${inputClass} ${focusRing}`}
                  style={inputStyle}
                  placeholder="Enter admin password"
                  required
                />
              </div>
              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-lg"
                  style={{ background: 'var(--binance-red-bg)', color: 'var(--binance-red)', border: '1px solid rgba(246, 70, 93, 0.3)' }}
                >
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className={`${btnPrimary}`} style={btnPrimaryStyle}>
                {loading ? ('Verifying...') : ('Sign in')}
              </button>
            </form>
          ) : step === 'setup-otp' ? (
            <div className="space-y-6">
              <div
                className="p-6 rounded-xl text-center"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)' }}
              >
                <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                  {'Complete 2FA configuration'}
                </p>
                {qrCodeURL ? (
                  <div className="inline-block p-3 rounded-lg bg-white">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`otpauth://totp/${encodeURIComponent(email)}?secret=${otpSecret}&issuer=OKO`)}`}
                      alt="QR Code"
                      className="w-32 h-32"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 mx-auto rounded-lg animate-pulse" style={{ background: 'var(--surface-tertiary)' }} />
                )}
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {'Backup secret key'}
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <code
                      className="text-xs px-3 py-2 rounded-lg font-mono"
                      style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)', color: 'var(--accent-primary)' }}
                    >
                      {otpSecret}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(otpSecret)}
                      className="text-xs px-3 py-2 rounded-lg font-medium transition-colors hover:opacity-80"
                      style={{ background: 'var(--surface-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      {'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex gap-3">
                  <span className="font-semibold shrink-0" style={{ color: 'var(--accent-primary)' }}>1.</span>
                  <div>
                    <p className="font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {'Install authenticator app'}
                    </p>
                    <p className="text-xs">
                      {'Recommended: Google Authenticator'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold shrink-0" style={{ color: 'var(--accent-primary)' }}>2.</span>
                  <div>
                    <p className="font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {'Scan & verify'}
                    </p>
                    <p className="text-xs">
                      {'Scan the code above, then enter the 6-digit code below'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('otp')}
                className={`${btnPrimary}`}
                style={btnPrimaryStyle}
              >
                {'I have scanned the code'}
              </button>
            </div>
          ) : step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className={labelClass} style={labelStyle}>
                    {t('email', language)}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputClass} ${focusRing}`}
                    style={inputStyle}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass} style={labelStyle}>
                      {t('password', language)}
                    </label>
                    <a
                      href="/reset-password"
                      className="text-xs font-medium hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {t('forgotPassword', language)}
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} ${focusRing} pr-10`}
                      style={inputStyle}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-lg flex items-start gap-2"
                  style={{ background: 'var(--binance-red-bg)', color: 'var(--binance-red)', border: '1px solid rgba(246, 70, 93, 0.3)' }}
                >
                  <span>!</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className={`${btnPrimary}`} style={btnPrimaryStyle}>
                {loading
                  ? ('Signing in...')
                  : ('Sign in')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPVerify} className="space-y-6">
              <div className="flex flex-col items-center py-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)' }}
                >
                  <Shield className="w-7 h-7" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  {t('otpVerificationPrompt', language)}
                </p>
              </div>

              <div>
                <label className={`${labelClass} text-center`} style={labelStyle}>
                  {t('otpCode', language)}
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} ${focusRing} text-center text-xl tracking-[0.4em] font-mono`}
                  style={inputStyle}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-lg text-center"
                  style={{ background: 'var(--binance-red-bg)', color: 'var(--binance-red)', border: '1px solid rgba(246, 70, 93, 0.3)' }}
                >
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="flex-1 flex items-center justify-center py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--surface-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {'Back'}
                </button>
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="flex-1 flex items-center justify-center py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={btnPrimaryStyle}
                >
                  {loading ? ('Verifying...') : ('Verify')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer links */}
        {!adminMode && (
          <div className="mt-5 sm:mt-8 text-center space-y-3 sm:space-y-4">
            {registrationEnabled && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {"Don't have an account?"}{' '}
                <a
                  href="/register"
                  className="font-medium hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {'Sign up'}
                </a>
              </p>
            )}
            <a
              href="/"
              className="block text-xs transition-colors hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'Return to home'}
            </a>
          </div>
        )}
        </div>
      </div>
    </DeepVoidBackground>
  )
}
