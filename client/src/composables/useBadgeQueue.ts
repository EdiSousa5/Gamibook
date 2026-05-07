import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import { checkAndUpdateBadge, TIER_ORDER } from '@/services/badges'
import type { BadgeTierOrDefault } from '@/services/badges'

export function useBadgeQueue(
  userId: Ref<string | null>,
  bookId: ComputedRef<number>,
  isLevelUpQueued: Ref<boolean>,
  initialBadge: Ref<string>,
) {
  const badgeQueue = ref<BookBadgeTier[]>([])
  const showBadgeModal = computed(() => badgeQueue.value.length > 0)
  const earnedBadgeTier = computed<BookBadgeTier | null>(() => badgeQueue.value[0] ?? null)

  const enqueueBadgeModals = (newBadge: string) => {
    if (newBadge === 'default' || newBadge === initialBadge.value) return
    const startRank = Math.max(0, TIER_ORDER.indexOf(initialBadge.value as BadgeTierOrDefault))
    const endRank = TIER_ORDER.indexOf(newBadge as BadgeTierOrDefault)
    if (endRank <= startRank) return
    const earned: BookBadgeTier[] = []
    for (let r = startRank + 1; r <= endRank; r++) {
      const t = TIER_ORDER[r]
      if (t && t !== 'default') earned.push(t as BookBadgeTier)
    }
    initialBadge.value = newBadge
    if (earned.length > 0) {
      const delay = isLevelUpQueued.value ? 6000 : 1000
      setTimeout(() => { badgeQueue.value = [...badgeQueue.value, ...earned] }, delay)
    }
  }

  const runBadgeCheck = async () => {
    if (!userId.value) return
    const newBadge = await checkAndUpdateBadge(userId.value, bookId.value).catch(
      () => initialBadge.value,
    )
    enqueueBadgeModals(String(newBadge))
  }

  const handleBadgeModalClose = () => {
    badgeQueue.value = badgeQueue.value.slice(1)
  }

  return { badgeQueue, showBadgeModal, earnedBadgeTier, runBadgeCheck, handleBadgeModalClose }
}
