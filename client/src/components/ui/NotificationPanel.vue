<script setup lang="ts">
import { useNotificationsStore } from '@/stores/notifications'
import {
  TrophyIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  BellIcon,
  BookOpenIcon,
  CheckCircleIcon,
  RectangleStackIcon,
} from '@heroicons/vue/24/outline'
import type { NotificationType } from '@/types/notification'
import type { Component } from 'vue'

defineProps<{ visible: boolean }>()

const notifStore = useNotificationsStore()

const iconMap: Record<NotificationType, Component> = {
  achievement: TrophyIcon,
  quiz_ready: SparklesIcon,
  quiz_result: CheckCircleIcon,
  streak_warning: ExclamationTriangleIcon,
  system: BellIcon,
  book_unlocked: BookOpenIcon,
  new_content: RectangleStackIcon,
}

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'agora mesmo'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

const handleClick = async (id: string, isRead: boolean) => {
  if (!isRead) await notifStore.markRead(id)
}

const markAllRead = () => {
  notifStore.markAllRead()
}
</script>

<template>
  <Transition name="panel-pop">
    <div v-if="visible" class="notif-panel" role="dialog" aria-label="Notificações">
      <header class="notif-panel__header">
        <h3 class="notif-panel__title">Notificações</h3>
        <button
          v-if="notifStore.unreadCount > 0"
          class="notif-mark-all"
          type="button"
          @click="markAllRead"
        >
          Marcar todas como lidas
        </button>
      </header>

      <div v-if="notifStore.notifications.length" class="notif-list">
        <button
          v-for="notif in notifStore.notifications"
          :key="notif.notifications_id"
          type="button"
          class="notif-item"
          :class="[`notif-item--${notif.type}`, { 'notif-item--unread': !notif.is_read }]"
          @click="handleClick(notif.notifications_id, notif.is_read)"
        >
          <span v-if="!notif.is_read" class="notif-dot" aria-hidden="true" />
          <span v-else class="notif-dot-spacer" aria-hidden="true" />

          <span class="notif-icon-wrap" :class="`notif-icon-wrap--${notif.type}`">
            <component :is="iconMap[notif.type]" class="notif-icon" aria-hidden="true" />
          </span>

          <span class="notif-body">
            <span class="notif-title">{{ notif.title }}</span>
            <span class="notif-message">{{ notif.message }}</span>
          </span>

          <span class="notif-time">{{ timeAgo(notif.date_created) }}</span>
        </button>
      </div>

      <div v-else class="notif-empty">
        <BellIcon class="notif-empty__icon" aria-hidden="true" />
        <span>Sem notificações</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notif-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 16px;
  box-shadow: 6px 6px 0 var(--color-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
}

/* ── Header ── */
.notif-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 2px solid var(--color-mirage-800);
  flex-shrink: 0;
}

.notif-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.notif-mark-all {
  background: none;
  border: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-deep-600);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.notif-mark-all:hover {
  color: var(--color-deep-800);
}

/* ── List ── */
.notif-list {
  overflow-y: auto;
  flex: 1;
}

/* ── Item ── */
.notif-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  border-bottom: 1px solid var(--color-mirage-200, #e2e8f0);
  background: var(--color-wild-100);
  text-align: left;
  cursor: default;
  transition: background 0.12s ease;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item--unread {
  background: var(--color-wild-200);
}

/* Unread dot */
.notif-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-deep-500);
  margin-top: 5px;
}

.notif-dot-spacer {
  flex-shrink: 0;
  width: 8px;
}

/* ── Icon wrap ── */
.notif-icon-wrap {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  display: grid;
  place-items: center;
}

.notif-icon-wrap--achievement   { background: var(--color-amber-100, #fef3c7); }
.notif-icon-wrap--quiz_ready    { background: #f3e8ff; }
.notif-icon-wrap--quiz_result   { background: var(--color-deep-100); }
.notif-icon-wrap--streak_warning{ background: var(--color-pumpkin-100, #fff0e0); }
.notif-icon-wrap--system        { background: var(--color-wild-200); }
.notif-icon-wrap--book_unlocked { background: var(--color-deep-100); }
.notif-icon-wrap--new_content   { background: var(--color-wild-200); }

.notif-icon {
  width: 16px;
  height: 16px;
  stroke-width: 1.8;
}

.notif-icon-wrap--achievement    .notif-icon { color: var(--color-amber-700, #b45309); }
.notif-icon-wrap--quiz_ready     .notif-icon { color: #7c3aed; }
.notif-icon-wrap--quiz_result    .notif-icon { color: var(--color-deep-600); }
.notif-icon-wrap--streak_warning .notif-icon { color: var(--color-pumpkin-500, #f97316); }
.notif-icon-wrap--system         .notif-icon { color: var(--color-mirage-500); }
.notif-icon-wrap--book_unlocked  .notif-icon { color: var(--color-deep-600); }
.notif-icon-wrap--new_content    .notif-icon { color: var(--color-mirage-500); }

/* ── Body ── */
.notif-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.notif-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-800);
  line-height: 1.3;
}

.notif-message {
  font-size: 11px;
  color: var(--color-mirage-500);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Time ── */
.notif-time {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-400);
  margin-top: 2px;
  white-space: nowrap;
}

/* ── Empty ── */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 24px;
  color: var(--color-mirage-400);
  font-size: 13px;
  font-weight: 600;
}

.notif-empty__icon {
  width: 32px;
  height: 32px;
  stroke-width: 1.5;
  color: var(--color-mirage-300);
}

/* ── Transition ── */
.panel-pop-enter-active {
  animation: panel-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.panel-pop-leave-active {
  animation: panel-in 0.15s ease reverse both;
}
@keyframes panel-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
