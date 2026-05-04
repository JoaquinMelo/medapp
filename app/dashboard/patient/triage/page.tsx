import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import TriageChat from './TriageChat'

export default async function TriagePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, blood_type, allergies, chronic_conditions, current_medications, birth_date')
    .eq('id', user.id)
    .single()

  const { data: history } = await supabase
    .from('ai_consultations')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const isProfileComplete = profile?.blood_type || profile?.allergies?.length || profile?.chronic_conditions?.length

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={profile?.full_name || ''} role="patient" />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
            Consulta con IA
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Describe tus síntomas y recibirás orientación basada en tu historial médico
          </p>
        </div>

        {!isProfileComplete && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem',
          }}>
            <p style={{ fontSize: '13px', color: '#92400e' }}>
              ⚠️ Tu perfil está incompleto. Completar alergias y condiciones crónicas mejora la orientación que recibes.
            </p>
          </div>
        )}

        <TriageChat history={history || []} />
      </main>
    </div>
  )
}