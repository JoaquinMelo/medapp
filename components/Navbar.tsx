'use client'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  userName: string
  role: 'patient' | 'doctor'
}

export default function Navbar({ userName, role }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav style={{
      height: '56px',
      borderBottom: '0.5px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      background: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px', height: '28px',
          background: role === 'doctor' ? '#2563eb' : '#0891b2',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px',
        }}>
          {role === 'doctor' ? '⚕' : '♥'}
        </div>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>MedApp</span>
        <span style={{
          fontSize: '11px', padding: '2px 8px',
          borderRadius: '20px',
          background: role === 'doctor' ? '#eff6ff' : '#ecfeff',
          color: role === 'doctor' ? '#1d4ed8' : '#0e7490',
          fontWeight: 500,
        }}>
          {role === 'doctor' ? 'Médico' : 'Paciente'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>{userName}</span>
        <button
          onClick={handleLogout}
          style={{
            fontSize: '13px', padding: '6px 12px',
            borderRadius: '8px', border: '0.5px solid #e5e7eb',
            background: 'white', cursor: 'pointer', color: '#374151',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}