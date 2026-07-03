import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { AXION_BRAND_LOGO } from '../utils/axionBrandLogo'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [notice, setNotice]     = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Email and password are required.'); return }
    setLoading(true); setError(''); setNotice('')
    const { error: err } = await signIn(email, password)
    if (err) { setError(err.message); setLoading(false) }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email above first, then click "Forgot password".'); return }
    setError(''); setNotice('')
    try {
      await userService.resetPassword(email)
      setNotice('Password reset link sent — check your email.')
    } catch (err) {
      setError(err.message || 'Could not send reset email.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Background — construction site photo via Unsplash ── */}
      <img
        src="/login-bg.png"
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* ── Dark overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(27,42,59,0.92) 0%, rgba(27,42,59,0.78) 50%, rgba(0,0,0,0.85) 100%)',
        zIndex: 1,
      }} />

      {/* ── Login card ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
        padding: '44px 48px',
        width: '100%',
        maxWidth: 420,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        margin: 24,
      }}>

        {/* ── Axion "AI" mark — left portion of logo only ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 16,
            overflow: 'hidden',
            display: 'inline-block',
            boxShadow: '0 8px 28px rgba(139,26,26,0.45)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {/* Show only the left ~27% of the logo (the red AI mark square) */}
            <img
              src={AXION_BRAND_LOGO}
              alt="Axion Imagineering"
              style={{
                width: '370%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'left center',
                display: 'block',
                marginLeft: 0,
              }}
            />
          </div>

          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '0.05em', marginTop: 16, marginBottom: 4 }}>
            APCP
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            Construction Project Control Platform
          </div>
          <div style={{ width: 36, height: 2, background: '#8B1A1A', margin: '14px auto 0', borderRadius: 2 }} />
        </div>

        <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Welcome back</div>
        <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginBottom: 26 }}>Sign in to continue to your workspace</div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="email"
              placeholder="you@axion.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
              style={{
                width: '100%',
                padding: '11px 14px 11px 38px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.13)',
                borderRadius: 9,
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(139,26,26,0.9)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.13)'}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                padding: '11px 40px 11px 38px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.13)',
                borderRadius: 9,
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(139,26,26,0.9)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.13)'}
            />
            <button
              onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(255,255,255,0.35)' }}
            >
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -12 }}>
          <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 11.5, padding: 0 }}>
            Forgot password?
          </button>
        </div>

        {/* Error / notice */}
        {error && (
          <div style={{
            background: 'rgba(185,28,28,0.18)',
            border: '1px solid rgba(185,28,28,0.45)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 12,
            color: '#FCA5A5',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{
            background: 'rgba(6,95,70,0.18)',
            border: '1px solid rgba(6,95,70,0.45)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 12,
            color: '#A7F3D0',
            marginBottom: 16,
          }}>
            {notice}
          </div>
        )}

        {/* Sign in button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#A52020' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#8B1A1A' }}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? 'rgba(139,26,26,0.5)' : '#8B1A1A',
            border: 'none',
            borderRadius: 9,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: loading ? 'none' : '0 4px 18px rgba(139,26,26,0.40)',
          }}
        >
          <Lock size={13} />
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {/* New employee? */}
        <Link to="/signup" style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
          New employee? <span style={{ color: '#fff', fontWeight: 600 }}>Create your account</span>
        </Link>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
          Access is managed by your administrator<br />
          Axion Imagineering Construction Co. W.L.L
        </div>
      </div>
    </div>
  )
}

// v3.2
