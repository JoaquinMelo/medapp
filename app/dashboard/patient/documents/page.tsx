import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import DocumentsList from './DocumentsList'

export default async function DocumentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: documents } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('patient_id', user.id)
    .order('document_date', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={profile?.full_name || ''} role="patient" />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>Mis documentos</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              {documents?.length || 0} documento{documents?.length !== 1 ? 's' : ''} en tu historial
            </p>
          </div>
        </div>
        <DocumentsList documents={documents || []} userId={user.id} />
      </main>
    </div>
  )
}