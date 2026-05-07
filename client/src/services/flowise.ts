const FLOWISE_URL = import.meta.env.VITE_FLOWISE_URL ?? 'http://localhost:3000'
const CHATFLOW_ID = import.meta.env.VITE_FLOWISE_CHATFLOW_ID ?? '18a5aadf-041b-4c26-ba74-a062281b843d'
const DAILY_CHATFLOW_ID = import.meta.env.VITE_FLOWISE_DAILY_CHATFLOW_ID ?? '17ac9a00-1a6c-47c0-9544-2ef5a2d02bc2'

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

// Os parâmetros agora têm os nomes EXATOS das variáveis do teu Prompt Template
export type GerarExerciciosParams = {
  titulo_livro: string
  modulos: Array<{ id: number; titulo: string; descricao?: string }>
  numero_perguntas: number | string
  perguntas_existentes: string
}

export type GerarPerguntasDiariasParams = {
  titulo_livro: string
  descricao_livro: string
  modulos_livro: string
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

  console.log('[Flowise] A fazer ligacao', { url: FLOWISE_URL, chatflow: chatflowId })

  // Estrutura com dupla injeção para maximizar compatibilidade com a API do Flowise
  const flowisePayload = {
    question: questionLabel,
    overrideConfig: {
      vars: normalizedPromptValues,
      ...normalizedPromptValues,
    },
  }

  // Log corrigido para mostrar o payload real enviado e não o objeto de entrada
  console.log('[Flowise] Pedido Raw Flowise (Enviado)', JSON.stringify(flowisePayload, null, 2))

  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${chatflowId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flowisePayload),
  })

  console.log('[Flowise] A espera da resposta', { status: response.status })

  if (!response.ok) {
    const detail = await response.text()
    console.log('[Flowise] Erro recebido do Flowise', { status: response.status, detail })
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
  // Construímos o texto final aqui! A IA não tem como fugir disto.
  const modulosFormatados = params.modulos
    .map((m) => `- [ID: ${m.id}] ${m.titulo}` + (m.descricao ? ` (Descrição: ${m.descricao})` : ''))
    .join('\n')

  const promptMastigado = `
LIVRO: ${params.titulo_livro}
MÓDULOS A COBRIR:
${modulosFormatados}

NÚMERO DE PERGUNTAS POR MÓDULO: ${params.numero_perguntas}

BLACKLIST (NÃO USAR):
${params.perguntas_existentes}
  `

  // Mandamos o texto mastigado diretamente na 'question'
  return callFlowise(CHATFLOW_ID, {}, promptMastigado)
}

export async function gerarPerguntasDiarias(
  params: GerarPerguntasDiariasParams,
): Promise<FlowiseResponse> {
  const promptMastigado = `
LIVRO: ${params.titulo_livro}
DESCRIÇÃO DO LIVRO: ${params.descricao_livro}
MÓDULOS DISPONÍVEIS:
${params.modulos_livro}

NÚMERO TOTAL DE PERGUNTAS A GERAR: ${params.numero_perguntas}

BLACKLIST (NÃO USAR):
${params.perguntas_existentes}
  `

  return callFlowise(DAILY_CHATFLOW_ID, {}, promptMastigado)
}