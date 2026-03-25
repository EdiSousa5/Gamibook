const FLOWISE_URL = 'http://localhost:3000'
const CHATFLOW_ID = '18a5aadf-041b-4c26-ba74-a062281b843d'

export async function gerarQuiz(titulo, descricao = '') {
  const safeTitulo = titulo || 'Sem titulo'
  const safeDescricao = descricao && String(descricao).trim() ? descricao : 'Sem descricao'
  const promptValues = {
    titulo: safeTitulo,
    descricao: safeDescricao,
  }
  const payload = {
    question: 'gerar quiz',
    inputs: promptValues,
    inputVariables: promptValues,
    promptValues: promptValues,
    vars: promptValues,
    overrideConfig: {
      promptValues: promptValues,
      inputVariables: promptValues,
      vars: promptValues,
    },
  }
  console.debug('[Flowise] payload', payload)
  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error('[Flowise] error response', response.status, detail)
    throw new Error(`Erro ao contactar o Flowise: ${detail || response.status}`)
  }

  const data = await response.json()
  console.debug('[Flowise] response data', data)
  try {
    return JSON.parse(data.text)
  } catch {
    return data
  }
}
