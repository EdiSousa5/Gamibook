export type AvatarFrame = 'essence' | 'bloom' | 'ember' | 'aurora' | 'nebula' | 'ethereal' | 'void'

export type AvatarFrameConfig = {
  id: AvatarFrame
  name: string
  requiredLevel: number
  category: 'basic' | 'premium' | 'epic'
  description: string
}

export type UserAvatarCustomization = {
  id?: string
  userId?: string
  unlockedFrames: AvatarFrame[]
  activeFrame: AvatarFrame
  date_updated?: string | null
}

export const AVATAR_FRAMES: Record<AvatarFrame, AvatarFrameConfig> = {
  essence: {
    id: 'essence',
    name: 'Essence',
    requiredLevel: 1,
    category: 'basic',
    description: 'A essência pura, simples e elegante',
  },
  bloom: {
    id: 'bloom',
    name: 'Bloom',
    requiredLevel: 3,
    category: 'basic',
    description: 'Flores que desabrocham continuamente',
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    requiredLevel: 5,
    category: 'premium',
    description: 'Chamas dançantes de um fogo celestial',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    requiredLevel: 7,
    category: 'premium',
    description: 'Aurora boreal em tons vibrantes',
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula',
    requiredLevel: 9,
    category: 'epic',
    description: 'Uma nebulosa cósmica em rotação',
  },
  ethereal: {
    id: 'ethereal',
    name: 'Ethereal',
    requiredLevel: 11,
    category: 'epic',
    description: 'Aura etérea e luminosa',
  },
  void: {
    id: 'void',
    name: 'Void',
    requiredLevel: 15,
    category: 'epic',
    description: 'O abismo infinito com poder cósmico',
  },
}
