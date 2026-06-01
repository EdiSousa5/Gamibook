<script setup lang="ts">
withDefaults(defineProps<{
  maxHeight?: string
  axis?: 'y' | 'x' | 'both'
}>(), {
  axis: 'y',
})
</script>

<template>
  <div
    class="scroll-area"
    :class="`axis-${axis}`"
    :style="maxHeight ? { maxHeight } : {}"
  >
    <slot />
  </div>
</template>

<style scoped>
.scroll-area {
  min-height: 0;
}

.axis-y    { overflow-y: auto; overflow-x: hidden; }
.axis-x    { overflow-x: auto; overflow-y: hidden; }
.axis-both { overflow: auto; }

/* Webkit scrollbar */
.scroll-area::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.scroll-area::-webkit-scrollbar-track {
  background: var(--color-wild-200);
  border-radius: 999px;
  border: 2px solid var(--color-mirage-300, #c0cbd2);
}

.scroll-area::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--color-deep-600), var(--color-deep-400));
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
}

.scroll-area::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, var(--color-deep-700), var(--color-deep-500));
}

/* Horizontal scroll — gradient rotates 90deg */
.axis-x::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, var(--color-deep-600), var(--color-deep-400));
}
.axis-x::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
}

.scroll-area::-webkit-scrollbar-corner {
  background: transparent;
}

/* Firefox */
.scroll-area {
  scrollbar-width: thin;
  scrollbar-color: var(--color-deep-500) var(--color-wild-200);
}
</style>
