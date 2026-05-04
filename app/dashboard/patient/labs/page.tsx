import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import LabChart from './LabChart'

export default async function LabsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: labValues } = await supabase
    .from('lab_values')
    .select('*, document:document_id(title, document_date)')
    .eq('patient_id', user.id)
    .order('measured_at', { ascending: true })

  // Agrupar por nombre de parámetro
  const grouped: Record<string, typeof labValues> = {}
  labValues?.forEach(v => {
    if (!grouped[v.name]) grouped[v.name] = []
    grouped[v.name]!.push(v)
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={profile?.full_name || ''} role="patient" />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
            Valores de laboratorio
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Evolución de tus parámetros en el tiempo
          </p>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '12px',
            border: '0.5px solid #e5e7eb', padding: '3rem',
            textAlign: 'center' as const, color: '#9ca3af',
          }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>🧪</p>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280' }}>
              Aún no tienes valores extraídos
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Sube un examen de laboratorio y haz clic en "Extraer"
            </p>
          </div>
        ) : (
          <LabChart grouped={grouped} />
        )}
      </main>
    </div>
  )
}