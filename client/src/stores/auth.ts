import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchUserById, getUserDisplayName, isAdminUser } from '@/services/auth'
import { clearAccessToken, getAssetUrl, setStoredUserId } from '@/services/client'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)

  const levelUpVisible = ref(false)
  const levelUpOld = ref(1)
  const levelUpNew = ref(2)
  const levelUpPoints = ref(0)

  const isAuthed = computed(() => !!user.value)
  const displayName = computed(() => getUserDisplayName(user.value))
  const isAdmin = computed(() => isAdminUser(user.value))
  const avatarUrl = computed(() =>
    getAssetUrl(user.value?.avatar ?? user.value?.avatar_img ?? ''),
  )
  const progress = computed(() => getLevelProgressFromPoints(user.value?.points ?? 0))

  const loadUser = async () => {
    const storedId = localStorage.getItem('gb_user_id')
    if (!storedId) {
      user.value = null
      return
    }
    try {
      user.value = await fetchUserById(storedId)
    } catch {
      user.value = null
    }
  }

  const logout = async (router: { push: (path: string) => Promise<unknown> }) => {
    setStoredUserId(null)
    clearAccessToken()
    user.value = null
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
    progress,
    loadUser,
    logout,
    triggerLevelUp,
  }
})
