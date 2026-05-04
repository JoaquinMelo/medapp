import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { documentId, storagePath } = await request.json()

  // Descargar el archivo desde Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('medical-documents')
    .download(storagePath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'No se pudo descargar el archivo' }, { status: 500 })
  }

  // Convertir a base64
  const arrayBuffer = await fileData.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = storagePath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza este examen de laboratorio médico y extrae TODOS los valores que encuentres.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional ni backticks:
{
  "summary": "resumen breve del examen en 1-2 oraciones",
  "exam_type": "tipo de examen (ej: Hemograma, Perfil lipídico, etc.)",
  "values": [
    {
      "name": "nombre del parámetro",
      "value": número o null si no es numérico,
      "unit": "unidad de medida o null",
      "ref_min": número mínimo del rango normal o null,
      "ref_max": número máximo del rango normal o null,
      "is_text": true si el valor es texto (ej: Positivo/Negativo)
    }
  ]
}

Si no es un examen de laboratorio, responde: {"error": "No es un examen de laboratorio"}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    })

    const content = response.choices[0].message.content || ''
    const clean = content.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    // Guardar resumen en medical_documents
    await supabase
      .from('medical_documents')
      .update({ ai_summary: parsed.summary })
      .eq('id', documentId)

    // Guardar valores individuales en lab_values
    if (parsed.values?.length > 0) {
      const labValues = parsed.values
        .filter((v: { is_text?: boolean }) => !v.is_text)
        .map((v: {
          name: string
          value: number | null
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
        await supabase.from('lab_values').insert(labValues)
      }
    }

    return NextResponse.json({
      summary: parsed.summary,
      exam_type: parsed.exam_type,
      values: parsed.values,
    })

  } catch (error) {
    console.error('Error extrayendo laboratorio:', error)
    return NextResponse.json({ error: 'Error al procesar el documento' }, { status: 500 })
  }
}