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
</script>

<template>
  <Transition name="panel-pop">
    <div v-if="visible" class="notif-panel" role="dialog" aria-label="Notificações">
      <header class="notif-panel__header">
        <div class="notif-panel__title-row">
          <h3 class="notif-panel__title">Notificações</h3>
          <span v-if="notifStore.unreadCount > 0" class="notif-count-chip">
            {{ notifStore.unreadCount }} por ler
          </span>
        </div>
        <button
          v-if="notifStore.unreadCount > 0"
          class="notif-mark-all"
          type="button"
          @click="notifStore.markAllRead()"
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
          :class="{ 'is-unread': !notif.is_read }"
          @click="handleClick(notif.notifications_id, notif.is_read)"
        >
          <span class="notif-icon-wrap" :class="`notif-icon-wrap--${notif.type}`">
            <component :is="iconMap[notif.type]" class="notif-icon" aria-hidden="true" />
          </span>

          <span class="notif-body">
            <span class="notif-header-row">
              <span class="notif-title">{{ notif.title }}</span>
              <span class="notif-time">{{ timeAgo(notif.date_created) }}</span>
            </span>
            <span class="notif-message">{{ notif.message }}</span>
          </span>

          <span v-if="!notif.is_read" class="notif-unread-dot" aria-hidden="true" />
        </button>
      </div>

      <div v-else class="notif-empty">
        <div class="notif-empty__icon-wrap">
          <BellIcon class="notif-empty__icon" aria-hidden="true" />
        </div>
        <span class="notif-empty__text">Sem notificações</span>
        <span class="notif-empty__sub">As tuas notificações aparecerão aqui</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Panel container ── */
.notif-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-height: 500px;
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
  gap: var(--space-300);
  padding: 14px 16px 12px;
  border-bottom: 2px solid var(--color-mirage-800);
  flex-shrink: 0;
  background: var(--color-wild-100);
}

.notif-panel__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.notif-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
  font-family: var(--font-display);
}

.notif-count-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-deep-600);
  border: 1.5px solid var(--color-mirage-800);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
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
  white-space: nowrap;
  flex-shrink: 0;
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
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: var(--space-300);
  padding: 12px 14px;
  border: none;
  border-bottom: 1.5px solid var(--color-wild-500);
  background: var(--color-wild-100);
  text-align: left;
  cursor: default;
  transition: background 0.12s ease;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item.is-unread {
  background: var(--color-deep-100);
  border-left: 3px solid var(--color-deep-600);
  padding-left: 11px;
}

.notif-item.is-unread:hover {
  background: var(--color-deep-200);
}

.notif-item:not(.is-unread):hover {
  background: var(--color-wild-300);
}

/* Unread dot (top-right corner) */
.notif-unread-dot {
  position: absolute;
  top: 14px;
  right: 12px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-deep-600);
  border: 1.5px solid var(--color-wild-100);
  flex-shrink: 0;
}

/* ── Icon wrap ── */
.notif-icon-wrap {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  margin-top: 1px;
}

.notif-icon-wrap--achievement   { background: var(--color-amber-100); }
.notif-icon-wrap--quiz_ready    { background: #f3e8ff; }
.notif-icon-wrap--quiz_result   { background: var(--color-deep-100); }
.notif-icon-wrap--streak_warning{ background: var(--color-pumpkin-100); }
.notif-icon-wrap--system        { background: var(--color-wild-400); }
.notif-icon-wrap--book_unlocked { background: var(--color-deep-100); }
.notif-icon-wrap--new_content   { background: var(--color-mirage-100); }

.notif-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

.notif-icon-wrap--achievement    .notif-icon { color: var(--color-amber-700); }
.notif-icon-wrap--quiz_ready     .notif-icon { color: #7c3aed; }
.notif-icon-wrap--quiz_result    .notif-icon { color: var(--color-deep-600); }
.notif-icon-wrap--streak_warning .notif-icon { color: var(--color-pumpkin-700); }
.notif-icon-wrap--system         .notif-icon { color: var(--color-mirage-500); }
.notif-icon-wrap--book_unlocked  .notif-icon { color: var(--color-deep-600); }
.notif-icon-wrap--new_content    .notif-icon { color: var(--color-mirage-500); }

/* ── Body ── */
.notif-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding-right: 14px;
}

.notif-header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-200);
}

.notif-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1.3;
  font-family: var(--font-display);
}

.notif-time {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-400);
  white-space: nowrap;
}

.notif-message {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-mirage-500);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Empty state ── */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-200);
  padding: 40px 24px 48px;
  color: var(--color-mirage-500);
}

.notif-empty__icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  background: var(--color-wild-300);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-100);
}

.notif-empty__icon {
  width: 24px;
  height: 24px;
  stroke-width: 1.5;
  color: var(--color-mirage-400);
}

.notif-empty__text {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-700);
  font-family: var(--font-display);
}

.notif-empty__sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-mirage-400);
  text-align: center;
  line-height: 1.5;
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
