import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { getSystemConfig } from '../lib/config'
import { toast } from 'sonner'
import { copyWithToast } from '../lib/clipboard'
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react'
import { DeepVoidBackground } from './DeepVoidBackground'
import PasswordChecklist from 'react-password-checklist'
import { RegistrationDisabled } from './RegistrationDisabled'
import { WhitelistFullPage } from './WhitelistFullPage'
export function RegisterPage() {
  const { language } = useLanguage()
  const { register, completeRegistration } = useAuth()
  const [step, setStep] = useState<'register' | 'setup-otp' | 'verify-otp' | 'whitelist-full'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [betaCode, setBetaCode] = useState('')
  const [betaMode, setBetaMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [otpCode, setOtpCode] = useState('')
  const [userID, setUserID] = useState('')
  const [otpSecret, setOtpSecret] = useState('')
  const [qrCodeURL, setQrCodeURL] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordValid, setPasswordValid] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    getSystemConfig()
      .then((config) => {
        setBetaMode(config.beta_mode || false)
        setRegistrationEnabled(config.registration_enabled !== false)
      })
      .catch((err) => {
        console.error('Failed to fetch system config:', err)
      })
  }, [])

  if (!registrationEnabled) {
    return <RegistrationDisabled />
  }

  if (step === 'whitelist-full') {
    return <WhitelistFullPage onBack={() => setStep('register')} />
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!passwordValid) {
      setError(t('passwordNotMeetRequirements', language))
      return
    }

    if (betaMode && !betaCode.trim()) {
      setError('Beta code required during closed beta')
      return
    }

    setLoading(true)

    try {
      const result = await register(email, password, betaCode.trim() || undefined)

      const isWhitelistError = (msg: string) => {
        const lowerMsg = msg.toLowerCase()
        return lowerMsg.includes('whitelist') ||
          lowerMsg.includes('capacity') ||
          lowerMsg.includes('limit') ||
          lowerMsg.includes('permission denied') ||
          lowerMsg.includes('not on whitelist')
      }

      if (result.success && result.userID) {
        setUserID(result.userID)
        setOtpSecret(result.otpSecret || '')
        setQrCodeURL(result.qrCodeURL || '')
        setStep('setup-otp')
      } else {
        const msg = result.message || t('registrationFailed', language)
        if (isWhitelistError(msg)) {
          setStep('whitelist-full')
          return
        }
        setError(msg)
        toast.error(msg)
      }
    } catch (e) {
      console.error('Registration error:', e)
      const errorMsg = e instanceof Error && e.message ? e.message : 'Registration failed due to server error'
      const lowerMsg = errorMsg.toLowerCase()
      if (lowerMsg.includes('whitelist') ||
        lowerMsg.includes('capacity') ||
        lowerMsg.includes('limit') ||
        lowerMsg.includes('permission denied') ||
        lowerMsg.includes('not on whitelist')) {
        setStep('whitelist-full')
        return
      }
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = () => {
    setStep('verify-otp')
  }

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await completeRegistration(userID, otpCode)

    if (!result.success) {
      const msg = result.message || t('registrationFailed', language)
      setError(msg)
      toast.error(msg)
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string) => {
    copyWithToast(text)
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
            className="inline-flex items-center gap-2 text-sm mb-3 sm:mb-8 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {'Back to home'}
          </a>

          {/* Card - register form */}
          <div
            className="rounded-2xl p-5 sm:p-8 shadow-xl"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--surface-tertiary)',
            }}
          >
            {/* Logo & heading */}
            <div className="text-center mb-5 sm:mb-8">
              <img src="/logo.png" alt="NoFx" className="w-10 sm:w-12 h-auto mx-auto mb-4 sm:mb-6 opacity-90" />
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {step === 'register'
                  ? 'Create account'
                  : step === 'setup-otp'
                    ? 'Set up 2FA'
                    : 'Verify account'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {step === 'register'
                  ? 'Enter your details to get started'
                  : step === 'setup-otp'
                    ? 'Scan the QR code to complete setup'
                    : 'Enter the code to activate your account'}
              </p>
            </div>

            {step === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
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
                  <label className={labelClass} style={labelStyle}>
                    {t('password', language)}
                  </label>
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

                <div>
                  <label className={labelClass} style={labelStyle}>
                    {t('confirmPassword', language)}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${inputClass} ${focusRing} pr-10`}
                      style={inputStyle}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div
                  className="p-3 sm:p-4 rounded-lg"
                  style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)' }}
                >
                  <p className="text-xs font-medium mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {'Password requirements'}
                  </p>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <PasswordChecklist
                      rules={['minLength', 'capital', 'lowercase', 'number', 'specialChar', 'match']}
                      minLength={8}
                      value={password}
                      valueAgain={confirmPassword}
                      messages={{
                        minLength: t('passwordRuleMinLength', language),
                        capital: t('passwordRuleUppercase', language),
                        lowercase: t('passwordRuleLowercase', language),
                        number: t('passwordRuleNumber', language),
                        specialChar: t('passwordRuleSpecial', language),
                        match: t('passwordRuleMatch', language),
                      }}
                      className="grid grid-cols-2 gap-x-4 gap-y-1"
                      onChange={(isValid) => setPasswordValid(isValid)}
                      iconSize={10}
                    />
                  </div>
                </div>

                {betaMode && (
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      {'Beta code'}
                    </label>
                    <input
                      type="text"
                      value={betaCode}
                      onChange={(e) => setBetaCode(e.target.value.replace(/[^a-z0-9]/gi, '').toLowerCase())}
                      className={`${inputClass} ${focusRing} font-mono tracking-wider`}
                      style={inputStyle}
                      placeholder="XXXXXX"
                      maxLength={6}
                      required={betaMode}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {'Required during closed beta'}
                    </p>
                  </div>
                )}

                {error && (
                  <div
                    className="text-sm px-4 py-3 rounded-lg flex items-start gap-2"
                    style={{ background: 'var(--binance-red-bg)', color: 'var(--binance-red)', border: '1px solid rgba(246, 70, 93, 0.3)' }}
                  >
                    <span>!</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (betaMode && !betaCode.trim()) || !passwordValid}
                  className={`${btnPrimary}`}
                  style={btnPrimaryStyle}
                >
                  {loading
                    ? ('Creating account...')
                    : ('Create account')}
                </button>
              </form>
            )}

            {step === 'setup-otp' && (
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
                        {'Scan QR code'}
                      </p>
                      <p className="text-xs">
                        {'Open your app and scan the code above'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold shrink-0" style={{ color: 'var(--accent-primary)' }}>3.</span>
                    <div>
                      <p className="font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {'Enter verification code'}
                      </p>
                      <p className="text-xs">
                        {'Enter the 6-digit code in the next step'}
                      </p>
                      <p className="text-xs mt-2 italic" style={{ color: 'var(--text-tertiary)' }}>
                        {'Tip: Ensure your phone\'s time is set to automatic'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSetupComplete}
                  className={`${btnPrimary}`}
                  style={btnPrimaryStyle}
                >
                  {'I have scanned the code'}
                </button>
              </div>
            )}

            {step === 'verify-otp' && (
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

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className={`${btnPrimary}`}
                  style={btnPrimaryStyle}
                >
                  {loading
                    ? ('Verifying...')
                    : ('Activate account')}
                </button>
              </form>
            )}
          </div>

          {/* Footer links */}
          <div className="mt-5 sm:mt-8 text-center space-y-3 sm:space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {'Already have an account?'}{' '}
              <a
                href="/login"
                className="font-medium hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                {'Sign in'}
              </a>
            </p>
            <a
              href="/"
              className="block text-xs transition-colors hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'Return to home'}
            </a>
          </div>
        </div>
      </div>
    </DeepVoidBackground>
  )
}
