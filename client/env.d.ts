/// <reference types="vite/client" />

declare module '@/services/flowise' {
  export type FlowiseModulePayload = {
    id: number
    titulo: string
    descricao?: string
  }

  export type GerarExerciciosParams = {
    titulo_livro: string
    numero_perguntas: number
    descricao_adicional: string
    perguntas_existentes: string
  }

  export function gerarExercicios(params: GerarExerciciosParams): Promise<any>
}
