'use client'
import { useState } from 'react'

interface LabValue {
  id: string
  name: string
  value: number
  unit: string
  ref_min: number
  ref_max: number
  is_abnormal: boolean
  measured_at: string
  document: { title: string; document_date: string } | null
}

export default function LabChart({ grouped }: { grouped: Record<string, LabValue[] | null> }) {
  const [selected, setSelected] = useState(Object.keys(grouped)[0] || '')
  const values = (grouped[selected] || []).filter(v => v.value !== null)
  const latest = values[values.length - 1]

  const refMin = latest?.ref_min
  const refMax = latest?.ref_max
  const unit = latest?.unit || ''

  // Calcular escala del minigráfico
  const allVals = values.map(v => v.value)
  const chartMin = Math.min(...allVals, refMin ?? Infinity) * 0.85
  const chartMax = Math.max(...allVals, refMax ?? -Infinity) * 1.15
  const range = chartMax - chartMin || 1

  const toY = (val: number, h: number) =>
    h - ((val - chartMin) / range) * h

  const chartW = 600
  const chartH = 160

  const points = values.map((v, i) => ({
    x: values.length === 1 ? chartW / 2 : (i / (values.length - 1)) * chartW,
    y: toY(v.value, chartH),
    v,
  }))

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Selector de parámetro */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '10px' }}>
          Selecciona un parámetro
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
          {Object.keys(grouped).map(name => {
            const vals = grouped[name] || []
            const last = vals[vals.length - 1]
            const abnormal = last?.is_abnormal
            return (
              <button
                key={name}
                onClick={() => setSelected(name)}
                style={{
                  padding: '6px 14px', borderRadius: '20px',
                  border: `0.5px solid ${selected === name ? '#2563eb' : abnormal ? '#fca5a5' : '#e5e7eb'}`,
                  background: selected === name ? '#2563eb' : abnormal ? '#fff5f5' : 'white',
                  color: selected === name ? 'white' : abnormal ? '#dc2626' : '#374151',
                  fontSize: '13px', cursor: 'pointer', fontWeight: selected === name ? 600 : 400,
                }}
              >
                {name}
                {abnormal && selected !== name && ' ⚠️'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Gráfico */}
      {values.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px',
          border: '0.5px solid #e5e7eb', padding: '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{selected}</h2>
              {unit && <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Unidad: {unit}</p>}
            </div>
            {latest && (
              <div style={{ textAlign: 'right' as const }}>
                <p style={{
                  fontSize: '28px', fontWeight: 700,
                  color: latest.is_abnormal ? '#dc2626' : '#059669',
                }}>
                  {latest.value}
                  <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>{unit}</span>
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Último valor
                  {refMin != null && refMax != null && (
                    <> · Ref: {refMin}–{refMax} {unit}</>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* SVG del gráfico */}
          {values.length >= 2 ? (
            <div style={{ overflowX: 'auto' }}>
              <svg
                viewBox={`0 0 ${chartW} ${chartH + 40}`}
                style={{ width: '100%', minWidth: '300px' }}
              >
                {/* Zona normal */}
                {refMin != null && refMax != null && (
                  <rect
                    x={0}
                    y={toY(refMax, chartH)}
                    width={chartW}
                    height={toY(refMin, chartH) - toY(refMax, chartH)}
                    fill="#dcfce7"
                    opacity={0.5}
                  />
                )}

                {/* Líneas de referencia */}
                {refMin != null && (
                  <line x1={0} y1={toY(refMin, chartH)} x2={chartW} y2={toY(refMin, chartH)}
                    stroke="#86efac" strokeWidth={1} strokeDasharray="4 4" />
                )}
                {refMax != null && (
                  <line x1={0} y1={toY(refMax, chartH)} x2={chartW} y2={toY(refMax, chartH)}
                    stroke="#86efac" strokeWidth={1} strokeDasharray="4 4" />
                )}

                {/* Línea de valores */}
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

                {/* Puntos */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x} cy={p.y} r={5}
                      fill={p.v.is_abnormal ? '#dc2626' : '#2563eb'}
                      stroke="white" strokeWidth={2}
                    />
                    <text
                      x={p.x} y={p.y - 12}
                      textAnchor="middle"
                      fontSize={11}
                      fill={p.v.is_abnormal ? '#dc2626' : '#374151'}
                      fontWeight={600}
                    >
                      {p.v.value}
                    </text>
                    <text
                      x={p.x}
                      y={chartH + 20}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#9ca3af"
                    >
                      {p.v.document?.document_date
                        ? new Date(p.v.document.document_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
                        : `#${i + 1}`}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div style={{
              background: '#f9fafb', borderRadius: '8px',
              padding: '1.5rem', textAlign: 'center' as const,
            }}>
              <p style={{ fontSize: '32px', marginBottom: '4px' }}>
                {latest?.is_abnormal ? '⚠️' : '✅'}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: latest?.is_abnormal ? '#dc2626' : '#059669' }}>
                {latest?.value} {unit}
              </p>
              {refMin != null && refMax != null && (
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  Rango normal: {refMin} – {refMax} {unit}
                </p>
              )}
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                Sube más exámenes para ver la evolución en el tiempo
              </p>
            </div>
          )}

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
              Normal
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              Fuera de rango
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '24px', height: '8px', background: '#dcfce7', display: 'inline-block', borderRadius: '2px' }} />
              Zona normal
            </span>
          </div>
        </div>
      )}

      {/* Tabla de valores */}
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '0.5px solid #e5e7eb', padding: '1.25rem',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>
          Historial de mediciones
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[...values].reverse().map((v, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '8px 12px',
              borderRadius: '8px',
              background: v.is_abnormal ? '#fff5f5' : '#f9fafb',
            }}>
              <div>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                  {v.document?.document_date
                    ? new Date(v.document.document_date + 'T12:00:00').toLocaleDateString('es-CL', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : 'Sin fecha'}
                </p>
                {v.document?.title && (
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>{v.document.title}</p>
                )}
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <p style={{
                  fontSize: '16px', fontWeight: 700,
                  color: v.is_abnormal ? '#dc2626' : '#111827',
                }}>
                  {v.value} {unit}
                </p>
                {v.is_abnormal && (
                  <p style={{ fontSize: '11px', color: '#dc2626' }}>Fuera de rango</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}