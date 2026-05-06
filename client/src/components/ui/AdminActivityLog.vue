<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { authFetch } from '@/services/client'
import {
  ArrowPathIcon,
  UserIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowUpTrayIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/vue/24/outline'

type ActivityRecord = {
  id: number
  action: string
  timestamp: string
  user: { id: string; first_name?: string; last_name?: string; email?: string } | null
  collection: string | null
  item: string | null
  ip: string | null
  user_agent: string | null
  origin: string | null
}

const PAGE_SIZE = 25

const records = ref<ActivityRecord[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const error = ref('')

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

const ACTION_META: Record<string, { label: string; cls: string }> = {
  create:  { label: 'Criar',   cls: 'action--create'  },
  update:  { label: 'Editar',  cls: 'action--update'  },
  delete:  { label: 'Apagar',  cls: 'action--delete'  },
  login:   { label: 'Login',   cls: 'action--login'   },
  logout:  { label: 'Logout',  cls: 'action--logout'  },
  comment: { label: 'Comentário', cls: 'action--comment' },
  upload:  { label: 'Upload',  cls: 'action--upload'  },
}

const actionMeta = (action: string) =>
  ACTION_META[action.toLowerCase()] ?? { label: action, cls: 'action--other' }

const userName = (u: ActivityRecord['user']) => {
  if (!u) return '—'
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return name || u.email || u.id
}

const formatDate = (ts: string) => {
  const d = new Date(ts)
  return d.toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const load = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const offset = (page.value - 1) * PAGE_SIZE
    const params = new URLSearchParams({
      fields: 'id,action,timestamp,user.id,user.first_name,user.last_name,user.email,collection,item,ip,user_agent,origin',
      sort: '-timestamp',
      limit: String(PAGE_SIZE),
      offset: String(offset),
      meta: 'total_count',
    })
    const res = await authFetch(`/activity?${params.toString()}`)
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json().catch(() => null)
    records.value = (data?.data ?? []) as ActivityRecord[]
    total.value = data?.meta?.total_count ?? 0
  } catch (e: any) {
    error.value = 'Não foi possível carregar o registo de atividade.'
  } finally {
    isLoading.value = false
  }
}

const goPage = (p: number) => {
  page.value = p
  load()
}

onMounted(load)
</script>

<template>
  <section class="activity-card">
    <div class="activity-header">
      <div>
        <h2>Registo de Atividade</h2>
        <p class="activity-sub">Todas as ações registadas na plataforma</p>
      </div>
      <button class="refresh-btn" :disabled="isLoading" @click="load" aria-label="Atualizar">
        <ArrowPathIcon class="refresh-icon" :class="{ spinning: isLoading }" />
      </button>
    </div>

    <div v-if="isLoading && !records.length" class="activity-loading">
      <div class="loader-row" v-for="i in 6" :key="i">
        <div class="skel skel--sm" />
        <div class="skel skel--md" />
        <div class="skel skel--lg" />
        <div class="skel skel--md" />
        <div class="skel skel--sm" />
      </div>
    </div>

    <p v-else-if="error" class="activity-error">{{ error }}</p>

    <div v-else class="table-wrap">
      <table class="activity-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Ação</th>
            <th>Utilizador</th>
            <th>Coleção</th>
            <th>Item</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td class="col-date">{{ formatDate(r.timestamp) }}</td>
            <td class="col-action">
              <span class="action-badge" :class="actionMeta(r.action).cls">
                {{ actionMeta(r.action).label }}
              </span>
            </td>
            <td class="col-user">
              <div class="user-cell">
                <UserIcon class="user-icon" aria-hidden="true" />
                <span>{{ userName(r.user) }}</span>
              </div>
            </td>
            <td class="col-collection">{{ r.collection || '—' }}</td>
            <td class="col-item">{{ r.item || '—' }}</td>
            <td class="col-ip">{{ r.ip || '—' }}</td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="6" class="empty-row">Sem registos.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="goPage(page - 1)">&#8249;</button>
      <template v-for="p in totalPages" :key="p">
        <button
          v-if="p === 1 || p === totalPages || Math.abs(p - page) <= 2"
          class="page-btn"
          :class="{ 'page-btn--active': p === page }"
          @click="goPage(p)"
        >{{ p }}</button>
        <span v-else-if="Math.abs(p - page) === 3" class="page-ellipsis">…</span>
      </template>
      <button class="page-btn" :disabled="page === totalPages" @click="goPage(page + 1)">&#8250;</button>
      <span class="page-info">{{ total }} registos</span>
    </div>
  </section>
</template>

<style scoped>
.activity-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-500);
  display: grid;
  gap: var(--space-400);
}

