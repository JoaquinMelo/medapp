'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  '¿Tiene alguna alergia relevante?',
  '¿Cuáles son sus últimos valores de laboratorio fuera de rango?',
  '¿Qué medicamentos está tomando actualmente?',
  'Resume el historial clínico del paciente',
  '¿Cuándo fue su último examen de laboratorio?',
  '¿Hay algo preocupante en su historial reciente?',
]

export default function DoctorAssistant({ patientId }: { patientId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const question = text || input
    if (!question.trim() || loading) return

    const userMsg: Message = { role: 'user', content: question }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/doctor-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          question,
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.error
          ? 'Error al procesar la consulta. Intenta de nuevo.'
          : data.response,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error de conexión. Verifica tu internet.',
      }])
    }

    setLoading(false)
  }

  // Panel colapsado
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#2563eb', color: 'white',
          border: 'none', fontSize: '24px',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
        }}
        title="Asistente IA"
      >
        🤖
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      width: '380px', height: '520px',
      background: 'white', borderRadius: '16px',
      border: '0.5px solid #e5e7eb',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50,
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '0.5px solid #e5e7eb',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '16px 16px 0 0',
        background: '#2563eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px', color: 'white', margin: 0 }}>
              Asistente clínico
            </p>
            <p style={{ fontSize: '11px', color: '#bfdbfe', margin: 0 }}>
              Conoce el historial completo
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            color: 'white', width: '28px', height: '28px',
            borderRadius: '50%', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Mensajes */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px', display: 'flex',
        flexDirection: 'column', gap: '8px',
      }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px', textAlign: 'center' as const }}>
              Pregúntame sobre este paciente
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  style={{
                    padding: '7px 12px', borderRadius: '8px',
                    border: '0.5px solid #e5e7eb', background: '#f9fafb',
                    fontSize: '12px', cursor: 'pointer', color: '#374151',
                    textAlign: 'left' as const,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%', padding: '8px 12px',
              borderRadius: '10px',
              background: msg.role === 'user' ? '#2563eb' : '#f3f4f6',
              color: msg.role === 'user' ? 'white' : '#111827',
              fontSize: '13px', lineHeight: 1.5,
              whiteSpace: 'pre-wrap' as const,
              borderBottomRightRadius: msg.role === 'user' ? '3px' : '10px',
              borderBottomLeftRadius: msg.role === 'assistant' ? '3px' : '10px',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '8px 12px', borderRadius: '10px',
              background: '#f3f4f6', fontSize: '13px', color: '#9ca3af',
            }}>
              Analizando historial...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '0.5px solid #e5e7eb',
        padding: '10px', display: 'flex', gap: '6px',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Pregunta sobre el paciente..."
          style={{
            flex: 1, padding: '7px 10px',
            borderRadius: '8px', border: '1px solid #e5e7eb',
            fontSize: '13px',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            padding: '7px 14px', borderRadius: '8px',
            background: loading || !input.trim() ? '#93c5fd' : '#2563eb',
            color: 'white', border: 'none',
            fontSize: '13px', fontWeight: 600,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}