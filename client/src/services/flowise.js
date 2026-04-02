const FLOWISE_URL = 'http://localhost:3000'
const CHATFLOW_ID = '18a5aadf-041b-4c26-ba74-a062281b843d'

export async function gerarExercicios(
  tituloLivro,
  moduloTitulo,
  descricao = '',
  tipoExercicio = 'multiple-choice',
  dificuldade = 'medium',
  numeroPerguntas = 5,
) {
  const totalPerguntas = Number(numeroPerguntas || 5)
  const promptValues = {
    titulo_livro: tituloLivro || 'Sem título',
    modulo_titulo: moduloTitulo || 'Sem título',
    descricao: descricao || 'Sem descrição adicional',
    tipo_exercicio: tipoExercicio,
    dificuldade: dificuldade,
    numero_perguntas: Number.isFinite(totalPerguntas) ? totalPerguntas : 5,
  }

  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'gerar exercicios',
      overrideConfig: { promptValues },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Erro ao contactar o Flowise: ${detail}`)
  }

  const data = await response.json()
  try {
    return JSON.parse(data.text)
  } catch {
    return data
  }
}