.activity-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-200);
}

.activity-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.activity-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

.refresh-btn {
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  border-radius: 10px;
  box-shadow: 2px 2px 0 var(--color-shadow);
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.refresh-btn:hover { background: var(--color-wild-300); }
.refresh-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--color-shadow); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.refresh-icon {
  width: 18px;
  height: 18px;
  color: var(--color-mirage-700);
}

.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Skeleton loader */
.activity-loading {
  display: grid;
  gap: 10px;
}

.loader-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.skel {
  height: 14px;
  border-radius: 6px;
  background: var(--color-wild-300);
  animation: pulse 1.4s ease-in-out infinite;
}

.skel--sm  { width: 80px; }
.skel--md  { width: 120px; }
.skel--lg  { flex: 1; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.activity-error {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-amber-700);
}

/* Table */
.table-wrap {
  overflow-x: auto;
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.activity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.activity-table thead {
  background: var(--color-mirage-800);
  color: var(--color-wild-100);
}

.activity-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.activity-table tbody tr {
  border-bottom: 1px solid var(--color-wild-300);
  transition: background 0.15s ease;
}

.activity-table tbody tr:last-child { border-bottom: none; }
.activity-table tbody tr:hover { background: var(--color-wild-200); }

.activity-table td {
  padding: 10px 14px;
  color: var(--color-mirage-700);
  vertical-align: middle;
  white-space: nowrap;
}

.col-date   { font-variant-numeric: tabular-nums; font-size: 12px; color: var(--color-mirage-500); }
.col-collection, .col-item { font-family: monospace; font-size: 12px; }
.col-ip     { font-family: monospace; font-size: 12px; color: var(--color-mirage-500); }

/* Action badges */
.action-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 2px solid transparent;
}

.action--create  { background: #d1fae5; border-color: #059669; color: #065f46; }
.action--update  { background: #dbeafe; border-color: #2563eb; color: #1e3a8a; }
.action--delete  { background: #fee2e2; border-color: #dc2626; color: #7f1d1d; }
.action--login   { background: #ede9fe; border-color: #7c3aed; color: #4c1d95; }
.action--logout  { background: var(--color-wild-300); border-color: var(--color-mirage-500); color: var(--color-mirage-600); }
.action--comment { background: #fef3c7; border-color: #d97706; color: #78350f; }
.action--upload  { background: #e0f2fe; border-color: #0284c7; color: #0c4a6e; }
.action--other   { background: var(--color-wild-200); border-color: var(--color-mirage-400); color: var(--color-mirage-600); }

/* User cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-icon {
  width: 14px;
  height: 14px;
  color: var(--color-mirage-400);
  flex-shrink: 0;
}

.empty-row {
  text-align: center;
  color: var(--color-mirage-400);
  padding: var(--space-500);
  font-style: italic;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-150);
  flex-wrap: wrap;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 2px solid var(--color-mirage-800);
  border-radius: 8px;
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.15s ease;
}

.page-btn:hover:not(:disabled) { background: var(--color-wild-200); }
.page-btn:active:not(:disabled) { transform: translate(1px,1px); box-shadow: 1px 1px 0 var(--color-shadow); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn--active { background: var(--color-mirage-800); color: var(--color-wild-100); }

.page-ellipsis {
  font-size: 14px;
  color: var(--color-mirage-400);
  padding: 0 4px;
}

.page-info {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-500);
}
</style>
