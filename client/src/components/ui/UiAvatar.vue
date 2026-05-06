<script setup lang="ts">
type Frame = 'classic' | 'gold' | 'silver' | 'crystal' | 'neon' | 'cosmic' | 'forest'

type Props = {
  src?: string
  alt?: string
  size?: number
  status?: 'online' | 'away' | 'busy' | 'offline'
  tone?: 'primary' | 'accent' | 'neutral'
  ring?: boolean
  frame?: Frame
}

withDefaults(defineProps<Props>(), {
  src: '',
  alt: 'avatar',
  size: 48,
  status: undefined,
  tone: 'primary',
  ring: false,
  frame: 'classic',
})
</script>

<template>
  <div class="ui-avatar" :class="[`tone-${tone}`, `frame-${frame}`, { ring }]"
    :style="{ width: `${size}px`, height: `${size}px` }">
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

/* Avatar Frames */
.frame-classic {
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.frame-gold {
  border: 3px solid #d4af37;
  box-shadow:
    inset 0 0 0 1px rgba(212, 175, 55, 0.5),
    4px 4px 0 var(--color-shadow);
}

.frame-silver {
  border: 3px solid #c0c0c0;
  box-shadow:
    inset 0 0 0 1px rgba(192, 192, 192, 0.5),
    4px 4px 0 var(--color-shadow);
}

.frame-crystal {
  border: 3px solid #b0e0e6;
  box-shadow:
    inset 0 0 8px rgba(176, 224, 230, 0.6),
    0 0 12px rgba(176, 224, 230, 0.4),
    4px 4px 0 var(--color-shadow);
}

.frame-neon {
  border: 2px solid #00ff88;
  box-shadow:
    inset 0 0 0 1px rgba(0, 255, 136, 0.3),
    0 0 10px rgba(0, 255, 136, 0.8),
    4px 4px 0 var(--color-shadow);
}

.frame-cosmic {
  border: 3px solid #9d4edd;
  box-shadow:
    inset 0 0 0 1px rgba(157, 78, 221, 0.4),
    0 0 15px rgba(157, 78, 221, 0.6),
    4px 4px 0 var(--color-shadow);
}

.frame-forest {
  border: 3px solid #228b22;
  box-shadow:
    inset 0 0 0 1px rgba(34, 139, 34, 0.5),
    0 0 10px rgba(34, 139, 34, 0.4),
    4px 4px 0 var(--color-shadow);
}
</style>
