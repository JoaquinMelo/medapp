import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AccessManager from './AccessManager'

export default async function AccessPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: grants } = await supabase
    .from('access_grants')
    .select(`
      *,
      doctor:doctor_id (
        full_name,
        specialty
      )
    `)
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  const { data: logs } = await supabase
    .from('access_log')
    .select(`
      *,
      doctor:doctor_id (
        full_name
      )
    `)
    .eq('patient_id', user.id)
    .order('accessed_at', { ascending: false })
    .limit(10)

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={profile?.full_name || ''} role="patient" />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
            Acceso de médicos
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Genera tokens para que un médico pueda ver tu historial completo
          </p>
        </div>
        <AccessManager
          userId={user.id}
          grants={grants || []}
          logs={logs || []}
        />
      </main>
    </div>
  )
}