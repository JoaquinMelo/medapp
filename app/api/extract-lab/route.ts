import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PROMPT = `Analiza este examen de laboratorio médico y extrae los valores más relevantes clínicamente (máximo 20).

REGLAS DE NORMALIZACIÓN DE NOMBRES (muy importante):
- Usa siempre Title Case para los nombres: "Colesterol Total", "Hemoglobina", "Glucosa en Ayunas"
- Normaliza nombres equivalentes al mismo estándar:
  * "GLUCOSA", "glucosa", "Glucosa en ayuno", "Glicemia" → "Glucosa"
  * "COLESTEROL TOTAL", "col. total" → "Colesterol Total"
  * "TRIGLICÉRIDOS", "trigliceridos" → "Triglicéridos"
  * "HEMOGLOBINA", "HGB", "Hgb" → "Hemoglobina"
  * "HEMATOCRITO", "HCT", "Hct" → "Hematocrito"
  * "LEUCOCITOS", "WBC", "Glóbulos blancos" → "Leucocitos"
  * "ERITROCITOS", "RBC", "Glóbulos rojos" → "Eritrocitos"
  * "PLAQUETAS", "PLT" → "Plaquetas"
  * "CREATININA", "Creat" → "Creatinina"
  * "SODIO", "Na+" → "Sodio"
  * "POTASIO", "K+" → "Potasio"
  * Aplica el mismo criterio para cualquier otro parámetro

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional ni backticks:
{
  "summary": "resumen breve del examen en 1-2 oraciones",
  "exam_type": "tipo de examen (ej: Hemograma, Perfil lipídico, etc.)",
  "values": [
    {
      "name": "nombre normalizado en Title Case",
      "value": 0,
      "unit": "unidad o null",
      "ref_min": 0,
      "ref_max": 0,
      "is_text": false
    }
  ]
}

Si no es un examen de laboratorio, responde: {"error": "No es un examen de laboratorio"}`

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { documentId, storagePath } = await request.json()

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('medical-documents')
    .download(storagePath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'No se pudo descargar el archivo' }, { status: 500 })
  }

  const isPdf = storagePath.toLowerCase().endsWith('.pdf')
  let contentForAI: OpenAI.Chat.ChatCompletionMessageParam

  if (isPdf) {
    try {
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const { extractText } = await import('unpdf')
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })

      if (!text || text.length < 20) {
        return NextResponse.json({
          error: 'El PDF no tiene texto legible. Intenta subir una imagen del examen.'
        }, { status: 400 })
      }

      contentForAI = {
        role: 'user',
        content: `${PROMPT}\n\nTEXTO DEL EXAMEN:\n${text.slice(0, 6000)}`,
      }
    } catch (e) {
      console.error('Error leyendo PDF:', e)
      return NextResponse.json({
        error: 'No se pudo leer el PDF. Intenta subir una imagen del examen.'
      }, { status: 400 })
    }
  } else {
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const ext = storagePath.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
    }
    const mimeType = mimeMap[ext || ''] || 'image/jpeg'

    contentForAI = {
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64}`,
            detail: 'high',
          },
        },
      ],
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [contentForAI],
      max_tokens: 4000,
    })

    const raw = response.choices[0].message.content || ''
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      const fixed = clean
        .replace(/,\s*$/, '')
        + (clean.includes('"values"') ? ']}' : '}')
      parsed = JSON.parse(fixed)
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    await supabase
      .from('medical_documents')
      .update({ ai_summary: parsed.summary })
      .eq('id', documentId)

    if (parsed.values?.length > 0) {
      const labValues = parsed.values
        .filter((v: { is_text?: boolean; value?: unknown }) =>
          !v.is_text && v.value !== null && v.value !== undefined
        )
        .map((v: {
          name: string
          value: number
          unit: string | null
          ref_min: number | null
          ref_max: number | null
        }) => ({
          document_id: documentId,
          patient_id: user.id,
          name: v.name,
          value: v.value,
          unit: v.unit,
          ref_min: v.ref_min,
          ref_max: v.ref_max,
        }))

      if (labValues.length > 0) {
        // Eliminar valores previos de este documento antes de insertar
        await supabase
          .from('lab_values')
          .delete()
          .eq('document_id', documentId)

        await supabase.from('lab_values').insert(labValues)
      }
    }

    return NextResponse.json({
      summary: parsed.summary,
      exam_type: parsed.exam_type,
      values: parsed.values,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error extrayendo laboratorio:', msg)
    return NextResponse.json({ error: 'Error al procesar el documento', detail: msg }, { status: 500 })
  }
}