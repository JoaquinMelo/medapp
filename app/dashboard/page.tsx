import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, blood_type, birth_date')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Pacientes sin perfil completo van al onboarding
  if (profile.role === 'patient' && (!profile.blood_type || !profile.birth_date)) {
    redirect('/onboarding')
  }

  if (profile.role === 'doctor') {
    redirect('/dashboard/doctor')
  }

  redirect('/dashboard/patient')
}