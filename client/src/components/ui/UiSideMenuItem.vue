<script setup lang="ts">
import { RouterLink } from 'vue-router'

type Props = {
    to: string
    label: string
    description: string
    icon: any
    isActive?: boolean
}

defineProps<Props>()
</script>

<template>
    <RouterLink :to="to" class="ui-side-menu-item" :class="{ active: isActive }">
        <span class="item-shadow" aria-hidden="true"></span>
        <span class="item-panel" aria-hidden="true"></span>
        <span class="item-content">
            <span class="item-icon">
                <component :is="icon" class="icon" aria-hidden="true" />
            </span>
            <span class="item-text">
                <span class="item-title">{{ label }}</span>
                <span class="item-desc">{{ description }}</span>
            </span>
        </span>
    </RouterLink>
</template>

<style scoped>
.ui-side-menu-item {
    display: block;
    position: relative;
    width: 100%;
    text-decoration: none;
    color: inherit;
    outline: none;
    --item-offset-x: 3px;
    --item-offset-y: 4px;
}

.item-shadow {
    position: absolute;
    inset: var(--item-offset-y) 0 0 var(--item-offset-x);
    background: var(--color-shadow);
    border-radius: 16px;
    z-index: 0;
    transition: transform 0.15s ease, opacity 0.15s ease;
}

.item-panel {
    position: absolute;
    inset: 0;
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    border-radius: 16px;
    z-index: 1;
    transition: transform 0.15s ease, background 0.15s ease;
}

.item-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding: var(--space-300) var(--space-400);
    min-height: 84px;
    transform: translate(0, 0);
    transition: transform 0.15s ease;
}

.item-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-wild-200);
    border: 2px solid var(--color-mirage-800);
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.icon {
    width: 22px;
    height: 22px;
    stroke-width: 2.5;
}

.item-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.item-title {
    font-weight: 700;
    font-size: 16px;
    color: var(--color-mirage-900);
}

.item-desc {
    font-size: 13px;
    color: var(--color-mirage-600);
}

/* Interactions */
.ui-side-menu-item:hover .item-panel {
    transform: translate(-1px, -2px);
    background: var(--color-wild-200);
}

.ui-side-menu-item:hover .item-content {
    transform: translate(-1px, -2px);
}

.ui-side-menu-item.active .item-panel,
.ui-side-menu-item:active .item-panel {
    background: var(--color-deep-100);
    border-color: var(--color-deep-600);
    transform: translate(var(--item-offset-x), var(--item-offset-y));
}

.ui-side-menu-item.active .item-content,
.ui-side-menu-item:active .item-content {
    transform: translate(var(--item-offset-x), var(--item-offset-y));
}

.ui-side-menu-item.active .item-shadow,
.ui-side-menu-item:active .item-shadow {
    opacity: 0;
}

.ui-side-menu-item.active .item-icon {
    background: var(--color-deep-500);
    color: #ffffff;
}
</style>