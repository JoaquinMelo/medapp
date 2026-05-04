import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PatientView from './PatientView'

export default async function PatientHistoryPage({
  params
}: {
  params: Promise<{ patientId: string }>
}) {
  const { patientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verificar que el médico tiene acceso vigente
  const { data: grant } = await supabase
    .from('access_grants')
    .select('id')
    .eq('doctor_id', user.id)
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!grant) redirect('/dashboard/doctor')

  // Registrar acceso en el log
  await supabase.from('access_log').insert({
    grant_id: grant.id,
    doctor_id: user.id,
    patient_id: patientId,
    action: 'viewed_history',
  })

  // Cargar datos del paciente
  const { data: patient } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .single()

  const { data: documents } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('document_date', { ascending: false })

  const { data: doctorProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={doctorProfile?.full_name || ''} role="doctor" />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <PatientView
          patient={patient}
          documents={documents || []}
          doctorId={user.id}
        />
      </main>
    </div>
  )
}