const FLOWISE_URL = 'http://localhost:3000'
const CHATFLOW_ID = '18a5aadf-041b-4c26-ba74-a062281b843d'

export async function gerarExercicios({
  tituloLivro,
  modulos,
  tipoExercicio = 'multiple-choice, true-false',
  numeroPerguntas = 5,
}) {
  console.log('[Flowise] A fazer ligacao', { url: FLOWISE_URL, chatflow: CHATFLOW_ID })
  const totalPerguntas = Number(numeroPerguntas || 5)
  const modulosPayload =
    typeof modulos === 'string' ? modulos : JSON.stringify(modulos ?? [], null, 0)
  const promptValues = {
    titulo_livro: tituloLivro || 'Sem título',
    modulos: modulosPayload,
    tipo_exercicio: tipoExercicio,
    numero_perguntas: Number.isFinite(totalPerguntas) ? totalPerguntas : 5,
  }

  console.log('[Flowise] Ligacao feita. A enviar pedido...', {
    tipoExercicio,
    totalPerguntas,
  })
  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'gerar exercicios',
      overrideConfig: { promptValues },
    }),
  })

  console.log('[Flowise] A espera da resposta', { status: response.status })
  if (!response.ok) {
    const detail = await response.text()
    console.log('[Flowise] Erro recebido do Flowise', { status: response.status, detail })
    throw new Error(`Erro ao contactar o Flowise: ${detail}`)
  }

  console.log('[Flowise] Resposta recebida. A processar...')
  const data = await response.json()
  console.log('[Flowise] Payload bruto recebido', {
    keys: data && typeof data === 'object' ? Object.keys(data) : typeof data,
  })
  try {
    console.log('[Flowise] JSON recebido. A converter texto para objeto...')
    console.log('[Flowise] Tipo de data.json', {
      type: typeof data?.json,
      isNull: data?.json === null,
      isArray: Array.isArray(data?.json),
    })
    if (data?.json) {
      const jsonKeys = Object.keys(data.json || {})
      const resultadosCount = Array.isArray(data.json?.resultados) ? data.json.resultados.length : 0
      const exerciciosPrimeiroTipo = Array.isArray(data.json?.resultados?.[0]?.exercicios)
        ? data.json.resultados[0].exercicios.length
        : 0
      const hasJsonContent = jsonKeys.length > 0 || resultadosCount > 0

      console.log('[Flowise] Payload json', {
        keys: jsonKeys,
        resultadosCount,
        exerciciosPrimeiroTipo,
      })

      if (hasJsonContent) return data.json
      console.log('[Flowise] Payload json vazio. A tentar outras formas...')
    }
    if (data?.data) return data.data
    if (typeof data?.text !== 'string') return data
    console.log('[Flowise] Texto bruto recebido', {
      preview: data.text.slice(0, 800),
      length: data.text.length,
    })
    try {
      return JSON.parse(data.text)
    } catch {
      const start = data.text.indexOf('{')
      const end = data.text.lastIndexOf('}')
      if (start >= 0 && end > start) {
        return JSON.parse(data.text.slice(start, end + 1))
      }
      throw new Error('JSON nao encontrado na resposta do Flowise')
    }
  } catch {
    console.log('[Flowise] Resposta nao estava em texto JSON. A devolver bruto.')
    return data
  }
}
