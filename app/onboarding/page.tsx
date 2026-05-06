import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OnboardingFlow from './OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Si ya completó el onboarding, redirigir al dashboard
  if (profile?.blood_type && profile?.birth_date) {
    redirect('/dashboard')
  }

  return <OnboardingFlow profile={profile} userId={user.id} />
}