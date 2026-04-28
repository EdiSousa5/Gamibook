export type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

export const normalizeExerciseList = (payload: any) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.exercicios)) return payload.exercicios
    if (Array.isArray(payload?.quiz)) return payload.quiz
    if (Array.isArray(payload?.data?.exercicios)) return payload.data.exercicios
    if (Array.isArray(payload?.resultados)) {
        return payload.resultados.flatMap((item: any) =>
            Array.isArray(item?.exercicios) ? item.exercicios : [],
        )
    }
    return []
}

export const normalizeModuleResults = (payload: any) => {
    if (Array.isArray(payload?.resultados)) return payload.resultados
    if (Array.isArray(payload?.modulos)) return payload.modulos
    if (Array.isArray(payload?.data?.resultados)) return payload.data.resultados
    return []
}

export const getQuestionText = (item: Record<string, any>) =>
    String(
        item.question_text || item.pergunta || item.question || item.afirmacao ||
        item.frase || item.instrucao || item.enunciado || 'Sem pergunta',
    )

export const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (!value) return []
    return String(value).split(/\n|;/).map((item) => item.trim()).filter(Boolean)
}

export const toBoolean = (value: any) => {
    if (typeof value === 'boolean') return value
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return false
    if (['true', 'verdadeiro', 'v', 'sim', 'yes'].includes(normalized)) return true
    if (['false', 'falso', 'f', 'nao', 'no'].includes(normalized)) return false
    return false
}

export const buildContent = (item: Record<string, any>, exerciseType: ExerciseType, questionText: string) => {
    const source = item?.content || item
    if (exerciseType === 'multiple-choice') {
        return {
            pergunta: questionText,
            opcoes: toArray(source.opcoes || source.options || source.alternativas),
            resposta_correta: source.resposta_correta ?? source.correta ?? '',
            justificacao: source.justificacao || source.justificativa || '',
        }
    }
    if (exerciseType === 'true-false') {
        return {
            pergunta: questionText,
            resposta_correta: toBoolean(source.resposta_correta ?? source.correta ?? source.resposta ?? source.verdadeiro),
            justificacao: source.justificacao || source.justificativa || '',
        }
    }
    return {
        pergunta: questionText,
        resposta_correta: '',
        justificacao: source.justificacao || source.justificativa || '',
    }
}

export const resolveExerciseType = (value: any, fallback?: ExerciseType): ExerciseType => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized.includes('true') || normalized.includes('false')) return 'true-false'
    if (normalized.includes('multiple') || normalized.includes('choice')) return 'multiple-choice'
    return fallback || 'multiple-choice'
}

export const resolveModuleId = (result: Record<string, any>, item: Record<string, any>, lookupByTitle: Map<string, number>) => {
    const rawId = item?.modulo_id ?? item?.module_id ?? result?.modulo_id ?? result?.module_id ?? result?.id ?? result?.modules_id
    const parsed = Number(rawId)
    if (Number.isFinite(parsed) && parsed > 0) return parsed

    const rawTitle = item?.modulo_titulo || item?.module_title || result?.modulo_titulo || result?.module_title
    if (rawTitle) {
        const matched = lookupByTitle.get(String(rawTitle).trim().toLowerCase())
        if (matched) return matched
    }
    return null
}

export const resolveModuleTitle = (moduleId: number | null, lookupById: Map<number, string>) => {
    if (!moduleId) return null
    return lookupById.get(moduleId) || null
}