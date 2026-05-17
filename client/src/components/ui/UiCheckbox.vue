<script setup lang="ts">
type Props = {
  modelValue?: boolean
  label?: string
  disabled?: boolean
  tone?: 'primary' | 'accent' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: '',
  disabled: false,
  tone: 'primary',
})

defineEmits<{ update: [boolean] }>()
</script>

<template>
  <label class="ui-check" :class="[`tone-${tone}`, { 'is-checked': modelValue, 'is-disabled': disabled }]">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update', ($event.target as HTMLInputElement).checked)"
    />
    <span class="box" aria-hidden="true">
      <svg v-if="modelValue" class="check-mark" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 4L3.8 7L9 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <span v-if="label" class="text">{{ label }}</span>
  </label>
</template>

<style scoped>
.ui-check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-200);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-mirage-800);
  user-select: none;
  --check-bg: var(--color-deep-600);
  --check-icon: #fff;
}

.tone-accent { --check-bg: var(--color-amber-600); }
.tone-neutral { --check-bg: var(--color-mirage-600); }

.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.box {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease;
  position: relative;
}

.ui-check:not(.is-disabled):hover .box {
  background: var(--color-wild-300);
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.ui-check.is-checked .box {
  background: var(--check-bg);
  border-color: var(--color-mirage-900);
  box-shadow: 1px 1px 0 var(--color-mirage-900);
  transform: translate(2px, 2px);
}

.ui-check.is-checked:not(.is-disabled):hover .box {
  background: var(--check-bg);
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--color-mirage-900);
}

.check-mark {
  width: 8px;
  height: 6px;
  color: var(--check-icon);
}

input:focus-visible + .box {
  outline: 2px solid var(--color-deep-500);
  outline-offset: 3px;
}

.text {
  line-height: 1.3;
}
</style>
