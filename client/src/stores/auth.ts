import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchUserById, getUserDisplayName, isAdminUser, updateUser } from '@/services/auth'
import { clearAccessToken, getAssetUrl, setStoredUserId } from '@/services/client'
import { fetchUserPointsFromHistory, createUserPointsHistory } from '@/services/exercises'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import type { User } from '@/types'

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
  const avatarUrl = computed(() => getAssetUrl(user.value?.avatar ?? user.value?.avatar_img ?? ''))
  const progress = computed(() => getLevelProgressFromPoints(points.value))

  const loadUser = async () => {
    const storedId = localStorage.getItem('gb_user_id')
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

  const syncUserLevelFromPoints = async (userId: string) => {
    try {
      const totalPoints = points.value
      const newLevel = getLevelProgressFromPoints(totalPoints).level
      const currentLevel = user.value?.level ?? 1

      if (newLevel !== currentLevel && user.value) {
        await updateUser(userId, { level: newLevel })
        user.value.level = newLevel
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
