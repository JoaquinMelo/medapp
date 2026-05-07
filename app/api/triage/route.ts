import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
    .limit(15)

  // Cargar valores de laboratorio con rangos de referencia
  const { data: labValues } = await supabase
    .from('lab_values')
    .select('*, document:document_id(title, document_date)')
    .eq('patient_id', user.id)
    .order('measured_at', { ascending: false })

  // Calcular edad
  const age = profile?.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  // Agrupar lab values por documento para mejor contexto
  const labsByDoc: Record<string, typeof labValues> = {}
  labValues?.forEach(v => {
    const docKey = v.document?.title
      ? `${v.document.title} (${v.document.document_date || 'sin fecha'})`
      : 'Sin documento'
    if (!labsByDoc[docKey]) labsByDoc[docKey] = []
    labsByDoc[docKey]!.push(v)
  })

  const labContext = Object.entries(labsByDoc).map(([docTitle, values]) => {
    const rows = values!.map(v => {
      const estado = v.ref_min != null && v.ref_max != null
        ? (v.is_abnormal ? '⚠️ FUERA DE RANGO' : '✅ Normal')
        : ''
      const rango = v.ref_min != null && v.ref_max != null
        ? `(ref: ${v.ref_min}–${v.ref_max} ${v.unit || ''})` : ''
      return `  - ${v.name}: ${v.value} ${v.unit || ''} ${rango} ${estado}`
    }).join('\n')
    return `📋 ${docTitle}:\n${rows}`
  }).join('\n\n')

  // Construir contexto del paciente
  const patientContext = `
PERFIL DEL PACIENTE:
- Nombre: ${profile?.full_name || 'Desconocido'}
${age ? `- Edad: ${age} años` : ''}
${profile?.blood_type ? `- Grupo sanguíneo: ${profile.blood_type}` : ''}
${profile?.allergies?.length ? `- Alergias: ${profile.allergies.join(', ')}` : '- Sin alergias registradas'}
${profile?.chronic_conditions?.length ? `- Condiciones crónicas: ${profile.chronic_conditions.join(', ')}` : '- Sin condiciones crónicas'}
${profile?.current_medications?.length ? `- Medicamentos actuales: ${profile.current_medications.join(', ')}` : '- Sin medicamentos actuales'}

DOCUMENTOS MÉDICOS (${docs?.length || 0} en total):
${docs?.map(d =>
    `- [${d.category.toUpperCase()}] ${d.title} (${d.document_date || 'sin fecha'})${d.ai_summary ? ': ' + d.ai_summary : ''}`
  ).join('\n') || '- Sin documentos'}

VALORES DE LABORATORIO CON RANGOS DE REFERENCIA:
${labContext || '- Sin valores de laboratorio extraídos'}
`.trim()

  const systemPrompt = `Eres un asistente médico de orientación personal integrado en MedApp. Tienes acceso al historial médico completo del usuario y debes usarlo activamente en tus respuestas.

${patientContext}

INSTRUCCIONES:
1. USA SIEMPRE el historial del paciente — menciona sus valores reales, sus documentos, sus condiciones
2. Si te preguntan por exámenes, di exactamente qué exámenes tiene, sus fechas y sus valores
3. Si te preguntan si algo está fuera de rango, revisa los valores del historial y responde directamente con los datos reales
4. Si detectas valores anormales en el historial, mencionarlos proactivamente con el valor exacto y su rango de referencia
5. Advierte sobre interacciones con medicamentos actuales cuando sea relevante
6. Clasifica la urgencia: BAJA (rutina), MEDIA (esta semana), ALTA (hoy), EMERGENCIA (urgencias ahora)
7. Recomienda el especialista más adecuado
8. Sé directo, claro y empático — el usuario necesita información concreta
9. NO repitas en cada mensaje que "debes consultar a un médico" — el usuario ya sabe esto, solo menciónalo cuando sea realmente necesario
10. SIEMPRE termina con: [URGENCIA: BAJA|MEDIA|ALTA|EMERGENCIA] [ESPECIALISTA: nombre]

IMPORTANTE: Eres una herramienta de orientación. Puedes dar información detallada del historial, explicar qué significan los valores y orientar sobre qué hacer. No diagnosticas enfermedades ni prescribes tratamientos.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages || []),
        { role: 'user', content: symptoms },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    })

    const aiResponse = response.choices[0].message.content || ''

    const urgencyMatch = aiResponse.match(/\[URGENCIA:\s*(BAJA|MEDIA|ALTA|EMERGENCIA)\]/)
    const specialistMatch = aiResponse.match(/\[ESPECIALISTA:\s*([^\]]+)\]/)

    const urgencyMap: Record<string, string> = {
      'BAJA': 'low', 'MEDIA': 'medium', 'ALTA': 'high', 'EMERGENCIA': 'emergency'
    }

    const urgency = urgencyMatch ? urgencyMap[urgencyMatch[1]] : 'medium'
    const specialist = specialistMatch ? specialistMatch[1].trim() : null

    await supabase.from('ai_consultations').insert({
      patient_id: user.id,
      symptoms,
      ai_response: aiResponse,
      urgency,
      recommended_specialty: specialist,
    })

    return NextResponse.json({ response: aiResponse, urgency, specialist })

  } catch (error) {
    console.error('OpenAI error:', error)
    return NextResponse.json({ error: 'Error al procesar la consulta' }, { status: 500 })
  }
}