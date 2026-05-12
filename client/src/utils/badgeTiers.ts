import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'

export const BADGE_TIERS: BookBadgeTier[] = ['bronze', 'silver', 'gold', 'diamond', 'galaxy']

export const TIER_LABELS: Record<BookBadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  diamond: 'Diamante',
  galaxy: 'Galáxia',
}

export const TIER_DESCS: Record<BookBadgeTier, string> = {
  bronze: 'Acerta ≥ 25% dos exercícios',
  silver: 'Acerta ≥ 50% dos exercícios',
  gold: 'Acerta ≥ 75% dos exercícios',
  diamond: 'Acerta 100% dos exercícios',
  galaxy: 'Completa o Quiz Final',
}
