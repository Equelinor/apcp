export default function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--brand-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      {children}
    </div>
  )
}
