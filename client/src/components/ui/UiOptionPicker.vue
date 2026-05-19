<script setup lang="ts">
type Option = { label: string; value: string; hint?: string }

defineProps<{
  modelValue: string
  options: Option[]
}>()

defineEmits<{ update: [string] }>()
</script>

<template>
  <div class="option-picker" role="radiogroup">
    <button v-for="opt in options" :key="opt.value" type="button" class="opt-btn"
      :class="{ 'opt-btn--active': modelValue === opt.value }" role="radio" :aria-checked="modelValue === opt.value"
      @click="$emit('update', opt.value)">
      <div class="opt-indicator" aria-hidden="true">
        <div class="opt-indicator-inner" />
      </div>
      <span class="opt-body">
        <span class="opt-label">{{ opt.label }}</span>
        <span v-if="opt.hint" class="opt-hint">{{ opt.hint }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.option-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opt-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid var(--color-mirage-800);
  border-radius: 12px;
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.opt-btn:hover:not(.opt-btn--active) {
  background: var(--color-wild-200);
  transform: translateY(-1px);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.opt-btn--active {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.opt-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid var(--color-mirage-400);
  display: grid;
  place-items: center;
  background: var(--color-wild-100);
  transition: all 0.2s ease;
  margin-top: 1px;
}

.opt-indicator-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.2s ease;
}

.opt-btn--active .opt-indicator {
  border-color: var(--color-deep-600);
}

.opt-btn--active .opt-indicator-inner {
  background: var(--color-deep-600);
}

.opt-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.opt-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-mirage-600);
  line-height: 1.2;
}

.opt-btn--active .opt-label {
  font-weight: 800;
  color: var(--color-mirage-900);
}

.opt-hint {
  font-size: 11px;
  color: var(--color-mirage-400);
  line-height: 1.3;
}
</style>
