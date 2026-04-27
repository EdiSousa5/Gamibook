<script setup lang="ts">
import { computed } from 'vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import type { User } from '@/types'

const props = defineProps<{
    user: User
    position: number
    avatarUrl?: string | null
    displayName: string
}>()

const isFirst = computed(() => props.position === 1)
</script>

<template>
    <div class="podium-item" :class="`place-${position}`">
        <div class="podium-header">
            <UiAvatar :src="avatarUrl || undefined" :alt="displayName.charAt(0).toUpperCase()"
                :size="isFirst ? 160 : (position === 2 ? 135 : 120)" />
            <p class="name">{{ displayName }}</p>
            <div class="points-pill">
                <span class="points-text">{{ user.points ?? 0 }} pts</span>
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

.podium-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
    margin-bottom: 24px;
    z-index: 4;
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
</style>