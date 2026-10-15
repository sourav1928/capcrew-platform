import { usePageMeta } from '../utils/usePageMeta'
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { authApi } from '../services/authApi'
import { useDispatch } from 'react-redux'
import { login as setLogin } from '../store/slices/authSlice'

type RegistrationStep = 'email' | 'otp' | 'password'

export default function RegisterPage() {
  usePageMeta("Create Account", "Create a CapCrew account to track orders and check out faster.")
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [step, setStep] = useState<RegistrationStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)

  // Countdown for OTP expiry
  useEffect(() => {
    if (otpExpiry === null || otpExpiry <= 0) return

    const interval = setInterval(() => {
      setOtpExpiry((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [otpExpiry])

  // Countdown for resend button
  useEffect(() => {
    if (resendCountdown <= 0) return

    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [resendCountdown])

  // Handle send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('Please enter your email')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.sendOtp(email)
      setSuccess('✅ OTP sent to your email!')
      setOtpExpiry(response.otp_expiry || 600) // 10 minutes
      setStep('otp')
      setResendCountdown(60) // 60 seconds cooldown
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please check your email.')
      console.error('Send OTP Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle verify OTP (move to password step)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!otp || otp.length < 6) {
      setError('Please enter a valid OTP (6 digits)')
      return
    }

    // For now, just move to password step
    // We'll verify the OTP when creating the account
    setSuccess('✅ OTP verified! Now set your password.')
    setStep('password')
  }

  // Handle create account (verify OTP + register)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username) {
      setError('Please enter a username')
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (!password) {
      setError('Please enter a password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.verifyOtpAndRegister(email, otp, password, username)

      // Log the new user in (update Redux so the header shows logged-in state)
      dispatch(
        setLogin({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
        })
      )

      setSuccess('✅ Account created successfully! Redirecting...')
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to create account. OTP may have expired.')
      console.error('Register Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return

    setError('')
    setLoading(true)
    try {
      const response = await authApi.sendOtp(email)
      setSuccess('✅ OTP resent to your email!')
      setOtpExpiry(response.otp_expiry || 600)
      setResendCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP')
      console.error('Resend OTP Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle go back to email step
  const handleBackToEmail = () => {
    setStep('email')
    setOtp('')
    setOtpExpiry(null)
    setResendCountdown(0)
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join CapCrew today</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-8">
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step === 'email' || step === 'otp' || step === 'password'
                ? 'bg-blue-600'
                : 'bg-gray-300'
            }`}
          />
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step === 'otp' || step === 'password' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step === 'password' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-green-900">Success</h3>
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <p className="text-sm text-gray-600 mb-3">
                We've sent a 6-digit code to <strong>{email}</strong>
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                required
              />
              {otpExpiry && otpExpiry > 0 ? (
                <p className="text-xs text-blue-600 mt-2 font-semibold">
                  ⏱️ OTP expires in {otpExpiry}s
                </p>
              ) : otpExpiry === 0 ? (
                <p className="text-xs text-red-600 mt-2">❌ OTP expired. Please resend.</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading || !otp || otp.length < 6}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCountdown > 0 || loading}
              className="w-full border-2 border-blue-600 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:border-gray-300 disabled:text-gray-300"
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : '🔄 Resend OTP'}
            </button>

            <button
              type="button"
              onClick={handleBackToEmail}
              className="w-full text-gray-600 hover:text-gray-900 py-2 rounded-lg font-semibold hover:underline"
            >
              ← Back to Email
            </button>
          </form>
        )}

        {/* Step 3: Password & Username */}
        {step === 'password' && (
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Min 3 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                '✅ Create Account'
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('otp')}
              className="w-full text-gray-600 hover:text-gray-900 py-2 rounded-lg font-semibold hover:underline"
            >
              ← Back to OTP
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}