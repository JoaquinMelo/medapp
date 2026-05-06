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
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    }}>
      {/* Panel izquierdo — branding */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '3rem',
        color: 'white',
      }}>
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', marginBottom: '1.5rem',
          }}>
            ♥
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.2 }}>
            Tu historial médico,<br />siempre contigo
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.85, lineHeight: 1.6 }}>
            Organiza tus exámenes, recetas e informes en un solo lugar. Con IA que conoce tu historial completo.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { icon: '🔒', text: 'Datos encriptados y privados' },
            { icon: '🤖', text: 'IA que orienta según tu historial' },
            { icon: '👩‍⚕️', text: 'Comparte con tu médico cuando quieras' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '3rem',
        background: '#f9fafb',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>
            Iniciar sesión
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2rem' }}>
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register" style={{ color: '#2563eb', fontWeight: 500 }}>
              Regístrate gratis
            </Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: '8px', border: '1px solid #e5e7eb',
                  fontSize: '14px', boxSizing: 'border-box' as const,
                  background: 'white',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: '8px', border: '1px solid #e5e7eb',
                  fontSize: '14px', boxSizing: 'border-box' as const,
                  background: 'white',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: '#fff5f5', border: '1px solid #fecaca',
                fontSize: '13px', color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                borderRadius: '8px',
                background: loading ? '#93c5fd' : '#2563eb',
                color: 'white', border: 'none',
                fontWeight: 600, fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}