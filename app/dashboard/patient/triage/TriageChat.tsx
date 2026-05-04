'use client'
import { useState, useRef, useEffect } from 'react'

const URGENCY_CONFIG = {
  low:       { label: 'Urgencia baja',     color: '#059669', bg: '#ecfdf5', desc: 'Consulta de rutina' },
  medium:    { label: 'Urgencia media',    color: '#d97706', bg: '#fffbeb', desc: 'Consulta esta semana' },
  high:      { label: 'Urgencia alta',     color: '#dc2626', bg: '#fff5f5', desc: 'Consulta hoy' },
  emergency: { label: '🚨 EMERGENCIA',     color: '#7c2d12', bg: '#fff1f2', desc: 'Ve a urgencias ahora' },
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  urgency?: string
  specialist?: string
}

interface HistoryItem {
  id: string
  symptoms: string
  ai_response: string
  urgency: string
  recommended_specialty: string
  created_at: string
}

function cleanResponse(text: string) {
  return text.replace(/\[URGENCIA:[^\]]+\]/g, '').replace(/\[ESPECIALISTA:[^\]]+\]/g, '').trim()
}

export default function TriageChat({ history }: { history: HistoryItem[] }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: input,
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Ocurrió un error al procesar tu consulta. Intenta de nuevo.',
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          urgency: data.urgency,
          specialist: data.specialist,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
      }])
    }

    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Disclaimer */}
      <div style={{
        background: '#eff6ff', borderRadius: '10px',
        padding: '10px 14px', fontSize: '13px', color: '#1e40af',
        display: 'flex', alignItems: 'flex-start', gap: '8px',
      }}>
        <span style={{ flexShrink: 0 }}>ℹ️</span>
        <span>Esta IA es una guía de orientación, no reemplaza la consulta médica profesional. En caso de emergencia llama al 131.</span>
      </div>

      {/* Chat */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', overflow: 'hidden',
      }}>

        {/* Mensajes */}
        <div style={{
          height: '420px', overflowY: 'auto',
          padding: '1.25rem', display: 'flex',
          flexDirection: 'column', gap: '12px',
        }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center' as const, color: '#9ca3af' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</p>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280' }}>
                ¿Cómo te sientes hoy?
              </p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                Describe tus síntomas con el mayor detalle posible
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px', justifyContent: 'center', marginTop: '1rem' }}>
                {[
                  'Tengo dolor de cabeza fuerte desde ayer',
                  'Me duele el pecho al respirar',
                  'Llevo 3 días con fiebre',
                  'Tengo la presión alta',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    style={{
                      padding: '6px 12px', borderRadius: '20px',
                      border: '0.5px solid #e5e7eb', background: '#f9fafb',
                      fontSize: '13px', cursor: 'pointer', color: '#374151',
                    }}
                  >
                    {s}
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
              {msg.role === 'assistant' && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#eff6ff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', flexShrink: 0, marginRight: '8px',
                  alignSelf: 'flex-end',
                }}>
                  🤖
                </div>
              )}
              <div style={{ maxWidth: '80%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '12px',
                  background: msg.role === 'user' ? '#2563eb' : '#f9fafb',
                  color: msg.role === 'user' ? 'white' : '#111827',
                  fontSize: '14px', lineHeight: 1.6,
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                  whiteSpace: 'pre-wrap' as const,
                }}>
                  {msg.role === 'assistant' ? cleanResponse(msg.content) : msg.content}
                </div>

                {/* Badge de urgencia */}
                {msg.role === 'assistant' && msg.urgency && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                    {(() => {
                      const u = URGENCY_CONFIG[msg.urgency as keyof typeof URGENCY_CONFIG]
                      return u ? (
                        <span style={{
                          fontSize: '12px', padding: '3px 10px',
                          borderRadius: '20px', background: u.bg,
                          color: u.color, fontWeight: 600,
                        }}>
                          {u.label} · {u.desc}
                        </span>
                      ) : null
                    })()}
                    {msg.specialist && (
                      <span style={{
                        fontSize: '12px', padding: '3px 10px',
                        borderRadius: '20px', background: '#f3f4f6',
                        color: '#374151',
                      }}>
                        👨‍⚕️ {msg.specialist}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#eff6ff', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              }}>
                🤖
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: '12px',
                background: '#f9fafb', fontSize: '14px', color: '#9ca3af',
              }}>
                Analizando tu historial...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          borderTop: '0.5px solid #e5e7eb',
          padding: '12px',
          display: 'flex', gap: '8px',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Describe tus síntomas... (Enter para enviar)"
            rows={2}
            style={{
              flex: 1, padding: '8px 12px',
              borderRadius: '8px', border: '1px solid #e5e7eb',
              fontSize: '14px', resize: 'none' as const,
              fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: '8px 18px', borderRadius: '8px',
              background: loading || !input.trim() ? '#93c5fd' : '#2563eb',
              color: 'white', border: 'none',
              fontWeight: 600, fontSize: '14px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            Enviar
          </button>
        </div>
      </div>

      {/* Historial de consultas */}
      {history.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px',
          border: '0.5px solid #e5e7eb', padding: '1.25rem',
        }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              width: '100%', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
              Consultas anteriores ({history.length})
            </h2>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {showHistory ? '▲ Ocultar' : '▼ Ver'}
            </span>
          </button>

          {showHistory && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map(item => {
                const u = URGENCY_CONFIG[item.urgency as keyof typeof URGENCY_CONFIG]
                return (
                  <div key={item.id} style={{
                    padding: '12px', borderRadius: '8px',
                    border: '0.5px solid #e5e7eb', background: '#fafafa',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap' as const, gap: '6px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                        {item.symptoms.slice(0, 80)}{item.symptoms.length > 80 ? '...' : ''}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {u && (
                          <span style={{
                            fontSize: '11px', padding: '2px 8px',
                            borderRadius: '20px', background: u.bg, color: u.color, fontWeight: 500,
                          }}>
                            {u.label}
                          </span>
                        )}
                        {item.recommended_specialty && (
                          <span style={{
                            fontSize: '11px', padding: '2px 8px',
                            borderRadius: '20px', background: '#f3f4f6', color: '#374151',
                          }}>
                            {item.recommended_specialty}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {new Date(item.created_at).toLocaleDateString('es-CL', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}