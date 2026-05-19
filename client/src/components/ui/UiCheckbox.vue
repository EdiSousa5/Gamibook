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
    <input type="checkbox" :checked="modelValue" :disabled="disabled"
      @change="$emit('update', ($event.target as HTMLInputElement).checked)" />
    <span class="box" aria-hidden="true">
      <svg v-if="modelValue" class="check-mark" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 5L4.5 8L10.5 2" pathLength="1" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </span>
    <span v-if="label" class="text">{{ label }}</span>
  </label>
</template>

<style scoped>
.ui-check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-mirage-800);
  user-select: none;
  --check-bg: var(--color-deep-600);
  --check-icon: #fff;
}

.tone-accent {
  --check-bg: var(--color-amber-600);
}

.tone-neutral {
  --check-bg: var(--color-mirage-600);
}

.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(1);
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
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

/* Unchecked hover */
.ui-check:not(.is-checked):not(.is-disabled):hover .box {
  background: var(--color-wild-300);
  transform: translateY(-1px);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

/* Checked state */
.ui-check.is-checked .box {
  background: var(--check-bg);
  border-color: var(--color-mirage-900);
  box-shadow: 1px 1px 0 var(--color-mirage-900);
}

/* Checked + hover — keep colour, just lift */
.ui-check.is-checked:not(.is-disabled):hover .box {
  background: var(--check-bg);
  border-color: var(--color-mirage-900);
  transform: translateY(-1px);
  box-shadow: 2px 3px 0 var(--color-mirage-900);
  filter: brightness(1.08);
}

.check-mark {
  width: 12px;
  height: 10px;
  color: var(--check-icon);
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw-check 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes draw-check {
  to {
    stroke-dashoffset: 0;
  }
}

input:focus-visible + .box {
  outline: 2px solid var(--color-deep-500);
  outline-offset: 3px;
}

.text {
  line-height: 1.4;
}
</style>
