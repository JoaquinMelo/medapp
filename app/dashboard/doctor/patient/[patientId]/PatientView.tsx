'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'lab', label: 'Laboratorio', icon: '🧪', color: '#0891b2', bg: '#ecfeff' },
  { value: 'imaging', label: 'Imagen', icon: '🩻', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'prescription', label: 'Receta', icon: '💊', color: '#059669', bg: '#ecfdf5' },
  { value: 'report', label: 'Informe', icon: '📋', color: '#2563eb', bg: '#eff6ff' },
  { value: 'vaccine', label: 'Vacuna', icon: '💉', color: '#d97706', bg: '#fffbeb' },
  { value: 'other', label: 'Otro', icon: '📎', color: '#6b7280', bg: '#f9fafb' },
]

interface Patient {
  id: string
  full_name: string
  birth_date: string
  blood_type: string
  allergies: string[]
  chronic_conditions: string[]
  current_medications: string[]
  rut: string
  phone: string
}

interface Document {
  id: string
  title: string
  category: string
  document_date: string
  description: string
  storage_path: string
}

function getCat(value: string) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[5]
}

function calcAge(birthDate: string) {
  if (!birthDate) return null
  const diff = Date.now() - new Date(birthDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function PatientView({
  patient, documents, doctorId
}: {
  patient: Patient | null
  documents: Document[]
  doctorId: string
}) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? documents
    : documents.filter(d => d.category === filter)

  const handleView = async (doc: Document) => {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('medical-documents')
      .createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (!patient) return <p>Paciente no encontrado</p>

  const age = calcAge(patient.birth_date)

  return (
    <div>
      {/* Navegación */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/doctor" style={{
          fontSize: '13px', color: '#6b7280',
          textDecoration: 'none', display: 'inline-flex',
          alignItems: 'center', gap: '4px',
        }}>
          ← Volver al panel
        </Link>
      </div>

      {/* Ficha resumen del paciente */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#eff6ff', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '20px', color: '#2563eb', flexShrink: 0,
          }}>
            {patient.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              {patient.full_name}
            </h1>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' as const }}>
              {age && <span style={{ fontSize: '13px', color: '#6b7280' }}>{age} años</span>}
              {patient.rut && <span style={{ fontSize: '13px', color: '#6b7280' }}>RUT: {patient.rut}</span>}
              {patient.phone && <span style={{ fontSize: '13px', color: '#6b7280' }}>{patient.phone}</span>}
            </div>
          </div>
          {patient.blood_type && (
            <div style={{
              marginLeft: 'auto', padding: '6px 14px',
              background: '#fee2e2', borderRadius: '8px',
              fontWeight: 700, fontSize: '16px', color: '#b91c1c',
            }}>
              {patient.blood_type}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            {
              label: 'Alergias',
              items: patient.allergies,
              color: '#dc2626', bg: '#fff5f5', empty: 'Sin alergias registradas',
            },
            {
              label: 'Condiciones crónicas',
              items: patient.chronic_conditions,
              color: '#d97706', bg: '#fffbeb', empty: 'Sin condiciones registradas',
            },
            {
              label: 'Medicamentos actuales',
              items: patient.current_medications,
              color: '#2563eb', bg: '#eff6ff', empty: 'Sin medicamentos registrados',
            },
          ].map(section => (
            <div key={section.label} style={{
              background: section.bg, borderRadius: '8px', padding: '10px 12px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: section.color, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                {section.label}
              </p>
              {section.items?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {section.items.map((item, i) => (
                    <p key={i} style={{ fontSize: '13px', color: '#374151' }}>· {item}</p>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>{section.empty}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Documentos */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap' as const, gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>
            Documentos ({documents.length})
          </h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {['all', ...CATEGORIES.map(c => c.value)].map(val => {
              const cat = CATEGORIES.find(c => c.value === val)
              return (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                    border: '0.5px solid #e5e7eb', cursor: 'pointer',
                    background: filter === val ? (cat?.color || '#111827') : 'white',
                    color: filter === val ? 'white' : '#374151',
                  }}
                >
                  {val === 'all' ? 'Todos' : `${cat?.icon} ${cat?.label}`}
                </button>
              )
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center' as const, color: '#9ca3af', padding: '1.5rem 0', fontSize: '14px' }}>
            No hay documentos en esta categoría
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(doc => {
              const cat = getCat(doc.category)
              return (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '8px',
                  border: '0.5px solid #e5e7eb',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: cat.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0,
                  }}>
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                      {doc.title}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' as const }}>
                      <span style={{
                        fontSize: '11px', padding: '1px 6px',
                        borderRadius: '20px', background: cat.bg, color: cat.color,
                      }}>
                        {cat.label}
                      </span>
                      {doc.document_date && (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {new Date(doc.document_date + 'T12:00:00').toLocaleDateString('es-CL', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </span>
                      )}
                      {doc.description && (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>· {doc.description}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleView(doc)}
                    style={{
                      padding: '6px 14px', borderRadius: '8px',
                      border: '0.5px solid #e5e7eb', background: 'white',
                      fontSize: '13px', cursor: 'pointer', color: '#374151',
                      flexShrink: 0,
                    }}
                  >
                    Ver
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}