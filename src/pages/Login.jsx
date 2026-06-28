import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Lock, Mail, HardHat } from 'lucide-react'

const LIFECYCLE = [
  { icon: '📋', label: 'DOCUMENTS', sub: 'Document Control' },
  { icon: '🛒', label: 'PROCUREMENT', sub: 'Materials & Supply' },
  { icon: '🏗️', label: 'SITE', sub: 'Daily Execution' },
  { icon: '✅', label: 'QUALITY', sub: 'QA / QC' },
  { icon: '📊', label: 'MONITOR', sub: 'Progress Tracking' },
  { icon: '💰', label: 'COMMERCIAL', sub: 'Valuations & VO' },
  { icon: '🔑', label: 'HANDOVER', sub: 'Closeout & DLP' },
]

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Email and password are required.'); return }
    setLoading(true); setError('')
    const { error: err } = await signIn(email, password)
    if (err) { setError(err.message); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#1B2A3B',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>

      {/* ── Left panel — lifecycle strip ── */}
      <div style={{
        width: 220,
        background: 'rgba(0,0,0,0.25)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 0',
        flexShrink: 0,
      }}>
        {/* Brand mark */}
        <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: '#8B1A1A',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <HardHat size={18} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.06em' }}>APCP</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Axion Imagineering</div>
            </div>
          </div>
        </div>

        {/* Lifecycle items */}
        <div style={{ flex: 1, padding: '24px 0' }}>
          {LIFECYCLE.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 24px',
              opacity: 0.45,
            }}>
              <div style={{ width: 28, textAlign: 'center', fontSize: 15 }}>{item.icon}</div>
              <div>
                <div style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, marginTop: 1 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 24px', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
          © 2025 APCP · Axion Imagineering<br />Construction Co. W.L.L
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: 'linear-gradient(135deg, #1B2A3B 0%, #243547 60%, #1B2A3B 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Subtle background grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          padding: '44px 48px',
          width: '100%',
          maxWidth: 420,
          backdropFilter: 'blur(12px)',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* Logo area */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            {/* Axion logo placeholder — will show actual logo once uploaded to project */}
            <div style={{
              width: 64, height: 64,
              background: '#8B1A1A',
              borderRadius: 16,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
              boxShadow: '0 8px 24px rgba(139,26,26,0.4)',
            }}>
              <HardHat size={30} color="#fff" />
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>
              APCP
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Construction Project Control Platform
            </div>
            <div style={{ width: 40, height: 2, background: '#8B1A1A', margin: '16px auto 0', borderRadius: 2 }} />
          </div>

          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Welcome back</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 28 }}>Sign in to continue to your workspace</div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
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
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(139,26,26,0.8)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(139,26,26,0.8)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
              <button
                onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(255,255,255,0.35)' }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(185,28,28,0.15)',
              border: '1px solid rgba(185,28,28,0.4)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12,
              color: '#FCA5A5',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? 'rgba(139,26,26,0.5)' : '#8B1A1A',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(139,26,26,0.35)',
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = '#A52020' }}
            onMouseLeave={e => { if (!loading) e.target.style.background = '#8B1A1A' }}
          >
            <Lock size={14} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
            Access is managed by your administrator<br />
            Axion Imagineering Construction Co. W.L.L
          </div>
        </div>
      </div>
    </div>
  )
}
