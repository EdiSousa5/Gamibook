const FLOWISE_URL = import.meta.env.VITE_FLOWISE_URL ?? 'http://localhost:3000'
const FLOWISE_API_KEY: string = import.meta.env.VITE_FLOWISE_API_KEY ?? ''
const CHATFLOW_ID: string = import.meta.env.VITE_FLOWISE_CHATFLOW_ID ?? ''

if (!CHATFLOW_ID) {
  console.warn('VITE_FLOWISE_CHATFLOW_ID não está definido. A geração de exercícios irá falhar.')
}

type FlowiseRawData = {
  json?: Record<string, unknown>
  data?: unknown
  text?: string
  [key: string]: unknown
}

type FlowiseResponse = {
  raw: FlowiseRawData
  parsed: Record<string, unknown> | unknown[]
}

export type GerarExerciciosParams = {
  titulo_livro: string
  modulos: Array<{ id: number; titulo: string; descricao?: string }>
  numero_perguntas: number | string
  perguntas_existentes: string
}

const callFlowise = async (
  chatflowId: string,
  promptValues: Record<string, string | number | object>,
  questionLabel: string,
): Promise<FlowiseResponse> => {
  const normalizedPromptValues = Object.fromEntries(
    Object.entries(promptValues).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return [key, JSON.stringify(value)]
      }
      return [key, value == null ? '' : String(value)]
    }),
  )

  const flowisePayload = {
    question: questionLabel,
    overrideConfig: {
      vars: { question: questionLabel, ...normalizedPromptValues },
      question: questionLabel,
      ...normalizedPromptValues,
    },
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`

  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${chatflowId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(flowisePayload),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Erro ao contactar o Flowise: ${detail}`)
  }

  const data = await response.json() as FlowiseRawData

  try {
    if (data?.json) {
      const jsonKeys = Object.keys(data.json)
      const resultadosVal = (data.json as Record<string, unknown>).resultados
      const resultadosCount = Array.isArray(resultadosVal) ? resultadosVal.length : 0
      const hasJsonContent = jsonKeys.length > 0 || resultadosCount > 0

      if (hasJsonContent) return { raw: data, parsed: data.json }
    }

    if (data?.data) return { raw: data, parsed: data.data as Record<string, unknown> }
    if (typeof data?.text !== 'string') return { raw: data, parsed: data }

    try {
      return { raw: data, parsed: JSON.parse(data.text) as Record<string, unknown> }
    } catch {
      const start = data.text.indexOf('{')
      const end = data.text.lastIndexOf('}')
      if (start >= 0 && end > start) {
        return { raw: data, parsed: JSON.parse(data.text.slice(start, end + 1)) as Record<string, unknown> }
      }
      throw new Error('JSON nao encontrado na resposta do Flowise')
    }
  } catch {
    return { raw: data, parsed: data }
  }
}

export async function gerarExercicios(params: GerarExerciciosParams): Promise<FlowiseResponse> {
  const modulosFormatados = params.modulos
    .map((m) => `- [ID: ${m.id}] ${m.titulo}` + (m.descricao ? ` (Descrição: ${m.descricao})` : ''))
    .join('\n')

  const question = [
    `LIVRO: ${params.titulo_livro}`,
    `NÚMERO DE PERGUNTAS POR MÓDULO: ${params.numero_perguntas}`,
    `BLACKLIST (perguntas existentes que não podes repetir):\n${params.perguntas_existentes}`,
    `MÓDULOS A COBRIR:\n${modulosFormatados}`,
  ].join('\n\n')

  return callFlowise(CHATFLOW_ID, {}, question)
}
