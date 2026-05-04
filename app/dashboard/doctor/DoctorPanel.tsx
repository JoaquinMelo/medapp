'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Grant {
  id: string
  expires_at: string
  patient: {
    id: string
    full_name: string
    birth_date: string
    blood_type: string
    allergies: string[]
    chronic_conditions: string[]
  } | null
}

export default function DoctorPanel({
  doctorId, grants
}: {
  doctorId: string
  grants: Grant[]
}) {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAccess = async () => {
  if (!token.trim()) {
    setError('Ingresa el token del paciente')
    return
  }
  setLoading(true)
  setError('')
  setSuccess('')

  const supabase = createClient()

  // Buscar el grant por token — sin filtrar por doctor_id todavía
  const { data: grant, error: grantError } = await supabase
    .from('access_grants')
    .select('*, patient:patient_id(full_name)')
    .eq('token', token.trim())
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (grantError || !grant) {
    setError('Token inválido, expirado o ya revocado')
    setLoading(false)
    return
  }

  // Asignar el médico al grant si aún no tiene uno
  if (!grant.doctor_id) {
    const { error: updateError } = await supabase
      .from('access_grants')
      .update({ doctor_id: doctorId })
      .eq('id', grant.id)

    if (updateError) {
      setError('Error al vincular el acceso')
      setLoading(false)
      return
    }
  } else if (grant.doctor_id !== doctorId) {
    // El token ya fue usado por otro médico
    setError('Este token ya fue utilizado por otro médico')
    setLoading(false)
    return
  }

  // Registrar en el log
  await supabase.from('access_log').insert({
    grant_id: grant.id,
    doctor_id: doctorId,
    patient_id: grant.patient_id,
    action: 'token_used',
  })

  setSuccess(`Acceso concedido a ${grant.patient?.full_name || 'el paciente'}`)
  setToken('')
  setLoading(false)
  router.refresh()
}

  const calcAge = (birthDate: string) => {
    if (!birthDate) return null
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Ingresar token */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
          Ingresar token de paciente
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1rem' }}>
          El paciente te comparte un token desde su app para darte acceso a su historial
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Pega el token aquí..."
            style={{
              flex: 1, padding: '9px 12px',
              borderRadius: '8px', border: '1px solid #e5e7eb',
              fontSize: '14px', fontFamily: 'monospace',
            }}
            onKeyDown={e => e.key === 'Enter' && handleAccess()}
          />
          <button
            onClick={handleAccess}
            disabled={loading}
            style={{
              padding: '9px 20px', borderRadius: '8px',
              background: loading ? '#93c5fd' : '#2563eb',
              color: 'white', border: 'none',
              fontWeight: 600, fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {loading ? 'Verificando...' : 'Acceder'}
          </button>
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>{error}</p>
        )}
        {success && (
          <p style={{ color: '#059669', fontSize: '13px', marginTop: '8px' }}>✅ {success}</p>
        )}
      </div>

      {/* Pacientes con acceso activo */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
          Pacientes con acceso activo ({grants.length})
        </h2>

        {grants.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '1.5rem 0', color: '#9ca3af' }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>👥</p>
            <p style={{ fontSize: '14px' }}>Aún no tienes pacientes con acceso</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Pídele a tu paciente que genere un token desde su app
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {grants.map(grant => {
              const p = grant.patient
              if (!p) return null
              const age = calcAge(p.birth_date)

              return (
                <div key={grant.id} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: '10px',
                  border: '0.5px solid #e5e7eb', background: '#fafafa',
                  flexWrap: 'wrap' as const, gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: '#eff6ff', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: '15px', color: '#2563eb',
                      flexShrink: 0,
                    }}>
                      {p.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                        {p.full_name}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginTop: '3px' }}>
                        {age && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{age} años</span>
                        )}
                        {p.blood_type && (
                          <span style={{
                            fontSize: '11px', padding: '1px 6px',
                            borderRadius: '20px', background: '#fee2e2', color: '#b91c1c',
                            fontWeight: 500,
                          }}>
                            {p.blood_type}
                          </span>
                        )}
                        {p.allergies?.length > 0 && (
                          <span style={{ fontSize: '12px', color: '#d97706' }}>
                            ⚠️ {p.allergies.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Vence {new Date(grant.expires_at).toLocaleDateString('es-CL')}
                    </span>
                    <Link
                      href={`/dashboard/doctor/patient/${p.id}`}
                      style={{
                        padding: '6px 14px', borderRadius: '8px',
                        background: '#2563eb', color: 'white',
                        textDecoration: 'none', fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      Ver historial
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}