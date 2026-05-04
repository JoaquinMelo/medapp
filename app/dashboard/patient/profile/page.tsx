import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar userName={profile?.full_name || ''} role="patient" />
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>Mi perfil médico</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Esta información la usa la IA para darte orientación personalizada
          </p>
        </div>
        <ProfileForm profile={profile} userId={user.id} />
      </main>
    </div>
  )
}