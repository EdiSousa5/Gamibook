const FLOWISE_URL = 'http://localhost:3000'
const CHATFLOW_ID = '18a5aadf-041b-4c26-ba74-a062281b843d'

export async function gerarQuiz(tituloLivro, moduloTitulo, descricao = '') {
  const promptValues = {
    titulo_livro: tituloLivro || 'Sem título de livro',
    modulo_titulo: moduloTitulo || 'Sem título de módulo',
    descricao: descricao?.trim() || 'Sem descrição adicional',
  }

  const payload = {
    question: 'gerar quiz',
    overrideConfig: {
      promptValues,
    },
  }

  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Erro ao contactar o Flowise: ${detail || response.status}`)
  }

  const data = await response.json()
  try {
    return JSON.parse(data.text)
  } catch {
    return data
  }
}