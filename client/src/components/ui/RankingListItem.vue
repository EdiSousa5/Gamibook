<script setup lang="ts">
import UiAvatar from '@/components/ui/UiAvatar.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'

defineProps<{
    position: number
    points: number
    level: number
    badgeCounts: Record<BookBadgeTier, number>
    avatarUrl?: string | null
    displayName: string
    isCurrentUser?: boolean
}>()

const BADGE_TIERS: BookBadgeTier[] = ['bronze', 'silver', 'gold', 'diamond', 'galaxy']
</script>

<template>
    <li class="ranking-list-item" :class="{ 'is-me': isCurrentUser }">
        <div class="item-left">
            <div class="position-circle">{{ position }}</div>
            <div class="user-info">
                <UiAvatar :src="avatarUrl || undefined" :alt="displayName.charAt(0).toUpperCase()" :size="48" />
                <div class="user-text">
                    <span class="name">{{ displayName }}</span>
                    <div class="meta-row">
                        <span class="level">Nível {{ level }}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="item-right">
            <span class="points">{{ points }} pontos</span>
        </div>
    </li>
</template>

<style scoped>
.ranking-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-radius: 16px;
    border: 2px solid transparent;
    background-color: var(--color-wild-50);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.ranking-list-item:hover {
    background-color: var(--color-wild-100);
    transform: translateY(-2px) scale(1.01);
    border-color: var(--color-mirage-200);
    box-shadow: 4px 4px 0 var(--color-shadow);
}

.ranking-list-item.is-me {
    background-color: var(--color-deep-100);
    border: 2px solid var(--color-deep-500);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.25);
}

/* Animação disparada pelo click em "Encontrar-me" */
:global(.highlight-pulse) {
    animation: pulse-highlight 2.5s ease-out !important;
    border-color: var(--color-amber-500) !important;
    box-shadow: 0 0 15px rgba(245, 158, 11, 0.6) !important;
    background-color: var(--color-amber-100) !important;
}

.item-left {
    display: flex;
    align-items: center;
    gap: 22px;
}

.position-circle {
    width: 40px;
    height: 40px;
    background-color: var(--color-wild-200);
    border: 2px solid var(--color-mirage-800);
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 800;
    font-size: 16px;
    color: var(--color-mirage-800);
    transform: rotate(-3deg);
    box-shadow: 2px 2px 0 var(--color-shadow);
}

.is-me .position-circle {
    background-color: var(--color-deep-500);
    color: white;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 16px;
}

.user-text {
    display: grid;
    gap: 6px;
}

.name {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-mirage-900);
}

.meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}

.level {
    font-size: 12px;
    font-weight: 800;
    color: var(--color-mirage-600);
    text-transform: uppercase;
    letter-spacing: 0.6px;
}

.badge-counts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.badge-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px 2px 2px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-200);
    background: var(--color-wild-100);
    box-shadow: 2px 2px 0 var(--color-shadow);
}

.badge-count {
    font-size: 11px;
    font-weight: 800;
    color: var(--color-mirage-700);
}

.item-right .points {
    font-size: 18px;
    font-weight: 800;
    color: var(--color-deep-600);
}

@keyframes pulse-highlight {

    0%,
    50% {
        transform: scale(1.02);
    }

    100% {
        transform: scale(1);
    }
}
</style>