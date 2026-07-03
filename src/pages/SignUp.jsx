import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { userService } from '../services/userService'
import { Eye, EyeOff, Lock, Mail, UserCircle, ArrowLeft } from 'lucide-react'
import { AXION_BRAND_LOGO } from '../utils/axionBrandLogo'

export default function SignUp() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleSignUp() {
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      // Only employees already registered by an Administrator can create an account —
      // this is a client-side check only (see project memory: RLS is off project-wide).
      const { data: matches } = await supabase
        .from('employees')
        .select('*')
        .ilike('email', email.trim())
        .limit(1)
      const matchedEmployee = matches?.[0]

      if (!matchedEmployee) {
        setError("No employee record found for this email. Contact your Administrator to be added first.")
        setLoading(false)
        return
      }
      if (matchedEmployee.status !== 'Active') {
        setError('This employee record is marked Inactive. Contact your Administrator.')
        setLoading(false)
        return
      }

      await userService.signUp({ email: email.trim(), password, matchedEmployee })
      setDone(true)
    } catch (err) {
      setError(err.message || 'Sign up failed.')
    }
    setLoading(false)
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
      <img src="/login-bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(27,42,59,0.92) 0%, rgba(27,42,59,0.78) 50%, rgba(0,0,0,0.85) 100%)', zIndex: 1 }} />

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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', display: 'inline-block', boxShadow: '0 8px 28px rgba(139,26,26,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={AXION_BRAND_LOGO} alt="Axion Imagineering" style={{ width: '370%', height: '100%', objectFit: 'cover', objectPosition: 'left center', display: 'block' }} />
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '0.05em', marginTop: 16, marginBottom: 4 }}>APCP</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase' }}>Construction Project Control Platform</div>
          <div style={{ width: 36, height: 2, background: '#8B1A1A', margin: '14px auto 0', borderRadius: 2 }} />
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Account created</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, lineHeight: 1.6, marginBottom: 22 }}>
              You've been linked to your employee record as <b>Viewer</b> access. Your Administrator will assign your full role shortly. Sign in below to continue.
            </div>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              width: '100%', padding: '12px', background: '#8B1A1A', border: 'none', borderRadius: 9,
              color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box',
            }}>
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Create your account</div>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginBottom: 26 }}>Your email must already be registered by an Administrator</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="email" placeholder="you@axion.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus
                  style={{ width: '100%', padding: '11px 14px 11px 38px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 9, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPw ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '11px 40px 11px 38px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 9, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(255,255,255,0.35)' }}>
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <UserCircle size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPw ? 'text' : 'password'} placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignUp()}
                  style={{ width: '100%', padding: '11px 14px 11px 38px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 9, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(185,28,28,0.18)', border: '1px solid rgba(185,28,28,0.45)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#FCA5A5', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button onClick={handleSignUp} disabled={loading} style={{
              width: '100%', padding: '12px', background: loading ? 'rgba(139,26,26,0.5)' : '#8B1A1A', border: 'none', borderRadius: 9,
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 18px rgba(139,26,26,0.40)',
            }}>
              <Lock size={13} />
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
              <ArrowLeft size={12} /> Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
