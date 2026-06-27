<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import {
  TrophyIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  BellIcon,
  BookOpenIcon,
  CheckCircleIcon,
  RectangleStackIcon,
  EyeIcon,
  TrashIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  CheckBadgeIcon,
  Square3Stack3DIcon,
} from '@heroicons/vue/24/outline'
import type { NotificationType } from '@/types/notification'
import type { Component } from 'vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { useToast } from '@/composables/useToast'

defineProps<{ visible: boolean }>()

const notifStore = useNotificationsStore()
const toast = useToast()

const selectedIds = ref<Set<string>>(new Set())
const expandedIds = ref<Set<string>>(new Set())
const hasSelection = computed(() => selectedIds.value.size > 0)

const toggleExpand = (id: string) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const MESSAGE_PREVIEW_CHARS = 100
const allSelected = computed(
  () =>
    notifStore.notifications.length > 0 &&
    selectedIds.value.size === notifStore.notifications.length,
)

const toggleSelect = (id: string, checked: boolean) => {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

const toggleSelectAll = (checked: boolean) => {
  selectedIds.value = checked
    ? new Set(notifStore.notifications.map((n) => n.notifications_id))
    : new Set()
}

const markSelectedRead = () => {
  notifStore.markSelectedRead(Array.from(selectedIds.value))
  selectedIds.value = new Set()
}

const deleteSelected = () => {
  const count = selectedIds.value.size
  notifStore.deleteSelected(Array.from(selectedIds.value))
  selectedIds.value = new Set()
  toast.success(count === 1 ? 'Notificação eliminada.' : `${count} notificações eliminadas.`)
}

const iconMap: Record<NotificationType, Component> = {
  achievement: TrophyIcon,
  quiz_ready: SparklesIcon,
  quiz_result: CheckCircleIcon,
  streak_warning: ExclamationTriangleIcon,
  system: BellIcon,
  book_unlocked: BookOpenIcon,
  new_content: RectangleStackIcon,
  exercise_created: PlusCircleIcon,
  exercise_deleted: TrashIcon,
  exercise_edited: PencilSquareIcon,
  book_approved: CheckBadgeIcon,
  module_created: Square3Stack3DIcon,
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

const handleItemClick = async (id: string, isRead: boolean) => {
  if (!isRead) await notifStore.markRead(id)
}
</script>

<template>
  <Transition name="panel-pop">
    <div v-if="visible" class="notif-panel" role="dialog" aria-label="Notificações">

      <!-- Header — checkbox column aligns with list items -->
      <header class="notif-panel__header">
        <!-- Checkbox column: same width/padding as .notif-check in list -->
        <div class="notif-header__check" @click.stop>
          <UiCheckbox
            v-if="notifStore.notifications.length"
            :model-value="allSelected"
            @update="toggleSelectAll"
          />
        </div>

        <!-- Centre: title or selection count -->
        <div class="notif-header__centre">
          <template v-if="hasSelection">
            <span class="notif-header__sel-count">
              {{ selectedIds.size }} selecionada{{ selectedIds.size !== 1 ? 's' : '' }}
            </span>
          </template>
          <template v-else>
            <h3 class="notif-panel__title">Notificações</h3>
            <span v-if="notifStore.unreadCount > 0" class="notif-count-chip">
              {{ notifStore.unreadCount }}
            </span>
          </template>
        </div>

        <!-- Right: bulk actions or mark-all -->
        <div class="notif-header__actions">
          <template v-if="hasSelection">
            <UiButton size="xs" variant="outline" @click="markSelectedRead">
              <template #icon-left><EyeIcon class="btn-icon" aria-hidden="true" /></template>
              Lidas
            </UiButton>
            <UiButton size="xs" variant="danger" @click="deleteSelected">
              <template #icon-left><TrashIcon class="btn-icon" aria-hidden="true" /></template>
              Eliminar
            </UiButton>
          </template>
          <button
            v-else-if="notifStore.unreadCount > 0"
            class="notif-mark-all"
            type="button"
            @click="notifStore.markAllRead()"
          >
            Marcar todas como lidas
          </button>
        </div>
      </header>

      <!-- Notification list -->
      <div v-if="notifStore.notifications.length" class="notif-list">
        <div
          v-for="notif in notifStore.notifications"
          :key="notif.notifications_id"
          class="notif-item"
          :class="{
            'is-unread': !notif.is_read,
            'is-selected': selectedIds.has(notif.notifications_id),
          }"
        >
          <div class="notif-check" @click.stop>
            <UiCheckbox
              :model-value="selectedIds.has(notif.notifications_id)"
              @update="(v) => toggleSelect(notif.notifications_id, v)"
            />
          </div>

          <div class="notif-item__body">
            <span class="notif-icon-wrap" :class="`notif-icon-wrap--${notif.type}`">
              <component :is="iconMap[notif.type]" class="notif-icon" aria-hidden="true" />
            </span>

            <span class="notif-body">
              <span class="notif-header-row">
                <span class="notif-title">{{ notif.title }}</span>
                <span class="notif-time">{{ timeAgo(notif.date_created) }}</span>
              </span>
              <span class="notif-message" :class="{ 'notif-message--expanded': expandedIds.has(notif.notifications_id) }">
                <template v-if="expandedIds.has(notif.notifications_id) || notif.message.length <= MESSAGE_PREVIEW_CHARS">
                  {{ notif.message }}
                </template>
                <template v-else>
                  {{ notif.message.slice(0, MESSAGE_PREVIEW_CHARS) }}…
                </template>
              </span>
              <button
                v-if="notif.message.length > MESSAGE_PREVIEW_CHARS"
                class="notif-expand-btn"
                type="button"
                @click.stop="toggleExpand(notif.notifications_id)"
              >
                {{ expandedIds.has(notif.notifications_id) ? 'Ver menos' : 'Ver mais' }}
              </button>
            </span>

            <UiIconButton
              v-if="!notif.is_read"
              size="sm"
              shape="square"
              variant="read"
              aria-label="Marcar como lida"
              @click.stop="handleItemClick(notif.notifications_id, notif.is_read)"
            >
              <EyeIcon class="read-icon" aria-hidden="true" />
            </UiIconButton>
          </div>
        </div>
      </div>

      <!-- Empty state -->
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
/* ── Panel ── */
.notif-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 25rem;
  max-height: 32.5rem;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 1rem;
  box-shadow: 6px 6px 0 var(--color-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
}

@media (max-width: 64em) {
  .notif-panel {
    position: fixed;
    top: calc(var(--topbar-height, 4.5rem) + var(--space-200));
    bottom: auto;
    left: auto;
    right: var(--space-300);
    width: min(25rem, calc(100vw - 1.5rem));
    max-height: min(32.5rem, calc(100dvh - 6rem));
    border-radius: 1rem;
    border-bottom: 2px solid var(--color-mirage-800);
    box-shadow: 6px 6px 0 var(--color-shadow);
  }
}

/* ── Header ── */
.notif-panel__header {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  /* right/top/bottom padding only — left is handled by .notif-header__check to align with list */
  padding: 16px 16px 16px 0;
  border-bottom: 2px solid var(--color-mirage-800);
  flex-shrink: 0;
  background: var(--color-wild-100);
}

/* Checkbox column — same geometry as .notif-check in list items */
.notif-header__check {
  display: flex;
  align-items: center;
  padding: 0 4px 0 12px;
  flex-shrink: 0;
}

.notif-header__centre {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex: 1;
  min-width: 0;
}

.notif-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
  font-family: var(--font-display);
  white-space: nowrap;
}

