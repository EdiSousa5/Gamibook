import type { ExerciseContent } from '@/types'

export type ExerciseLike = {
  type?: string
  content?: ExerciseContent
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}

export function toOptionArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (!value) return []
  return String(value).split(/\n|;/).map((item) => item.trim()).filter(Boolean)
}

export function toBoolean(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['true', 'verdadeiro', 'v', 'sim', 'yes'].includes(normalized)
}

export function getOptionLetter(value: string): string {
  return value.trim().match(/^([A-F])\)/i)?.[1]?.toUpperCase() ?? ''
}

export function getOptionText(value: string): string {
  return value.trim().replace(/^[A-F]\)\s*/i, '')
}

export function buildOptions(exercise: ExerciseLike): string[] {
  if (exercise.type === 'true-false') return ['Falso', 'Verdadeiro']
  const rawOptions = toOptionArray(exercise.content?.opcoes || exercise.content?.options)
  if (rawOptions.length <= 4) return rawOptions
  const correctValue = String(exercise.content?.resposta_correta ?? '').trim().toUpperCase()
  const correctByLetter = rawOptions.find((o) => getOptionLetter(o) === correctValue)
  const correctByText = rawOptions.find((o) => o.trim().toUpperCase() === correctValue)
  const correctOption = correctByLetter || correctByText
  if (!correctOption) return shuffleArray(rawOptions).slice(0, 4)
  const wrongs = rawOptions.filter((o) => o !== correctOption)
  if (wrongs.length < 3) return shuffleArray(rawOptions).slice(0, 4)
  return shuffleArray([correctOption, ...shuffleArray(wrongs).slice(0, 3)])
}

export function isOptionCorrect(exercise: ExerciseLike, option: string): boolean {
  if (exercise.type === 'true-false') {
    const normalized = option.trim().toLowerCase()
    const expected = toBoolean(exercise.content?.resposta_correta)
    return expected ? normalized.startsWith('verd') : normalized.startsWith('fals')
  }
  const correct = String(exercise.content?.resposta_correta ?? '').trim()
  const letter = getOptionLetter(option)
  const correctLetter = correct.toUpperCase()
  if (letter && correctLetter) return letter === correctLetter
  return option.trim() === correct
}

export function getQuestionText(exercise: ExerciseLike & { question_text?: unknown }): string {
  const c = exercise.content ?? {}
  return (
    (exercise.question_text as string) ||
    (c.pergunta as string) ||
    (c.question as string) ||
    (c.enunciado as string) ||
    (c.frase as string) ||
    (c.afirmacao as string) ||
    'Pergunta indisponível'
  )
}
