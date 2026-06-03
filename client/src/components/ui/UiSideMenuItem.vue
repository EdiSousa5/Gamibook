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
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
    z-index: 1;
    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.item-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding: var(--space-300) var(--space-400);
    min-height: 5.25rem;
    transform: translate(0, 0);
    transition: transform 0.15s ease;
}

.item-icon {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    background: var(--color-wild-200);
    border: 2px solid var(--color-mirage-800);
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.icon {
    width: 1.375rem;
    height: 1.375rem;
    stroke-width: 2.5;
}

.item-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.item-title {
    font-weight: 700;
    font-size: 0.9375rem;
    color: var(--color-mirage-900);
}

.item-desc {
    font-size: 0.8125rem;
    color: var(--color-mirage-600);
}

@media (max-width: 45em) {
    .ui-side-menu-item {
        width: auto;
        flex-shrink: 0;
    }

    .item-content {
        min-height: unset;
        padding: var(--space-150) var(--space-300);
        gap: var(--space-200);
        flex-direction: row;
        align-items: center;
        white-space: nowrap;
    }

    .item-icon {
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        flex-shrink: 0;
    }

    .icon {
        width: 1rem;
        height: 1rem;
    }

    .item-text {
        gap: 0;
    }

    .item-title {
        font-size: 0.8125rem;
        white-space: nowrap;
    }

    .item-desc {
        display: none;
    }
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
    box-shadow: none;
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