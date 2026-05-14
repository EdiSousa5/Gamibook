<script setup lang="ts">
import { ref, watch } from 'vue'

type Frame = 'essence' | 'bloom' | 'ember' | 'aurora' | 'nebula' | 'ethereal' | 'void'

type Props = {
  src?: string
  alt?: string
  size?: number
  status?: 'online' | 'away' | 'busy' | 'offline'
  tone?: 'primary' | 'accent' | 'neutral'
  ring?: boolean
  frame?: Frame
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: 'avatar',
  size: 48,
  status: undefined,
  tone: 'primary',
  ring: false,
  frame: 'essence',
})

const imgError = ref(false)
watch(() => props.src, () => { imgError.value = false })
</script>

<template>
  <div class="ui-avatar" :class="[`tone-${tone}`, `frame-${frame}`, { ring }]"
    :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="src && !imgError" :src="src" :alt="alt" @error="imgError = true" />
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
  flex-shrink: 0;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.ui-avatar img {
  position: absolute;
  inset: 0;
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

.status.online  { background: var(--color-deep-500); }
.status.away    { background: var(--color-amber-500); }
.status.busy    { background: #d74c4c; }
.status.offline { background: var(--color-mirage-400); }

.tone-accent  { background: var(--color-amber-500); }
.tone-neutral { background: var(--color-mirage-500); }

/* ── Frame Styles ────────────────────────────────────── */

.frame-essence {
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.frame-bloom {
  border: 3px solid #ec4899;
  box-shadow:
    inset 0 0 0 1px rgba(236, 72, 153, 0.4),
    4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.frame-bloom::before {
  content: '';
  position: absolute;
  inset: -2px;
  background:
    radial-gradient(circle at 25% 25%, rgba(236, 72, 153, 0.3) 0%, transparent 30%),
    radial-gradient(circle at 75% 75%, rgba(244, 114, 182, 0.3) 0%, transparent 30%),
    radial-gradient(circle at 75% 25%, rgba(190, 24, 93, 0.2) 0%, transparent 30%),
    radial-gradient(circle at 25% 75%, rgba(236, 72, 153, 0.2) 0%, transparent 30%);
  border-radius: 50%;
  animation: bloom-pulse 4s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes bloom-pulse {
  0%, 100% { transform: scale(0.95); opacity: 0.5; }
  50%       { transform: scale(1.05); opacity: 0.8; }
}

.frame-ember {
  border: 3px solid #f97316;
  box-shadow:
    inset 0 0 12px rgba(249, 115, 22, 0.4),
    0 0 20px rgba(249, 115, 22, 0.6),
    4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.frame-ember::before {
  content: '';
  position: absolute;
  inset: -1px;
  background:
    linear-gradient(to top, rgba(239, 68, 68, 0.6) 0%, transparent 40%),
    linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, transparent 50%);
  border-radius: 50%;
  animation: ember-flicker 2.5s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes ember-flicker {
  0%, 100% { opacity: 0.7; }
  25%       { opacity: 0.4; }
  50%       { opacity: 0.8; }
  75%       { opacity: 0.5; }
}

.frame-aurora {
  border: 3px solid #06b6d4;
  box-shadow:
    inset 0 0 0 1px rgba(6, 182, 212, 0.5),
    0 0 25px rgba(6, 182, 212, 0.7),
    0 0 40px rgba(139, 92, 246, 0.4),
    4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.frame-aurora::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(6, 182, 212, 0.5) 60deg,
    rgba(139, 92, 246, 0.4) 120deg,
    rgba(168, 85, 247, 0.3) 180deg,
    rgba(59, 130, 246, 0.4) 240deg,
    rgba(6, 182, 212, 0.5) 360deg
  );
  border-radius: 50%;
  animation: aurora-spin 8s linear infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes aurora-spin {
  to { transform: rotate(360deg); }
}

.frame-nebula {
  border: 3px solid #a855f7;
  box-shadow:
    inset 0 0 0 1px rgba(168, 85, 247, 0.4),
    0 0 30px rgba(168, 85, 247, 0.8),
    4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.frame-nebula::before {
  content: '';
  position: absolute;
  inset: -3px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(168, 85, 247, 0.6) 80deg,
    rgba(126, 34, 206, 0.5) 160deg,
    rgba(79, 70, 229, 0.4) 240deg,
    rgba(168, 85, 247, 0.6) 360deg
  );
  border-radius: 50%;
  animation: nebula-spin 12s linear infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes nebula-spin {
  to { transform: rotate(360deg); }
}

.frame-ethereal {
  border: 3px solid #60a5fa;
  box-shadow:
    inset 0 0 0 1px rgba(96, 165, 250, 0.4),
    0 0 30px rgba(96, 165, 250, 0.9),
    0 0 50px rgba(168, 85, 247, 0.5),
    4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.frame-ethereal::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(96, 165, 250, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.3) 0%, transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.2) 0%, transparent 60%);
  animation: ethereal-glow 4s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes ethereal-glow {
  0%, 100% { transform: scale(1) rotateZ(0deg); opacity: 0.7; }
  50%       { transform: scale(1.1) rotateZ(180deg); opacity: 0.4; }
}

.frame-void {
  border: 3px solid #1e1b4b;
  box-shadow:
    inset 0 0 0 1px rgba(30, 27, 75, 0.8),
    0 0 40px rgba(139, 92, 246, 0.9),
    0 0 80px rgba(168, 85, 247, 0.6),
    4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.frame-void::before {
  content: '';
  position: absolute;
  inset: -5px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(139, 92, 246, 0.8) 45deg,
    rgba(168, 85, 247, 0.6) 90deg,
    rgba(79, 70, 229, 0.8) 180deg,
    rgba(139, 92, 246, 0.6) 270deg,
    transparent 360deg
  );
  border-radius: 50%;
  animation: void-spin 15s linear infinite reverse;
  pointer-events: none;
  z-index: 1;
}

@keyframes void-spin {
  to { transform: rotate(360deg); }
}
</style>
