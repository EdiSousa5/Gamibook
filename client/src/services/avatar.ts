import type { AvatarFrame, UserAvatarCustomization, AvatarFrameConfig } from '@/types/avatar'
import { AVATAR_FRAMES } from '@/types/avatar'
import { authFetch } from './client'

export const getUnlockedFrames = (userLevel: number): AvatarFrame[] => {
  return (Object.keys(AVATAR_FRAMES) as AvatarFrame[]).filter(
    (frameId) => AVATAR_FRAMES[frameId].requiredLevel <= userLevel,
  )
}

export const fetchUserAvatarCustomization = async (
  userId: string,
): Promise<UserAvatarCustomization | null> => {
  const params = new URLSearchParams({
    limit: '1',
  })
  params.set('filter[userId][_eq]', userId)

  const response = await authFetch(`/items/user_avatar_customizations?${params.toString()}`)
  if (!response.ok) return null

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as UserAvatarCustomization[]
  return items[0] ?? null
}

export const createUserAvatarCustomization = async (
  userId: string,
  unlockedFrames: AvatarFrame[],
  activeFrame: AvatarFrame = 'essence',
): Promise<UserAvatarCustomization> => {
  const body = {
    userId,
    unlockedFrames,
    activeFrame,
  }

  const response = await authFetch('/items/user_avatar_customizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Create avatar customization failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as UserAvatarCustomization
}

export const updateActiveFrame = async (
  customizationId: string,
  activeFrame: AvatarFrame,
): Promise<UserAvatarCustomization> => {
  const body = { activeFrame }

  const response = await authFetch(`/items/user_avatar_customizations/${customizationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Update active frame failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as UserAvatarCustomization
}

export const unlockFrameForUser = async (
  userId: string,
  newFrame: AvatarFrame,
  userLevel: number,
): Promise<UserAvatarCustomization | null> => {
  const frameConfig = AVATAR_FRAMES[newFrame]
  if (!frameConfig || frameConfig.requiredLevel > userLevel) {
    console.warn(`Frame ${newFrame} cannot be unlocked at level ${userLevel}`)
    return null
  }

  const customization = await fetchUserAvatarCustomization(userId)
  if (!customization?.id) {
    const unlockedFrames = getUnlockedFrames(userLevel)
    return createUserAvatarCustomization(userId, unlockedFrames, newFrame)
  }

  const unlockedFrames = Array.from(new Set([...customization.unlockedFrames, newFrame]))
  return updateActiveFrame(customization.id, newFrame)
}
