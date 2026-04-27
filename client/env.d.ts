/// <reference types="vite/client" />

declare module '@/services/flowise.ts' {
  export type FlowiseModulePayload = {
    id: number
    titulo: string
    descricao?: string
  }

  export type GerarExerciciosParams = {
    titulo_livro: string
    modulos: FlowiseModulePayload[]
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

  export function gerarExercicios(params: GerarExerciciosParams): Promise<any>
  export function gerarPerguntasDiarias(params: GerarPerguntasDiariasParams): Promise<any>
}
