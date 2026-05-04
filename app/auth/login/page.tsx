'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(form)

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background-tertiary, #f5f5f5)',
      padding: '2rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '0.5px solid #e0e0e0',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '0.25rem' }}>
          Iniciar sesión
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/auth/register" style={{ color: '#2563eb' }}>Regístrate</Link>
        </p>

        <form onSubmit={handleSubmit}>
          {[
            { name: 'email', label: 'Email', type: 'email', placeholder: 'juan@email.com' },
            { name: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
          ].map(field => (
            <div key={field.name} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                {field.label}
              </label>
              <input
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.name as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: loading ? '#93c5fd' : '#2563eb',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}