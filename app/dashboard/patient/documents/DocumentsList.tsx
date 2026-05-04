'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'lab', label: 'Examen de laboratorio', icon: '🧪', color: '#0891b2', bg: '#ecfeff' },
  { value: 'imaging', label: 'Imagen / Radiología', icon: '🩻', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'prescription', label: 'Receta médica', icon: '💊', color: '#059669', bg: '#ecfdf5' },
  { value: 'report', label: 'Informe médico', icon: '📋', color: '#2563eb', bg: '#eff6ff' },
  { value: 'vaccine', label: 'Vacuna', icon: '💉', color: '#d97706', bg: '#fffbeb' },
  { value: 'other', label: 'Otro', icon: '📎', color: '#6b7280', bg: '#f9fafb' },
]

interface Document {
  id: string
  title: string
  category: string
  document_date: string
  description: string
  storage_path: string
  ai_summary: string
  created_at: string
}

function getCat(value: string) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[5]
}

export default function DocumentsList({ documents, userId }: { documents: Document[], userId: string }) {
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)
  const [filter, setFilter] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [form, setForm] = useState({
    title: '',
    category: 'lab',
    document_date: '',
    description: '',
    file: null as File | null,
  })

  const filtered = filter === 'all'
    ? documents
    : documents.filter(d => d.category === filter)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo no puede superar los 10MB')
      return
    }
    setUploadError('')
    setForm(p => ({ ...p, file }))
    if (!form.title) {
      setForm(p => ({ ...p, file, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
  }

  const handleUpload = async () => {
    if (!form.file || !form.title) {
      setUploadError('El título y el archivo son obligatorios')
      return
    }

    setUploading(true)
    setUploadError('')
    const supabase = createClient()

    // Subir archivo a Storage
    const fileExt = form.file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { error: storageError } = await supabase.storage
      .from('medical-documents')
      .upload(fileName, form.file)

    if (storageError) {
      setUploadError('Error subiendo el archivo: ' + storageError.message)
      setUploading(false)
      return
    }

    // Guardar en base de datos
    const { error: dbError } = await supabase
      .from('medical_documents')
      .insert({
        patient_id: userId,
        title: form.title,
        category: form.category,
        document_date: form.document_date || null,
        description: form.description,
        storage_path: fileName,
      })

    if (dbError) {
      setUploadError('Error guardando el documento: ' + dbError.message)
      setUploading(false)
      return
    }

    // Resetear form
    setForm({ title: '', category: 'lab', document_date: '', description: '', file: null })
    setShowUpload(false)
    setUploading(false)
    router.refresh()
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`¿Eliminar "${doc.title}"? Esta acción no se puede deshacer.`)) return
    const supabase = createClient()
    await supabase.storage.from('medical-documents').remove([doc.storage_path])
    await supabase.from('medical_documents').delete().eq('id', doc.id)
    router.refresh()
  }

  const handleView = async (doc: Document) => {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('medical-documents')
      .createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    background: 'white',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#374151',
    marginBottom: '4px',
  }

  return (
    <div>
      {/* Botón subir + filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
        <button
          onClick={() => setShowUpload(!showUpload)}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: showUpload ? '#f3f4f6' : '#2563eb',
            color: showUpload ? '#374151' : 'white',
            border: 'none', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {showUpload ? '✕ Cancelar' : '+ Subir documento'}
        </button>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
              border: '0.5px solid #e5e7eb', cursor: 'pointer',
              background: filter === 'all' ? '#111827' : 'white',
              color: filter === 'all' ? 'white' : '#374151',
            }}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              style={{
                padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
                border: '0.5px solid #e5e7eb', cursor: 'pointer',
                background: filter === cat.value ? cat.color : 'white',
                color: filter === cat.value ? 'white' : '#374151',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulario de subida */}
      {showUpload && (
        <div style={{
          background: 'white', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '1.25rem',
          marginBottom: '1.25rem',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
            Nuevo documento
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Título *</label>
              <input
                style={inputStyle}
                placeholder="Ej: Hemograma completo enero 2025"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Categoría *</label>
              <select
                style={inputStyle}
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Fecha del documento</label>
              <input
                style={inputStyle}
                type="date"
                value={form.document_date}
                onChange={e => setForm(p => ({ ...p, document_date: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descripción (opcional)</label>
              <input
                style={inputStyle}
                placeholder="Ej: Control anual, valores dentro del rango normal"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Zona de archivo */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Archivo * (PDF o imagen, máx 10MB)</label>
              <label style={{
                display: 'block', padding: '1.5rem',
                border: '1.5px dashed #d1d5db', borderRadius: '8px',
                textAlign: 'center' as const, cursor: 'pointer',
                background: form.file ? '#f0fdf4' : '#fafafa',
                borderColor: form.file ? '#86efac' : '#d1d5db',
              }}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {form.file ? (
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#059669' }}>
                      ✅ {form.file.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {(form.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                      Arrastra un archivo aquí o haz clic para seleccionar
                    </p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      PDF, JPG, PNG, WEBP
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {uploadError && (
            <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>{uploadError}</p>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                padding: '9px 20px', borderRadius: '8px',
                background: uploading ? '#93c5fd' : '#2563eb',
                color: 'white', border: 'none',
                fontWeight: 600, fontSize: '14px',
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Subiendo...' : 'Guardar documento'}
            </button>
            <button
              onClick={() => setShowUpload(false)}
              style={{
                padding: '9px 20px', borderRadius: '8px',
                background: 'white', border: '1px solid #e5e7eb',
                fontSize: '14px', cursor: 'pointer', color: '#374151',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center' as const, padding: '3rem',
          background: 'white', borderRadius: '12px',
          border: '0.5px solid #e5e7eb', color: '#9ca3af',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📂</p>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280' }}>
            {filter === 'all' ? 'Aún no tienes documentos' : 'No hay documentos en esta categoría'}
          </p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            Sube tu primer documento con el botón de arriba
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(doc => {
            const cat = getCat(doc.category)
            return (
              <div
                key={doc.id}
                style={{
                  background: 'white', borderRadius: '10px',
                  border: '0.5px solid #e5e7eb', padding: '1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '14px',
                }}
              >
                {/* Icono categoría */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: cat.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0,
                }}>
                  {cat.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '2px' }}>
                    {doc.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px',
                      borderRadius: '20px', background: cat.bg, color: cat.color, fontWeight: 500,
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

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleView(doc)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      border: '0.5px solid #e5e7eb', background: 'white',
                      fontSize: '13px', cursor: 'pointer', color: '#374151',
                    }}
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      border: '0.5px solid #fecaca', background: '#fff5f5',
                      fontSize: '13px', cursor: 'pointer', color: '#dc2626',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}