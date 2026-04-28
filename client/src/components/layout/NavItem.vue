<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import {
  ArrowRightOnRectangleIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  HomeIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/vue/24/outline'

type Props = {
  label: string
  to?: string
  icon?: string
  isAction?: boolean
  exact?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ click: [] }>()
const route = useRoute()

const isActive = computed(() => {
  if (!props.to) return false
  return props.exact ? route.path === props.to : route.path.startsWith(props.to)
})

const iconComponent = computed(() => {
  switch (props.icon) {
    case 'home':
      return HomeIcon
    case 'rank':
      return TrophyIcon
    case 'books':
      return BookOpenIcon
    case 'help':
      return QuestionMarkCircleIcon
    case 'settings':
      return Cog6ToothIcon
    case 'logout':
      return ArrowRightOnRectangleIcon
    case 'create':
      return PencilSquareIcon
    case 'generate':
      return SparklesIcon
    case 'stats':
      return ChartBarIcon
    case 'ui':
      return Squares2X2Icon
    default:
      return null
  }
})

const handleClick = (navigate?: () => void) => {
  if (navigate) navigate()
  emit('click')
}
</script>

<template>
  <RouterLink v-if="to" custom :to="to" v-slot="{ navigate }">
    <UiButton size="lg" :variant="isActive ? 'primary' : 'ghost'" class="nav-item" :class="{ 'is-active': isActive }"
      @click="handleClick(navigate)">
      <template #icon-left>
        <span class="icon" aria-hidden="true">
          <component v-if="iconComponent" :is="iconComponent" class="icon-svg" aria-hidden="true" />
        </span>
      </template>
      {{ label }}
    </UiButton>
  </RouterLink>
  <UiButton v-else size="lg" :variant="isAction ? 'outline' : 'ghost'" class="nav-item" @click="handleClick()">
    <template #icon-left>
      <span class="icon" aria-hidden="true">
        <component v-if="iconComponent" :is="iconComponent" class="icon-svg" aria-hidden="true" />
      </span>
    </template>
    {{ label }}
  </UiButton>
</template>

<style scoped>
.nav-item {
  justify-content: flex-start;
  width: 100%;
}

.nav-item.is-active :deep(.ui-button-surface) {
  background: var(--color-deep-500);
}

.nav-item.is-active :deep(.ui-button-label) {
  color: #fff;
}

.nav-item :deep(.ui-button-content) {
  min-width: 0;
  width: 100%;
  justify-content: flex-start;
  gap: 16px;
}

.nav-item :deep(.ui-button-label) {
  width: 100%;
  text-align: left;
  font-size: 16px;
  justify-content: flex-start;
}

.nav-item :deep(.ui-button-surface) {
  background: var(--color-wild-100);
}

.nav-item:hover :deep(.ui-button-surface) {
  background: var(--color-wild-200);
}

.nav-item.is-active:hover :deep(.ui-button-surface) {
  background: var(--color-deep-500);
}

.icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  stroke-width: var(--icon-stroke);
  color: var(--color-mirage-800);
}

.icon-svg {
  width: 100%;
  height: 100%;
  stroke-width: var(--icon-stroke);
}

.nav-item.is-active .icon {
  color: #fff;
}
</style>
