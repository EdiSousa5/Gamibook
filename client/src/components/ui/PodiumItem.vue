<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import { EyeIcon } from '@heroicons/vue/24/outline'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow } from '@/types/avatar'

const props = defineProps<{
    position: number
    points: number
    level: number
    avatarUrl?: string | null
    displayName: string
    elementId?: string
    userId?: string | null
    avatarBorder?: AvatarBorder
    avatarColor?: AvatarColor
    avatarEffect?: AvatarEffect
    avatarShadow?: AvatarShadow
}>()

const emit = defineEmits<{ 'click-user': [string] }>()

const isFirst = computed(() => props.position === 1)

const isMobile = ref(false)
let mq: MediaQueryList | null = null
const onMqChange = (e: MediaQueryListEvent) => { isMobile.value = e.matches }
onMounted(() => {
  mq = window.matchMedia('(max-width: 37.5em)')
  isMobile.value = mq.matches
  mq.addEventListener('change', onMqChange)
})
onUnmounted(() => { mq?.removeEventListener('change', onMqChange) })

const avatarSize = computed(() => {
  if (isMobile.value) return props.position === 1 ? 72 : props.position === 2 ? 60 : 52
  return props.position === 1 ? 190 : props.position === 2 ? 160 : 140
})
</script>

<template>
    <div
      class="podium-item"
      :class="[`place-${position}`, { 'is-clickable': !!userId }]"
      :id="elementId"
      :role="userId ? 'button' : undefined"
      :tabindex="userId ? 0 : undefined"
      :aria-label="userId ? `Ver perfil de ${displayName}` : undefined"
      @click="userId && emit('click-user', userId)"
      @keydown.enter="userId && emit('click-user', userId)"
    >
        <div class="podium-header">
            <div class="avatar-wrap">
                <UiAvatar :src="avatarUrl || undefined" :alt="displayName.charAt(0).toUpperCase()"
                    :size="avatarSize"
                    :border="avatarBorder"
                    :avatar-color="avatarColor"
                    :effect="avatarEffect"
                    :shadow="avatarShadow" />
                <div class="place-badge">#{{ position }}</div>
                <div class="level-pill">Nível {{ level }}</div>
                <div v-if="userId" class="avatar-eye-overlay" aria-hidden="true">
                  <EyeIcon class="avatar-eye-icon" />
                </div>
            </div>
            <p class="name">{{ displayName }}</p>
            <div class="points-pill">
                <span class="points-text">{{ points }} pts</span>
            </div>
        </div>

        <div class="podium-block">
            <div class="block-top-wrapper">
                <div class="block-top"></div>
            </div>
            <div class="block-front">
                <span class="position-number">{{ position }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.podium-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    position: relative;
}

.podium-item.is-clickable {
    cursor: pointer;
}

.podium-item.is-clickable:focus-visible {
    outline: 3px solid var(--color-deep-500);
    outline-offset: 4px;
    border-radius: 8px;
}

.avatar-eye-overlay {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(2, 29, 32, 0.45);
    display: grid;
    place-items: center;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10;
}

.avatar-eye-icon {
    width: 32px;
    height: 32px;
    color: #fff;
    stroke-width: 2;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
}

.is-clickable:hover .avatar-eye-overlay {
    opacity: 1;
}

.podium-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
    margin-bottom: 24px;
    z-index: 4;
}

.avatar-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
}

.place-badge {
    position: absolute;
    top: -10px;
    left: -10px;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 14px;
    border: 2px solid var(--color-mirage-800);
    color: var(--color-mirage-900);
    background: var(--color-wild-200);
    transform: rotate(-6deg);
    box-shadow: 2px 2px 0 var(--color-shadow);
}

.level-pill {
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 12px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    font-size: 12px;
    font-weight: 800;
    color: var(--color-mirage-800);
    box-shadow: 2px 2px 0 var(--color-shadow);
    z-index: 20;
    white-space: nowrap;
}

.name {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-mirage-800);
    margin: 0;
    max-width: 140px;
}

.points-pill {
    background-color: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    box-shadow: 4px 4px 0 var(--color-shadow);
    border-radius: 999px;
    padding: 10px 24px;
}

.points-text {
    color: var(--color-mirage-800);
    font-weight: 800;
    font-size: 17px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.podium-block {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.block-top-wrapper {
    height: 45px;
    width: 100%;
    position: relative;
    z-index: 1;
}

.place-1 .block-top-wrapper {
    perspective: 100px;
    perspective-origin: 50% 100%;
}

.place-2 .block-top-wrapper {
    perspective: 100px;
    perspective-origin: 100% 100%;
}

.place-3 .block-top-wrapper {
    perspective: 100px;
    perspective-origin: 0% 100%;
}

.block-top {
    width: 100%;
    height: 100%;
    transform: rotateX(40deg);
    transform-origin: bottom center;
    border: 2px solid var(--color-mirage-800);
    border-bottom: none;
}

.place-1 .block-top {
    background: var(--color-deep-400);
}


.place-1 .place-badge,
.place-2 .place-badge,
.place-3 .place-badge {
    background: var(--color-wild-100);
}

.block-front {
    display: flex;
    justify-content: center;
    color: var(--color-wild-100);
    font-size: 64px;
    font-weight: 800;
    width: 100%;
    position: relative;
    z-index: 0;
    border-radius: 0;
}

.place-1 .block-front {
    background: linear-gradient(180deg, var(--color-deep-500), var(--color-deep-700));
    height: 280px;
    border: 2px solid var(--color-mirage-800);
    border-bottom: none;
    padding-top: 40px;
}

.place-2 .block-front {
    background-color: var(--color-teal-300);
    height: 220px;
    border: 2px solid var(--color-mirage-800);
    border-bottom: none;
    border-right: none;
    padding-top: 32px;
}

.place-2 .block-top {
    background: var(--color-teal-200);
    border-right: none;
}

.place-3 .block-front {
    background-color: var(--color-teal-300);
    height: 170px;
    border: 2px solid var(--color-mirage-800);
    border-bottom: none;
    border-left: none;
    padding-top: 24px;
}

.place-3 .block-top {
    background: var(--color-teal-200);
    border-left: none;
}

@media (max-width: 37.5em) {
    .podium-item {
        gap: 0;
    }

    .podium-header {
        gap: 0.375rem;
        margin-bottom: 0.875rem;
    }

    .avatar-wrap {
        transform: scale(0.92);
        transform-origin: bottom center;
    }

    .name {
        font-size: 0.8rem;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .points-pill {
        padding: 0.35rem 0.7rem;
        max-width: 100%;
    }

    .points-text {
        font-size: 0.7rem;
    }

    .level-pill {
        font-size: 0.6rem;
        padding: 2px 0.45rem;
        bottom: -10px;
    }

    .place-badge {
        width: 1.6rem;
        height: 1.6rem;
        font-size: 0.7rem;
        border-radius: 0.45rem;
        top: -8px;
        left: -8px;
    }

    .place-1 .block-front { height: 9rem; padding-top: 1.1rem; font-size: 2.25rem; }
    .place-2 .block-front { height: 7rem; padding-top: 0.9rem; font-size: 1.9rem; }
    .place-3 .block-front { height: 5.25rem; padding-top: 0.7rem; font-size: 1.6rem; }
    .block-top-wrapper { height: 1.6rem; }
}
</style>