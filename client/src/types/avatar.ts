export type AvatarFrame = 'classic' | 'gold' | 'silver' | 'crystal' | 'neon' | 'cosmic' | 'forest'

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
  classic: {
    id: 'classic',
    name: 'Classic',
    requiredLevel: 1,
    category: 'basic',
    description: 'O frame clássico padrão',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    requiredLevel: 1,
    category: 'basic',
    description: 'Um frame de prata elegante',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    requiredLevel: 5,
    category: 'premium',
    description: 'Um frame dourado de luxo',
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal',
    requiredLevel: 5,
    category: 'premium',
    description: 'Um frame cristalino brilhante',
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    requiredLevel: 10,
    category: 'epic',
    description: 'Um frame neon futurista',
  },
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic',
    requiredLevel: 10,
    category: 'epic',
    description: 'Um frame cósmico místico',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    requiredLevel: 10,
    category: 'epic',
    description: 'Um frame florestal natural',
  },
}
