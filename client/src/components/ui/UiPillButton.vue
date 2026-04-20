<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'neutral' | 'primary'

type Props = {
    variant?: Variant
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'neutral',
    type: 'button',
    disabled: false,
})

const classes = computed(() => ['ui-pill-button', props.variant])
</script>

<template>
    <button :type="props.type" :class="classes" :disabled="disabled">
        <slot />
    </button>
</template>

<style scoped>
.ui-pill-button {
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    border-radius: 999px;
    padding: 6px 14px;
    cursor: pointer;
    font-weight: 700;
    box-shadow: 3px 3px 0 var(--color-shadow);
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
}

.ui-pill-button.primary {
    background: var(--color-deep-500);
    color: #fff;
}

.ui-pill-button:hover {
    transform: translateY(-1px);
}

.ui-pill-button:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 var(--color-shadow);
}

.ui-pill-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>
