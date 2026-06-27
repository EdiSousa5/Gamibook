import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchUserById, fetchUserByIdBase, getUserDisplayName, isAdminUser, updateUser } from '@/services/auth'
import { clearAccessToken, clearRefreshToken, getAssetUrl, getStoredUserId, setStoredUserId } from '@/services/client'
import { fetchUserPointsFromHistory, createUserPointsHistory } from '@/services/exercises'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import type { User } from '@/types'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow } from '@/types/avatar'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const points = ref(0)
  const isInitialLoad = ref(false)

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
      // /users/{id} retorna role.name corretamente para todos os roles;
      // /users/me pode devolver apenas o UUID do role para editora/autor
      const baseUser = await fetchUserByIdBase(storedId)
      user.value = baseUser

      if (isAdminUser(baseUser)) {
        points.value = 0
        return
      }

      // Utilizador normal: buscar campos de gamificação + pontos em paralelo
      const [fullUser, totalPoints] = await Promise.all([
        fetchUserById(storedId).catch(() => null),
        fetchUserPointsFromHistory(storedId).catch(() => 0),
      ])
      if (!fullUser) {
        points.value = 0
        return
      }
      isInitialLoad.value = true
      user.value = fullUser
      points.value = totalPoints
      await syncUserLevelFromPoints(storedId)
    } catch {
      user.value = null
      points.value = 0
    } finally {
      isInitialLoad.value = false
    }
  }

  const refreshPoints = async (userId?: string) => {
    if (isAdmin.value) return 0

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

  const syncUserLevelFromPoints = async (userId: string) => {
    if (isAdmin.value) return

    try {
      const totalPoints = points.value
      const newLevel = getLevelProgressFromPoints(totalPoints).level
      const currentLevel = user.value?.level ?? 1

      if (newLevel !== currentLevel && user.value) {
        const oldLevel = currentLevel
        await updateUser(userId, { level: newLevel })
        user.value.level = newLevel
        if (newLevel > oldLevel && !isInitialLoad.value) {
          triggerLevelUp(oldLevel, newLevel, totalPoints)
        }
      }
    } catch {
      // sync failure is non-critical — level will be corrected on next load
    }
  }

  const setPoints = (value: number) => {
    points.value = value
  }

  const logout = async (router: { push: (path: string) => Promise<unknown> }) => {
    await router.push('/')
    setStoredUserId(null)
    clearAccessToken()
    clearRefreshToken()
    user.value = null
    points.value = 0
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
    isInitialLoad,
    loadUser,
    refreshPoints,
    syncUserLevelFromPoints,
    setPoints,
    logout,
    triggerLevelUp,
  }
})
