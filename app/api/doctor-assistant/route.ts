import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { patientId, question, messages } = await request.json()

  // Verificar que el médico tiene acceso vigente al paciente
  const { data: grant } = await supabase
    .from('access_grants')
    .select('id')
    .eq('doctor_id', user.id)
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!grant) {
    return NextResponse.json({ error: 'No tienes acceso a este paciente' }, { status: 403 })
  }

  // Cargar perfil completo del paciente
  const { data: patient } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .single()

  // Cargar todos los documentos
  const { data: documents } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('document_date', { ascending: false })

  // Cargar valores de laboratorio
  const { data: labValues } = await supabase
    .from('lab_values')
    .select('*, document:document_id(title, document_date)')
    .eq('patient_id', patientId)
    .order('measured_at', { ascending: false })

  // Cargar consultas de triage anteriores
  const { data: triageHistory } = await supabase
    .from('ai_consultations')
    .select('symptoms, urgency, recommended_specialty, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Calcular edad
  const age = patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  // Construir contexto clínico completo
  const clinicalContext = `
PACIENTE: ${patient?.full_name || 'Desconocido'}
${age ? `Edad: ${age} años` : ''}
${patient?.birth_date ? `Fecha de nacimiento: ${patient.birth_date}` : ''}
${patient?.rut ? `RUT: ${patient.rut}` : ''}
${patient?.blood_type ? `Grupo sanguíneo: ${patient.blood_type}` : ''}
${patient?.phone ? `Teléfono: ${patient.phone}` : ''}

ALERGIAS:
${patient?.allergies?.length ? patient.allergies.map((a: string) => `- ${a}`).join('\n') : '- Sin alergias registradas'}

CONDICIONES CRÓNICAS:
${patient?.chronic_conditions?.length ? patient.chronic_conditions.map((c: string) => `- ${c}`).join('\n') : '- Sin condiciones crónicas registradas'}

MEDICAMENTOS ACTUALES:
${patient?.current_medications?.length ? patient.current_medications.map((m: string) => `- ${m}`).join('\n') : '- Sin medicamentos registrados'}

DOCUMENTOS MÉDICOS (${documents?.length || 0} en total):
${documents?.slice(0, 15).map(d =>
    `- [${d.category.toUpperCase()}] ${d.title} (${d.document_date || 'sin fecha'})${d.ai_summary ? ': ' + d.ai_summary : ''}`
  ).join('\n') || '- Sin documentos'}

VALORES DE LABORATORIO RECIENTES:
${labValues?.slice(0, 20).map(v =>
    `- ${v.name}: ${v.value} ${v.unit || ''} ${v.ref_min && v.ref_max ? `(ref: ${v.ref_min}-${v.ref_max})` : ''} ${v.is_abnormal ? '⚠️ FUERA DE RANGO' : ''} — ${v.document?.document_date || 'sin fecha'}`
  ).join('\n') || '- Sin valores de laboratorio'}

CONSULTAS DE ORIENTACIÓN IA PREVIAS:
${triageHistory?.length ? triageHistory.map(t =>
    `- ${new Date(t.created_at).toLocaleDateString('es-CL')}: "${t.symptoms}" → Urgencia: ${t.urgency}, Especialista sugerido: ${t.recommended_specialty || 'no especificado'}`
  ).join('\n') : '- Sin consultas previas'}
`.trim()

  const systemPrompt = `Eres un asistente clínico de apoyo para médicos, integrado en MedApp. Tienes acceso al historial médico completo del paciente y tu rol es ayudar al médico durante la consulta.

${clinicalContext}

INSTRUCCIONES:
1. Responde de forma concisa y clínica — el médico necesita información rápida y precisa
2. Cuando menciones valores de laboratorio, indica si están dentro o fuera del rango de referencia
3. Advierte siempre sobre alergias relevantes si la pregunta involucra medicamentos
4. Si detectas patrones preocupantes en el historial, mencionarlos proactivamente
5. Puedes sugerir preguntas que el médico debería hacerle al paciente
6. Recuerda que eres un apoyo — la decisión clínica final es siempre del médico
7. Responde en español, tono profesional pero directo`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages || []),
        { role: 'user', content: question },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    })

    const aiResponse = response.choices[0].message.content || ''

    return NextResponse.json({ response: aiResponse })

  } catch (error) {
    console.error('Error asistente médico:', error)
    return NextResponse.json({ error: 'Error al procesar la consulta' }, { status: 500 })
  }
}