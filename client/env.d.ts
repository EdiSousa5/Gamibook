/// <reference types="vite/client" />

declare module '@/services/flowise' {
  export type FlowiseModulePayload = {
    id: number
    titulo: string
    descricao?: string
    exemplos?: string
  }

  export type GerarExerciciosParams = {
    tituloLivro: string
    modulos: FlowiseModulePayload[] | string
    numeroPerguntas?: number
  }

  export function gerarExercicios(params: GerarExerciciosParams): Promise<any>
}
