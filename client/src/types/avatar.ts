export type AvatarFrame = 'essence' | 'bloom' | 'ember' | 'aurora' | 'nebula' | 'ethereal' | 'void'

export type AvatarBorder =
  | 'default'
  | 'minimal'
  | 'heavy'
  | 'ring'

export type AvatarColor =
  | 'none'
  | 'teal' | 'teal-dark' | 'teal-light'
  | 'amber' | 'amber-dark' | 'pumpkin'
  | 'crimson' | 'crimson-dark'
  | 'slate' | 'slate-dark' | 'black'
  | 'galaxy' | 'ocean' | 'inferno' | 'forest'

export type AvatarEffect = 'none' | 'glow' | 'shine' | 'aura' | 'sombra'

export type AvatarShadow = 'none' | 'small' | 'default'

export type AvatarCracha =
  | 'rank'
  | 'exercises'
  | 'streak'
  | 'level'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'diamond'
  | 'galaxy'

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
    name: 'Rascunho',
    requiredLevel: 1,
    category: 'basic',
    description: 'O ponto de partida de qualquer leitor',
  },
  bloom: {
    id: 'bloom',
    name: 'Contorno',
    requiredLevel: 3,
    category: 'basic',
    description: 'A primeira marca de quem está a traçar o seu caminho',
  },
  ember: {
    id: 'ember',
    name: 'Relevo',
    requiredLevel: 5,
    category: 'premium',
    description: 'Presença mais forte, como palavras gravadas a fundo',
  },
  aurora: {
    id: 'aurora',
    name: 'Duplo',
    requiredLevel: 7,
    category: 'premium',
    description: 'Duas camadas, dois mundos — o da história e o teu',
  },
  nebula: {
    id: 'nebula',
    name: 'Marca',
    requiredLevel: 9,
    category: 'epic',
    description: 'Deixaste a tua marca na plataforma',
  },
  ethereal: {
    id: 'ethereal',
    name: 'Destaque',
    requiredLevel: 11,
    category: 'epic',
    description: 'Reconhecido entre os melhores leitores',
  },
  void: {
    id: 'void',
    name: 'Lenda',
    requiredLevel: 15,
    category: 'epic',
    description: 'O cume — reservado para quem domina a arte da leitura',
  },
}
