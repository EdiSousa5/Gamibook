/// <reference types="vite/client" />

declare module '@/services/flowise' {
  export function gerarExercicios(
    tituloLivro: string,
    moduloTitulo: string,
    descricao?: string,
    tipoExercicio?: 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering',
    dificuldade?: 'easy' | 'medium' | 'hard',
    numeroPerguntas?: number,
  ): Promise<any>
}
