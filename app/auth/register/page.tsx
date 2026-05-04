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
    // Solo médicos
    specialty: '',
    medicalLicense: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        maxWidth: '420px',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '0.25rem' }}>
          Crear cuenta
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" style={{ color: '#2563eb' }}>Inicia sesión</Link>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Selector de rol */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
            {(['patient', 'doctor'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, role: r }))}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: form.role === r ? '2px solid #2563eb' : '1px solid #e0e0e0',
                  background: form.role === r ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  fontWeight: form.role === r ? 600 : 400,
                  fontSize: '14px',
                  color: form.role === r ? '#2563eb' : '#333',
                }}
              >
                {r === 'patient' ? '🧑 Paciente' : '👩‍⚕️ Médico'}
              </button>
            ))}
          </div>

          {/* Campos comunes */}
          {[
            { name: 'fullName', label: 'Nombre completo', type: 'text', placeholder: 'Juan Pérez' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'juan@email.com' },
            { name: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 8 caracteres' },
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
                onChange={handleChange}
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

          {/* Campos solo para médicos */}
          {form.role === 'doctor' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                  Especialidad
                </label>
                <input
                  name="specialty"
                  type="text"
                  placeholder="Medicina general, Cardiología..."
                  value={form.specialty}
                  onChange={handleChange}
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
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                  Número de registro (SIS)
                </label>
                <input
                  name="medicalLicense"
                  type="text"
                  placeholder="Ej: 12345"
                  value={form.medicalLicense}
                  onChange={handleChange}
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
            </>
          )}

          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>
              {error}
            </p>
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}