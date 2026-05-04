'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

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

export default function ProfileForm({ profile, userId }: { profile: Profile | null, userId: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    const toArray = (val: string) =>
      val.split(',').map(s => s.trim()).filter(Boolean)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        phone: form.phone,
        rut: form.rut,
        blood_type: form.blood_type,
        allergies: toArray(form.allergies),
        chronic_conditions: toArray(form.chronic_conditions),
        current_medications: toArray(form.current_medications),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    }
  }

  const fieldStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    background: 'white',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#374151',
    marginBottom: '4px',
  }

  const sectionStyle = {
    background: 'white',
    borderRadius: '12px',
    border: '0.5px solid #e5e7eb',
    padding: '1.25rem',
    marginBottom: '1rem',
  }

  return (
    <div>
      {/* Datos personales */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          Datos personales
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nombre completo</label>
            <input style={fieldStyle} value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>RUT</label>
            <input style={fieldStyle} placeholder="12.345.678-9" value={form.rut}
              onChange={e => setForm(p => ({ ...p, rut: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input style={fieldStyle} placeholder="+56 9 1234 5678" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Fecha de nacimiento</label>
            <input style={fieldStyle} type="date" value={form.birth_date}
              onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Grupo sanguíneo</label>
            <select style={fieldStyle} value={form.blood_type}
              onChange={e => setForm(p => ({ ...p, blood_type: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Información clínica */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: '#111827' }}>
          Información clínica
        </h2>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '1rem' }}>
          Separa múltiples valores con coma. Ej: Penicilina, Aspirina
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Alergias</label>
            <input style={fieldStyle} placeholder="Penicilina, Mariscos, Polen..."
              value={form.allergies}
              onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Condiciones crónicas</label>
            <input style={fieldStyle} placeholder="Diabetes tipo 2, Hipertensión..."
              value={form.chronic_conditions}
              onChange={e => setForm(p => ({ ...p, chronic_conditions: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Medicamentos actuales</label>
            <input style={fieldStyle} placeholder="Metformina 850mg, Losartán 50mg..."
              value={form.current_medications}
              onChange={e => setForm(p => ({ ...p, current_medications: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Botón guardar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: '8px',
            background: saving ? '#93c5fd' : '#2563eb',
            color: 'white', border: 'none',
            fontWeight: 600, fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && (
          <span style={{ fontSize: '14px', color: '#059669', fontWeight: 500 }}>
            ✅ Guardado correctamente
          </span>
        )}
      </div>
    </div>
  )
}