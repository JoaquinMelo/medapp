'use client'
import Link from 'next/link'
import { useState } from 'react'

const cards = [
  {
    href: '/dashboard/patient/profile',
    title: 'Mi perfil médico',
    desc: 'Alergias, condiciones, medicamentos',
    icon: '👤', color: '#0891b2',
  },
  {
    href: '/dashboard/patient/documents',
    title: 'Mis documentos',
    desc: 'Exámenes, recetas, informes',
    icon: '📄', color: '#7c3aed',
  },
  {
    href: '/dashboard/patient/triage',
    title: 'Consultar con IA',
    desc: 'Orientación según tus síntomas',
    icon: '🤖', color: '#059669',
  },
  {
    href: '/dashboard/patient/access',
    title: 'Acceso médicos',
    desc: 'Gestionar quién ve tu historial',
    icon: '🔐', color: '#d97706',
  },
]

function Card({ href, title, desc, icon, color }: typeof cards[0]) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'white',
          borderRadius: '10px',
          border: `0.5px solid ${hovered ? color : '#e5e7eb'}`,
          padding: '1.25rem',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
        <p style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{title}</p>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{desc}</p>
      </div>
    </Link>
  )
}

export default function QuickAccessCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      {cards.map(card => <Card key={card.href} {...card} />)}
    </div>
  )
}