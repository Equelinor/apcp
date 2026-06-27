import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'ok') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return { toasts, toast }
}

export function ToastContainer({ toasts }) {
  const colors = { ok: '#146C43', err: '#B91C1C', warn: '#92600A', info: '#1558A0' }
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 16px', background: colors[t.type] || colors.ok,
          color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', maxWidth: 320
        }}>{t.message}</div>
      ))}
    </div>
  )
}
