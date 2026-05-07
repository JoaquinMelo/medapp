import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const CLASSIFY_PROMPT = `Analiza este documento médico y extrae su metadata.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni backticks:
{
  "title": "título descriptivo del documento (ej: Hemograma Completo, Radiografía de Tórax, Receta Metformina)",
  "category": "lab|imaging|prescription|report|vaccine|other",
  "document_date": "fecha en formato YYYY-MM-DD o null si no encuentras fecha",
  "description": "descripción breve en 1 oración o null"
}

Criterios para category:
- lab: exámenes de sangre, orina, cultivos, biopsias, cualquier resultado con valores numéricos
- imaging: radiografías, ecografías, TAC, resonancias, mamografías
- prescription: recetas médicas, indicaciones de medicamentos
- report: informes médicos, epicrisis, cartas médicas, certificados
- vaccine: certificados de vacunación, cartillas
- other: cualquier otro documento médico`

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { storagePath, fileName } = await request.json()

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

      if (!text || text.length < 10) {
        // PDF sin texto — inferir desde nombre del archivo
        return NextResponse.json({
          title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          category: 'other',
          document_date: null,
          description: null,
        })
      }

      contentForAI = {
        role: 'user',
        content: `${CLASSIFY_PROMPT}\n\nTEXTO DEL DOCUMENTO:\n${text.slice(0, 4000)}`,
      }
    } catch {
      return NextResponse.json({
        title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        category: 'other',
        document_date: null,
        description: null,
      })
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
        { type: 'text', text: CLASSIFY_PROMPT },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
        },
      ],
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [contentForAI],
      max_tokens: 300,
    })

    const raw = response.choices[0].message.content || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({
      title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      category: 'other',
      document_date: null,
      description: null,
    })
  }
}