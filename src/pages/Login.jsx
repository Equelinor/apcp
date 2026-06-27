import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Enter email and password.'); return }
    setLoading(true); setError('')
    const { error: err } = await signIn(email, password)
    if (err) { setError(err.message); setLoading(false) }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 16,
      padding: '40px 44px', width: 420,
      boxShadow: '0 24px 70px rgba(0,0,0,0.44)'
    }}>
      {/* Logo mark */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, background: 'var(--brand-primary)',
          borderRadius: 14, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 900, fontSize: 16,
          color: 'var(--brand-accent)', marginBottom: 14
        }}>AX</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
          Axion Project Control
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          APCP v3 · Construction Management Platform
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 14 }}>
        <label className="form-label">Email</label>
        <input
          className="form-input"
          type="email"
          placeholder="you@axion.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          autoFocus
        />
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">Password</label>
        <input
          className="form-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
      </div>

      {error && (
        <div style={{
          background: 'var(--status-rejected-bg)', color: 'var(--status-rejected-text)',
          border: '1px solid #fca5a5', borderRadius: 'var(--radius)',
          padding: '8px 12px', fontSize: 12, marginBottom: 14
        }}>{error}</div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleLogin}
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'var(--text-muted)' }}>
        Access managed by your Admin · Axion Imagineering Construction Co.
      </div>
    </div>
  )
}
