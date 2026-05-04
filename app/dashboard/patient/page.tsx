import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import QuickAccessCards from '@/components/QuickAccessCards'
import Link from 'next/link'

export default async function PatientDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { count: docCount } = await supabase
    .from('medical_documents')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', user.id)

  const { count: consultCount } = await supabase
    .from('ai_consultations')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', user.id)

  const isProfileComplete = profile?.blood_type && profile?.birth_date

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={profile?.full_name || 'Paciente'} role="patient" />

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Alerta si el perfil está incompleto */}
        {!isProfileComplete && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: '10px', padding: '1rem 1.25rem',
            marginBottom: '1.5rem', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontWeight: 500, color: '#92400e', fontSize: '14px' }}>
                ⚠️ Tu perfil médico está incompleto
              </p>
              <p style={{ color: '#b45309', fontSize: '13px', marginTop: '2px' }}>
                Completa tu información para que la IA pueda darte orientación personalizada
              </p>
            </div>
            <Link href="/dashboard/patient/profile" style={{
              fontSize: '13px', padding: '6px 14px',
              borderRadius: '8px', background: '#f59e0b',
              color: 'white', textDecoration: 'none', fontWeight: 500,
              whiteSpace: 'nowrap', marginLeft: '1rem',
            }}>
              Completar perfil
            </Link>
          </div>
        )}

        {/* Saludo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827' }}>
            Hola, {profile?.full_name?.split(' ')[0] || 'Paciente'} 👋
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Tu historial médico personal, siempre disponible
          </p>
        </div>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          {[
            { label: 'Documentos subidos', value: docCount || 0, color: '#0891b2', bg: '#ecfeff' },
            { label: 'Consultas con IA', value: consultCount || 0, color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Accesos médicos', value: 0, color: '#059669', bg: '#ecfdf5' },
          ].map(m => (
            <div key={m.label} style={{
              background: m.bg, borderRadius: '10px',
              padding: '1rem 1.25rem',
            }}>
              <p style={{ fontSize: '26px', fontWeight: 700, color: m.color }}>{m.value}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <QuickAccessCards />

      </main>
    </div>
  )
}