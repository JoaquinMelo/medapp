'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Grant {
  id: string
  token: string
  expires_at: string
  is_active: boolean
  created_at: string
  doctor: { full_name: string; specialty: string } | null
}

interface Log {
  id: string
  accessed_at: string
  action: string
  doctor: { full_name: string } | null
}

export default function AccessManager({
  userId, grants, logs
}: {
  userId: string
  grants: Grant[]
  logs: Log[]
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [days, setDays] = useState(7)
  const [newToken, setNewToken] = useState('')
  const [copied, setCopied] = useState(false)

  const activeGrants = grants.filter(g =>
    g.is_active && new Date(g.expires_at) > new Date()
  )
  const expiredGrants = grants.filter(g =>
    !g.is_active || new Date(g.expires_at) <= new Date()
  )

  const handleCreate = async () => {
    setCreating(true)
    const supabase = createClient()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)

    const { data, error } = await supabase
      .from('access_grants')
      .insert({
        patient_id: userId,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single()

    setCreating(false)
    if (!error && data) {
      setNewToken(data.token)
      router.refresh()
    }
  }

  const handleRevoke = async (grantId: string) => {
    if (!confirm('¿Revocar este acceso? El médico ya no podrá ver tu historial.')) return
    const supabase = createClient()
    await supabase
      .from('access_grants')
      .update({ is_active: false })
      .eq('id', grantId)
    router.refresh()
  }

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const isExpired = (dateStr: string) => new Date(dateStr) <= new Date()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Token recién creado */}
      {newToken && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: '12px', padding: '1.25rem',
        }}>
          <p style={{ fontWeight: 600, fontSize: '14px', color: '#166534', marginBottom: '8px' }}>
            ✅ Token creado — compártelo con tu médico
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'white', borderRadius: '8px',
            border: '1px solid #bbf7d0', padding: '10px 14px',
          }}>
            <code style={{
              flex: 1, fontSize: '12px', color: '#374151',
              wordBreak: 'break-all' as const, fontFamily: 'monospace',
            }}>
              {newToken}
            </code>
            <button
              onClick={() => handleCopy(newToken)}
              style={{
                padding: '6px 12px', borderRadius: '6px',
                background: copied ? '#059669' : '#2563eb',
                color: 'white', border: 'none',
                fontSize: '13px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            El médico debe ingresar este token en su panel para acceder a tu historial
          </p>
          <button
            onClick={() => setNewToken('')}
            style={{
              marginTop: '8px', fontSize: '13px', color: '#6b7280',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Crear nuevo token */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
          Generar nuevo acceso
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1rem' }}>
          El médico usará este token para ver tu historial durante el tiempo que definas
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
            Duración del acceso: <strong>{days} días</strong>
          </label>
          <input
            type="range" min={1} max={30} step={1} value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            <span>1 día</span>
            <span>15 días</span>
            <span>30 días</span>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: '9px 20px', borderRadius: '8px',
            background: creating ? '#93c5fd' : '#2563eb',
            color: 'white', border: 'none',
            fontWeight: 600, fontSize: '14px',
            cursor: creating ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? 'Generando...' : '🔑 Generar token de acceso'}
        </button>
      </div>

      {/* Accesos activos */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
          Accesos activos ({activeGrants.length})
        </h2>

        {activeGrants.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' as const, padding: '1rem 0' }}>
            No hay accesos activos
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeGrants.map(grant => (
              <div key={grant.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '8px',
                background: '#f9fafb', border: '0.5px solid #e5e7eb',
                flexWrap: 'wrap' as const, gap: '8px',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                    {grant.doctor?.full_name
                      ? `Dr. ${grant.doctor.full_name}`
                      : 'Token sin usar aún'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    Vence: {formatDate(grant.expires_at)}
                  </p>
                  <code style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
                    {grant.token.slice(0, 16)}...
                  </code>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleCopy(grant.token)}
                    style={{
                      padding: '5px 10px', borderRadius: '6px',
                      border: '0.5px solid #e5e7eb', background: 'white',
                      fontSize: '12px', cursor: 'pointer', color: '#374151',
                    }}
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => handleRevoke(grant.id)}
                    style={{
                      padding: '5px 10px', borderRadius: '6px',
                      border: '0.5px solid #fecaca', background: '#fff5f5',
                      fontSize: '12px', cursor: 'pointer', color: '#dc2626',
                    }}
                  >
                    Revocar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de accesos */}
      {logs.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px',
          border: '0.5px solid #e5e7eb', padding: '1.25rem',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
            Historial de accesos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {logs.map(log => (
              <div key={log.id} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 0',
                borderBottom: '0.5px solid #f3f4f6',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#059669', flexShrink: 0,
                  }} />
                  <p style={{ fontSize: '13px', color: '#374151' }}>
                    {log.doctor?.full_name
                      ? `Dr. ${log.doctor.full_name}`
                      : 'Médico'} accedió a tu historial
                  </p>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' as const }}>
                  {formatDate(log.accessed_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos expirados */}
      {expiredGrants.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px',
          border: '0.5px solid #e5e7eb', padding: '1.25rem',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '1rem', color: '#9ca3af' }}>
            Accesos expirados ({expiredGrants.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {expiredGrants.map(grant => (
              <div key={grant.id} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 0',
                borderBottom: '0.5px solid #f3f4f6',
                opacity: 0.6,
              }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>
                    {grant.doctor?.full_name
                      ? `Dr. ${grant.doctor.full_name}`
                      : 'Token no utilizado'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {isExpired(grant.expires_at) ? 'Expirado' : 'Revocado'}: {formatDate(grant.expires_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}