.notif-header__sel-count {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-mirage-800);
  font-family: var(--font-display);
}

.notif-count-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--color-deep-600);
  border: 1.5px solid var(--color-mirage-800);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
}

.notif-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-150);
  flex-shrink: 0;
}

.btn-icon {
  width: 11px;
  height: 11px;
  stroke-width: 2.5;
  flex-shrink: 0;
}

.notif-mark-all {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 8px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-800);
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.notif-mark-all:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.notif-mark-all:active {
  transform: translate(0, 0);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

/* ── List ── */
.notif-list {
  overflow-y: auto;
  flex: 1;
}

/* ── Item ── */
.notif-item {
  position: relative;
  display: flex;
  align-items: stretch;
  border-bottom: 1.5px solid var(--color-wild-500);
  background: var(--color-wild-100);
  transition: background 0.12s ease;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item.is-unread {
  background: var(--color-deep-100);
  border-left: 3px solid var(--color-deep-600);
}

.notif-item.is-selected {
  background: color-mix(in srgb, var(--color-deep-600) 8%, var(--color-wild-100));
}

.notif-item.is-unread.is-selected {
  background: color-mix(in srgb, var(--color-deep-600) 16%, var(--color-wild-100));
}

/* Checkbox column */
.notif-check {
  display: flex;
  align-items: center;
  padding: 0 4px 0 12px;
  flex-shrink: 0;
}

/* Body */
.notif-item__body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: 12px 12px 12px 8px;
  min-width: 0;
}

.read-icon {
  width: 13px;
  height: 13px;
  stroke-width: 2;
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
}

.notif-icon-wrap--achievement        { background: var(--color-amber-100); }
.notif-icon-wrap--quiz_ready         { background: #f3e8ff; }
.notif-icon-wrap--quiz_result        { background: var(--color-deep-100); }
.notif-icon-wrap--streak_warning     { background: var(--color-pumpkin-100); }
.notif-icon-wrap--system             { background: var(--color-wild-400); }
.notif-icon-wrap--book_unlocked      { background: var(--color-deep-100); }
.notif-icon-wrap--new_content        { background: var(--color-mirage-100); }
.notif-icon-wrap--exercise_created   { background: var(--color-teal-100, #e6faf8); }
.notif-icon-wrap--exercise_deleted   { background: var(--color-crimson-100, #fee2e2); }
.notif-icon-wrap--exercise_edited    { background: var(--color-amber-100); }
.notif-icon-wrap--book_approved      { background: var(--color-deep-100); }
.notif-icon-wrap--module_created     { background: var(--color-mirage-100); }

.notif-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

.notif-icon-wrap--achievement        .notif-icon { color: var(--color-amber-700); }
.notif-icon-wrap--quiz_ready         .notif-icon { color: #7c3aed; }
.notif-icon-wrap--quiz_result        .notif-icon { color: var(--color-deep-600); }
.notif-icon-wrap--streak_warning     .notif-icon { color: var(--color-pumpkin-700); }
.notif-icon-wrap--system             .notif-icon { color: var(--color-mirage-500); }
.notif-icon-wrap--book_unlocked      .notif-icon { color: var(--color-deep-600); }
.notif-icon-wrap--new_content        .notif-icon { color: var(--color-mirage-500); }
.notif-icon-wrap--exercise_created   .notif-icon { color: var(--color-teal-700, #0f766e); }
.notif-icon-wrap--exercise_deleted   .notif-icon { color: var(--color-crimson-700, #b91c1c); }
.notif-icon-wrap--exercise_edited    .notif-icon { color: var(--color-amber-700); }
.notif-icon-wrap--book_approved      .notif-icon { color: var(--color-deep-600); }
.notif-icon-wrap--module_created     .notif-icon { color: var(--color-mirage-600); }

/* ── Body text ── */
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
}

.notif-expand-btn {
  display: inline-block;
  margin-top: 3px;
  padding: 0;
  background: none;
  border: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary-strong, var(--color-deep-600));
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.notif-expand-btn:hover {
  color: var(--color-deep-800);
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

/* ── Panel transition ── */
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

@media (max-width: 64em) {
  .panel-pop-enter-active {
    animation: panel-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .panel-pop-leave-active {
    animation: panel-slide-up 0.2s ease reverse both;
  }
}

@keyframes panel-slide-up {
  from { opacity: 0; transform: translateY(1.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
