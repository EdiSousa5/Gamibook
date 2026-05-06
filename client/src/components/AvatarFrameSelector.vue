<script setup lang="ts">
import { computed } from 'vue'
import type { AvatarFrame } from '@/types/avatar'
import { AVATAR_FRAMES } from '@/types/avatar'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiCard from '@/components/ui/UiCard.vue'

type Props = {
  modelValue: AvatarFrame
  unlockedFrames: AvatarFrame[]
  userLevel: number
  alt?: string
}

const props = defineProps<Props>()
defineEmits<{
  update: [value: AvatarFrame]
}>()

const framesByCategory = computed(() => {
  const categories = {
    basic: { frames: [] as AvatarFrame[], label: 'Basicos (Nivel 1+)' },
    premium: { frames: [] as AvatarFrame[], label: 'Premium (Nivel 5+)' },
    epic: { frames: [] as AvatarFrame[], label: 'Epicos (Nivel 10+)' },
  }

  const frames = Object.keys(AVATAR_FRAMES) as AvatarFrame[]
  for (const frameId of frames) {
    const config = AVATAR_FRAMES[frameId]
    categories[config.category].frames.push(frameId)
  }

  return categories
})

const isFrameLocked = (frameId: AvatarFrame): boolean => {
  return !props.unlockedFrames.includes(frameId)
}
</script>

<template>
  <UiCard class="frame-selector">
    <h3>Escolha o seu Frame de Avatar</h3>
    <div class="frames-container">
      <div v-for="(categoryData, category) in framesByCategory" :key="category" class="frame-category">
        <span class="tag">{{ categoryData.label }}</span>
        <div class="frame-row">
          <button v-for="frameId in categoryData.frames" :key="frameId" class="frame-button"
            :class="{ active: modelValue === frameId, locked: isFrameLocked(frameId) }"
            :disabled="isFrameLocked(frameId)" @click="$emit('update', frameId)">
            <UiAvatar alt="F" :size="64" :frame="frameId" />
            <div class="frame-info">
              <span class="frame-name">{{ AVATAR_FRAMES[frameId].name }}</span>
              <span v-if="isFrameLocked(frameId)" class="frame-status locked">
                Bloqueado - Nivel {{ AVATAR_FRAMES[frameId].requiredLevel }}
              </span>
              <span v-else class="frame-status unlocked">Desbloqueado</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </UiCard>
</template>

<style scoped>
.frame-selector {
  display: grid;
  gap: var(--space-400);
}

h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.frames-container {
  display: grid;
  gap: var(--space-400);
}

.frame-category {
  display: grid;
  gap: var(--space-200);
}

.frame-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-300);
}

.frame-button {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
  align-items: center;
  padding: var(--space-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.frame-button:hover:not(:disabled) {
  background: var(--color-wild-200);
  transform: translateY(-2px);
}

.frame-button.active {
  background: var(--color-teal-100);
  border-color: var(--color-teal-500);
  box-shadow: 0 0 0 3px rgba(46, 127, 123, 0.1);
}

.frame-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.frame-info {
  display: grid;
  gap: 4px;
  text-align: center;
}

.frame-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.frame-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.frame-status.locked {
  color: var(--color-mirage-500);
}

.frame-status.unlocked {
  color: var(--color-teal-600);
}
</style>
