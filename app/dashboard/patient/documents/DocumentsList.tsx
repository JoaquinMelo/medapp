'use client'
import { useState, useRef } from 'react'
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

interface UploadingFile {
  id: string
  name: string
  status: 'uploading' | 'classifying' | 'extracting' | 'done' | 'error'
  error?: string
}

function getCat(value: string) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[5]
}

const STATUS_LABEL: Record<UploadingFile['status'], string> = {
  uploading: 'Subiendo...',
  classifying: 'Clasificando con IA...',
  extracting: 'Extrayendo valores...',
  done: 'Listo',
  error: 'Error',
}

export default function DocumentsList({
  documents, userId
}: {
  documents: Document[]
  userId: string
}) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = filter === 'all'
    ? documents
    : documents.filter(d => d.category === filter)

  const updateFileStatus = (id: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev =>
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    )
  }

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      return { error: 'Archivo mayor a 10MB' }
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const fileExt = file.name.split('.').pop()
    const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    setUploadingFiles(prev => [...prev, {
      id: fileId,
      name: file.name,
      status: 'uploading',
    }])

    const supabase = createClient()

    // 1 — Subir a Storage
    const { error: storageError } = await supabase.storage
      .from('medical-documents')
      .upload(storagePath, file)

    if (storageError) {
      updateFileStatus(fileId, { status: 'error', error: 'Error al subir' })
      return
    }

    // 2 — Clasificar con IA
    updateFileStatus(fileId, { status: 'classifying' })

    let title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    let category = 'other'
    let documentDate = null
    let description = null

    try {
      const classifyRes = await fetch('/api/classify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, fileName: file.name }),
      })
      const classified = await classifyRes.json()
      if (!classified.error) {
        title = classified.title || title
        category = classified.category || category
        documentDate = classified.document_date || null
        description = classified.description || null
      }
    } catch {
      // Si falla la clasificación, usamos valores por defecto
    }

    // 3 — Guardar en base de datos
    const { data: newDoc, error: dbError } = await supabase
      .from('medical_documents')
      .insert({
        patient_id: userId,
        title,
        category,
        document_date: documentDate,
        description,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (dbError || !newDoc) {
      updateFileStatus(fileId, { status: 'error', error: 'Error al guardar' })
      return
    }

    // 4 — Extraer valores si es laboratorio
    if (category === 'lab') {
      updateFileStatus(fileId, { status: 'extracting' })
      try {
        await fetch('/api/extract-lab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: newDoc.id, storagePath }),
        })
      } catch {
        // Extracción falla silenciosamente
      }
    }

    updateFileStatus(fileId, { status: 'done' })

    // Limpiar el archivo de la lista después de 3 segundos
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
      router.refresh()
    }, 3000)
  }

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const valid = arr.filter(f =>
      ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(f.type) ||
      f.name.match(/\.(pdf|jpg|jpeg|png|webp)$/i)
    )
    valid.forEach(processFile)
    if (valid.length < arr.length) {
      alert('Solo se aceptan archivos PDF, JPG, PNG o WEBP')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleView = async (doc: Document) => {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('medical-documents')
      .createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return
    const supabase = createClient()
    await supabase.storage.from('medical-documents').remove([doc.storage_path])
    await supabase.from('medical_documents').delete().eq('id', doc.id)
    router.refresh()
  }

  return (
    <div>
      {/* Zona de subida */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#2563eb' : '#d1d5db'}`,
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center' as const,
          cursor: 'pointer',
          background: isDragging ? '#eff6ff' : '#fafafa',
          transition: 'all 0.15s',
          marginBottom: '1.25rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <p style={{ fontSize: '28px', marginBottom: '8px' }}>📎</p>
        <p style={{ fontSize: '15px', fontWeight: 600, color: isDragging ? '#2563eb' : '#374151' }}>
          {isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
        </p>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '6px' }}>
          PDF, JPG, PNG — múltiples archivos a la vez — la IA los clasifica automáticamente
        </p>
      </div>

      {/* Archivos en proceso */}
      {uploadingFiles.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px',
          border: '0.5px solid #e5e7eb', padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {uploadingFiles.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: f.status === 'done' ? '#059669'
                  : f.status === 'error' ? '#dc2626'
                  : '#2563eb',
              }} />
              <p style={{ fontSize: '13px', color: '#374151', flex: 1, minWidth: 0 }}>
                {f.name}
              </p>
              <span style={{
                fontSize: '12px', flexShrink: 0,
                color: f.status === 'done' ? '#059669'
                  : f.status === 'error' ? '#dc2626'
                  : '#6b7280',
              }}>
                {f.status === 'error' ? f.error : STATUS_LABEL[f.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '1.25rem' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
            border: '0.5px solid #e5e7eb', cursor: 'pointer',
            background: filter === 'all' ? '#111827' : 'white',
            color: filter === 'all' ? 'white' : '#374151',
          }}
        >
          Todos ({documents.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = documents.filter(d => d.category === cat.value).length
          if (count === 0) return null
          return (
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
              {cat.icon} {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Lista de documentos */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center' as const, padding: '3rem',
          background: 'white', borderRadius: '12px',
          border: '0.5px solid #e5e7eb',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📂</p>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280' }}>
            {filter === 'all' ? 'Aún no tienes documentos' : 'No hay documentos en esta categoría'}
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
            Arrastra tus primeros archivos arriba
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(doc => {
            const cat = getCat(doc.category)
            return (
              <div key={doc.id} style={{
                background: 'white', borderRadius: '10px',
                border: '0.5px solid #e5e7eb', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '14px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: cat.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0,
                }}>
                  {cat.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '2px' }}>
                    {doc.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                      background: cat.bg, color: cat.color, fontWeight: 500,
                    }}>
                      {cat.label}
                    </span>
                    {doc.document_date && (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {new Date(doc.document_date + 'T12:00:00').toLocaleDateString('es-CL', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                    )}
                    {doc.ai_summary && (
                      <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                        · {doc.ai_summary}
                      </span>
                    )}
                  </div>
                </div>

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