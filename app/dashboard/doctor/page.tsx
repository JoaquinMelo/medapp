import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import DoctorPanel from './DoctorPanel'

export default async function DoctorDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Pacientes con acceso activo
  const { data: grants } = await supabase
    .from('access_grants')
    .select(`
      *,
      patient:patient_id (
        id,
        full_name,
        birth_date,
        blood_type,
        allergies,
        chronic_conditions
      )
    `)
    .eq('doctor_id', user.id)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={profile?.full_name || ''} role="doctor" />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
            Panel médico
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            {profile?.specialty || 'Médico'} · {grants?.length || 0} paciente{grants?.length !== 1 ? 's' : ''} con acceso activo
          </p>
        </div>
        <DoctorPanel
          doctorId={user.id}
          grants={grants || []}
        />
      </main>
    </div>
  )
}