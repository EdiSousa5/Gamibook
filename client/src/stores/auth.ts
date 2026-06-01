import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchUserById, getUserDisplayName, isAdminUser, updateUser } from '@/services/auth'
import { clearAccessToken, getAssetUrl, getStoredUserId, setStoredUserId } from '@/services/client'
import { fetchUserPointsFromHistory, createUserPointsHistory } from '@/services/exercises'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import type { User } from '@/types'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow } from '@/types/avatar'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const points = ref(0)

  const levelUpVisible = ref(false)
  const levelUpOld = ref(1)
  const levelUpNew = ref(2)
  const levelUpPoints = ref(0)

  const isAuthed = computed(() => !!user.value)
  const displayName = computed(() => getUserDisplayName(user.value))
  const isAdmin = computed(() => isAdminUser(user.value))
  const avatarUrl = computed(() => getAssetUrl(user.value?.avatar ?? ''))
  const progress = computed(() => getLevelProgressFromPoints(points.value))
  const avatarConfig = computed(() => ({
    border: (user.value?.avatar_border as AvatarBorder) || 'default' as AvatarBorder,
    avatarColor: (user.value?.avatar_color as AvatarColor) || undefined,
    effect: (user.value?.avatar_effect as AvatarEffect) || undefined,
    shadow: (user.value?.avatar_shadow as AvatarShadow) || 'default' as AvatarShadow,
  }))

  const loadUser = async () => {
    const storedId = getStoredUserId()
    if (!storedId) {
      user.value = null
      points.value = 0
      return
    }
    try {
      const [userData, totalPoints] = await Promise.all([
        fetchUserById(storedId),
        fetchUserPointsFromHistory(storedId).catch(() => 0),
      ])
      user.value = userData
      points.value = totalPoints
      await syncUserLevelFromPoints(storedId)
    } catch {
      user.value = null
      points.value = 0
    }
  }

  const refreshPoints = async (userId?: string) => {
    const targetId = userId || (user.value?.id ? String(user.value.id) : null)
    if (!targetId) {
      points.value = 0
      return 0
    }
    try {
      const total = await fetchUserPointsFromHistory(targetId)
      points.value = total
      await syncUserLevelFromPoints(targetId)
      return total
    } catch {
      return points.value
    }
  }

  const LEVELS_WITH_UNLOCKS = new Set([2, 3, 5, 7, 8, 10, 12, 14, 15, 16, 18, 20])

  const syncUserLevelFromPoints = async (userId: string) => {
    try {
      const totalPoints = points.value
      const newLevel = getLevelProgressFromPoints(totalPoints).level
      const currentLevel = user.value?.level ?? 1

      if (newLevel !== currentLevel && user.value) {
        const oldLevel = currentLevel
        await updateUser(userId, { level: newLevel })
        user.value.level = newLevel

        if (newLevel > oldLevel) {
          triggerLevelUp(oldLevel, newLevel, totalPoints)
          const { useNotificationsStore } = await import('./notifications')
          const notifStore = useNotificationsStore()
          notifStore.add({
            user: userId,
            title: `Nível ${newLevel} atingido!`,
            message: `Subiste do nível ${oldLevel} para o nível ${newLevel}. Continua assim!`,
            type: 'achievement',
          })
          if (newLevel === 3) {
            notifStore.add({
              user: userId,
              title: 'Desafios diários desbloqueados!',
              message: 'Chegaste ao nível 3! Os desafios diários estão agora disponíveis. Completa um por dia para manteres a tua sequência.',
              type: 'new_content',
            })
          }
          if (LEVELS_WITH_UNLOCKS.has(newLevel)) {
            notifStore.add({
              user: userId,
              title: 'Novas customizações desbloqueadas!',
              message: `O nível ${newLevel} trouxe novos itens de personalização. Experimenta-os nas definições de aparência.`,
              type: 'new_content',
            })
          }
        }
      }
    } catch {
      console.error('Failed to sync user level')
    }
  }

  const setPoints = (value: number) => {
    points.value = value
  }

  const logout = async (router: { push: (path: string) => Promise<unknown> }) => {
    setStoredUserId(null)
    clearAccessToken()
    user.value = null
    points.value = 0
    await router.push('/')
  }

  const triggerLevelUp = (oldLevel: number, newLevel: number, currentPoints: number) => {
    levelUpOld.value = oldLevel
    levelUpNew.value = newLevel
    levelUpPoints.value = currentPoints
    levelUpVisible.value = true
  }

  return {
    user,
    levelUpVisible,
    levelUpOld,
    levelUpNew,
    levelUpPoints,
    isAuthed,
    displayName,
    isAdmin,
    avatarUrl,
    avatarConfig,
    points,
    progress,
    loadUser,
    refreshPoints,
    syncUserLevelFromPoints,
    setPoints,
    logout,
    triggerLevelUp,
  }
})
