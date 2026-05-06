'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'patient' as 'patient' | 'doctor',
    specialty: '',
    medicalLicense: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          role: form.role,
          specialty: form.specialty || null,
          medical_license: form.medicalLicense || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    borderRadius: '8px', border: '1px solid #e5e7eb',
    fontSize: '14px', boxSizing: 'border-box' as const,
    background: 'white',
  }

  const labelStyle = {
    display: 'block', fontSize: '13px',
    fontWeight: 500 as const, color: '#374151', marginBottom: '6px',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    }}>
      {/* Panel izquierdo */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '3rem', color: 'white',
      }}>
        <div style={{
          width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)',
          borderRadius: '12px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', marginBottom: '1.5rem',
        }}>
          ♥
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.3 }}>
          Empieza a organizar tu salud hoy
        </h1>
        <p style={{ fontSize: '15px', opacity: 0.85, lineHeight: 1.6, marginBottom: '2rem' }}>
          Crea tu cuenta en menos de 2 minutos y ten tu historial médico siempre disponible.
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
          padding: '1.25rem',
        }}>
          <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.6 }}>
            "Tener todo el historial médico en un lugar me permite dar una atención mucho más completa a mis pacientes."
          </p>
          <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
            — Médico beta tester
          </p>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '3rem',
        background: '#f9fafb', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>
            Crear cuenta
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '1.5rem' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" style={{ color: '#2563eb', fontWeight: 500 }}>
              Inicia sesión
            </Link>
          </p>

          {/* Selector de rol */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
            {(['patient', 'doctor'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, role: r }))}
                style={{
                  padding: '12px', borderRadius: '10px',
                  border: form.role === r ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  background: form.role === r ? '#eff6ff' : 'white',
                  cursor: 'pointer', fontSize: '14px',
                  color: form.role === r ? '#2563eb' : '#374151',
                  fontWeight: form.role === r ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                  {r === 'patient' ? '🧑' : '👩‍⚕️'}
                </div>
                {r === 'patient' ? 'Soy paciente' : 'Soy médico'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input name="fullName" type="text" placeholder="Juan Pérez"
                value={form.fullName} onChange={handleChange} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" placeholder="juan@email.com"
                value={form.email} onChange={handleChange} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Contraseña</label>
              <input name="password" type="password" placeholder="Mínimo 8 caracteres"
                value={form.password} onChange={handleChange} required style={inputStyle} />
            </div>

            {form.role === 'doctor' && (
              <>
                <div>
                  <label style={labelStyle}>Especialidad</label>
                  <input name="specialty" type="text" placeholder="Medicina general, Cardiología..."
                    value={form.specialty} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Número de registro (SIS)</label>
                  <input name="medicalLicense" type="text" placeholder="Ej: 12345"
                    value={form.medicalLicense} onChange={handleChange} style={inputStyle} />
                </div>
              </>
            )}

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
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>

            <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }}>
              Al registrarte aceptas que tus datos están protegidos bajo la Ley 19.628 de Chile
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}