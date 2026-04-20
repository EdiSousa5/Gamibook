<script setup lang="ts">
type Props = {
  src?: string
  alt?: string
  size?: number
  status?: 'online' | 'away' | 'busy' | 'offline'
  tone?: 'primary' | 'accent' | 'neutral'
  ring?: boolean
}

withDefaults(defineProps<Props>(), {
  src: '',
  alt: 'avatar',
  size: 48,
  status: undefined,
  tone: 'primary',
  ring: false,
})
</script>

<template>
  <div class="ui-avatar" :class="[`tone-${tone}`, { ring }]" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="src" :src="src" :alt="alt" />
    <span v-else>{{ alt.charAt(0).toUpperCase() }}</span>
    <span v-if="status" class="status" :class="status"></span>
  </div>
</template>

<style scoped>
.ui-avatar {
  border-radius: var(--radius-full);
  background: var(--color-deep-500);
  color: #fff;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 700;
  position: relative;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.ui-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.status {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-wild-100);
  background: var(--color-mirage-500);
}

.status.online {
  background: var(--color-deep-500);
}

.status.away {
  background: var(--color-amber-500);
}

.status.busy {
  background: #d74c4c;
}

.status.offline {
  background: var(--color-mirage-400);
}

.tone-accent {
  background: var(--color-amber-500);
}

.tone-neutral {
  background: var(--color-mirage-500);
}
</style>
