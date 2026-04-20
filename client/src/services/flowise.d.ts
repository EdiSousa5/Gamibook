export type FlowiseModulePayload = {
  id: number
  titulo: string
  descricao?: string
  exemplos?: string
}

export type GerarExerciciosParams = {
  tituloLivro: string
  modulos: FlowiseModulePayload[] | string
  tipoExercicio?: string
  numeroPerguntas?: number
}

export function gerarExercicios(params: GerarExerciciosParams): Promise<any>
