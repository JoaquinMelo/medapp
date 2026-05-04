import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { symptoms, messages } = await request.json()

  // Cargar perfil del paciente
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, birth_date, blood_type, allergies, chronic_conditions, current_medications')
    .eq('id', user.id)
    .single()

  // Cargar últimos documentos
  const { data: docs } = await supabase
    .from('medical_documents')
    .select('title, category, document_date, description, ai_summary')
    .eq('patient_id', user.id)
    .order('document_date', { ascending: false })
    .limit(10)

  // Calcular edad
  const age = profile?.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  // Construir contexto del paciente
  const patientContext = `
PERFIL DEL PACIENTE:
- Nombre: ${profile?.full_name || 'Desconocido'}
${age ? `- Edad: ${age} años` : ''}
${profile?.blood_type ? `- Grupo sanguíneo: ${profile.blood_type}` : ''}
${profile?.allergies?.length ? `- Alergias: ${profile.allergies.join(', ')}` : '- Sin alergias registradas'}
${profile?.chronic_conditions?.length ? `- Condiciones crónicas: ${profile.chronic_conditions.join(', ')}` : '- Sin condiciones crónicas'}
${profile?.current_medications?.length ? `- Medicamentos actuales: ${profile.current_medications.join(', ')}` : '- Sin medicamentos actuales'}

HISTORIAL RECIENTE (últimos documentos):
${docs?.length ? docs.map(d =>
  `- ${d.title} (${d.category}, ${d.document_date || 'sin fecha'})${d.description ? ': ' + d.description : ''}${d.ai_summary ? ' | Resumen IA: ' + d.ai_summary : ''}`
).join('\n') : '- Sin documentos registrados'}
`.trim()

  const systemPrompt = `Eres un asistente médico de orientación para la app MedApp. Tu rol es ayudar al paciente a entender sus síntomas y orientarlos sobre qué hacer, considerando su historial médico personal.

${patientContext}

INSTRUCCIONES IMPORTANTES:
1. Siempre considera el historial y perfil del paciente al dar orientación
2. Advierte sobre posibles interacciones con sus medicamentos actuales si es relevante
3. Menciona si algún síntoma podría relacionarse con sus condiciones crónicas
4. Clasifica la urgencia: BAJA (consulta de rutina), MEDIA (consulta pronto, esta semana), ALTA (consulta hoy), EMERGENCIA (ir a urgencias ahora)
5. Recomienda el tipo de especialista más adecuado
6. Sé claro, empático y en español
7. SIEMPRE termina cada respuesta con este bloque exacto en una línea nueva:
   [URGENCIA: BAJA|MEDIA|ALTA|EMERGENCIA] [ESPECIALISTA: nombre del especialista]
8. NUNCA diagnostiques — eres una guía de orientación, no un médico. Siempre recuerda al paciente que debe consultar a un profesional.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages || []),
        { role: 'user', content: symptoms },
      ],
      max_tokens: 800,
      temperature: 0.3,
    })

    const aiResponse = response.choices[0].message.content || ''

    // Extraer urgencia y especialista
    const urgencyMatch = aiResponse.match(/\[URGENCIA:\s*(BAJA|MEDIA|ALTA|EMERGENCIA)\]/)
    const specialistMatch = aiResponse.match(/\[ESPECIALISTA:\s*([^\]]+)\]/)

    const urgencyMap: Record<string, string> = {
      'BAJA': 'low', 'MEDIA': 'medium', 'ALTA': 'high', 'EMERGENCIA': 'emergency'
    }

    const urgency = urgencyMatch ? urgencyMap[urgencyMatch[1]] : 'medium'
    const specialist = specialistMatch ? specialistMatch[1].trim() : null

    // Guardar consulta en la base de datos
    await supabase.from('ai_consultations').insert({
      patient_id: user.id,
      symptoms,
      ai_response: aiResponse,
      urgency,
      recommended_specialty: specialist,
    })

    return NextResponse.json({
      response: aiResponse,
      urgency,
      specialist,
    })
  } catch (error) {
    console.error('OpenAI error:', error)
    return NextResponse.json({ error: 'Error al procesar la consulta' }, { status: 500 })
  }
}