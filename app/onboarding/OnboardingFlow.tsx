'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const STEPS = [
  { id: 1, title: 'Datos básicos', icon: '👤' },
  { id: 2, title: 'Información clínica', icon: '🏥' },
  { id: 3, title: 'Listo', icon: '✅' },
]

interface Profile {
  full_name: string
  birth_date: string
  phone: string
  rut: string
  blood_type: string
  allergies: string[]
  chronic_conditions: string[]
  current_medications: string[]
}

export default function OnboardingFlow({
  profile, userId
}: {
  profile: Profile | null
  userId: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    birth_date: profile?.birth_date || '',
    phone: profile?.phone || '',
    rut: profile?.rut || '',
    blood_type: profile?.blood_type || '',
    allergies: (profile?.allergies || []).join(', '),
    chronic_conditions: (profile?.chronic_conditions || []).join(', '),
    current_medications: (profile?.current_medications || []).join(', '),
  })

  const toArray = (val: string) =>
    val.split(',').map(s => s.trim()).filter(Boolean)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({
      full_name: form.full_name,
      birth_date: form.birth_date || null,
      phone: form.phone,
      rut: form.rut,
      blood_type: form.blood_type,
      allergies: toArray(form.allergies),
      chronic_conditions: toArray(form.chronic_conditions),
      current_medications: toArray(form.current_medications),
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    setSaving(false)
    setStep(3)
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
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2rem' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px',
                background: step >= s.id ? '#2563eb' : '#e5e7eb',
                color: step >= s.id ? 'white' : '#9ca3af',
                fontWeight: 600, fontSize: '14px',
              }}>
                {step > s.id ? '✓' : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: '40px', height: '2px',
                  background: step > s.id ? '#2563eb' : '#e5e7eb',
                }} />
              )}
            </div>
          ))}
        </div>

        <div style={{
          background: 'white', borderRadius: '16px',
          border: '0.5px solid #e5e7eb', padding: '2rem',
        }}>

          {/* Step 1 — Datos básicos */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: 'center' as const, marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '28px', marginBottom: '8px' }}>👤</p>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                  ¿Cómo te llamas?
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  Completa tus datos básicos para empezar
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Nombre completo</label>
                  <input style={inputStyle} placeholder="Juan Pérez"
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>RUT</label>
                    <input style={inputStyle} placeholder="12.345.678-9"
                      value={form.rut}
                      onChange={e => setForm(p => ({ ...p, rut: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input style={inputStyle} placeholder="+56 9 1234 5678"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha de nacimiento</label>
                    <input style={inputStyle} type="date"
                      value={form.birth_date}
                      onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Grupo sanguíneo</label>
                    <select style={inputStyle} value={form.blood_type}
                      onChange={e => setForm(p => ({ ...p, blood_type: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.full_name}
                style={{
                  width: '100%', padding: '11px', marginTop: '1.5rem',
                  borderRadius: '8px', border: 'none',
                  background: !form.full_name ? '#93c5fd' : '#2563eb',
                  color: 'white', fontWeight: 600, fontSize: '15px',
                  cursor: !form.full_name ? 'not-allowed' : 'pointer',
                }}
              >
                Continuar →
              </button>
            </div>
          )}

          {/* Step 2 — Información clínica */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: 'center' as const, marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '28px', marginBottom: '8px' }}>🏥</p>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                  Información clínica
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  La IA usa esto para darte orientación personalizada. Separa con comas.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Alergias conocidas</label>
                  <input style={inputStyle} placeholder="Penicilina, Mariscos, Polen..."
                    value={form.allergies}
                    onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Condiciones crónicas</label>
                  <input style={inputStyle} placeholder="Diabetes tipo 2, Hipertensión..."
                    value={form.chronic_conditions}
                    onChange={e => setForm(p => ({ ...p, chronic_conditions: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Medicamentos actuales</label>
                  <input style={inputStyle} placeholder="Metformina 850mg, Losartán 50mg..."
                    value={form.current_medications}
                    onChange={e => setForm(p => ({ ...p, current_medications: e.target.value }))} />
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                  💡 Puedes dejar estos campos vacíos y completarlos después desde tu perfil
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '11px 20px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', background: 'white',
                    fontSize: '14px', cursor: 'pointer', color: '#374151',
                  }}
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '8px',
                    border: 'none', background: saving ? '#93c5fd' : '#2563eb',
                    color: 'white', fontWeight: 600, fontSize: '15px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar y continuar →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Listo */}
          {step === 3 && (
            <div style={{ textAlign: 'center' as const }}>
              <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🎉</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                ¡Todo listo!
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2rem', lineHeight: 1.6 }}>
                Tu perfil está configurado. Ahora puedes subir tus primeros documentos médicos y usar la IA para orientación.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
                {[
                  { icon: '📄', text: 'Sube tus exámenes y recetas' },
                  { icon: '🤖', text: 'Consulta con la IA sobre tus síntomas' },
                  { icon: '🔐', text: 'Comparte tu historial con tu médico' },
                ].map(item => (
                  <div key={item.text} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', borderRadius: '8px', background: '#f9fafb',
                    textAlign: 'left' as const,
                  }}>
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <span style={{ fontSize: '14px', color: '#374151' }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/dashboard/patient')}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  border: 'none', background: '#2563eb',
                  color: 'white', fontWeight: 600, fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Ir a mi dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}