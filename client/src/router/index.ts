import { createRouter, createWebHistory } from 'vue-router'
import { isAdminUser } from '@/services/auth'
import { getStoredUserId, getAccessToken } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue'),
      meta: { layout: 'landing' },
    },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { layout: 'landing' } },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue'), meta: { layout: 'landing' } },
    {
      path: '/app',
      name: 'app',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('../views/Rankings.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/user/:id',
      name: 'user-profile',
      component: () => import('../views/UserProfile.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/collection',
      name: 'collection',
      component: () => import('../views/Collection.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/book/:id',
      name: 'book',
      component: () => import('../views/Book.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/book/:bookId/module/:moduleId',
      name: 'module',
      component: () => import('../views/Module.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/book/:bookId/study',
      name: 'study',
      component: () => import('../views/StudyMode.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/book/:bookId/final-quiz',
      name: 'final-quiz',
      component: () => import('../views/FinalQuiz.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/daily-exercise',
      name: 'daily-exercise',
      component: () => import('../views/DailyExercise.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/help',
      name: 'help',
      component: () => import('../views/Help.vue'),
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/unlock/:code',
      name: 'unlock',
      component: () => import('../views/Unlock.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      component: () => import('../views/Settings.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'settings', redirect: '/settings/conta' },
        {
          path: 'conta',
          name: 'settings-conta',
          component: () => import('../views/settings/SettingsAccount.vue'),
        },
        {
          path: 'notificacoes',
          name: 'settings-notificacoes',
          component: () => import('../views/settings/SettingsNotifications.vue'),
        },
        {
          path: 'aparencia',
          name: 'settings-aparencia',
          component: () => import('../views/settings/Appearance.vue'),
        },
        {
          path: 'privacidade',
          name: 'settings-privacidade',
          component: () => import('../views/settings/Privacy.vue'),
        },
        {
          path: 'acessibilidade',
          name: 'settings-acessibilidade',
          component: () => import('../views/settings/Accessibility.vue'),
        },
        {
          path: 'atividade',
          name: 'settings-atividade',
          component: () => import('../views/settings/ActivityHistory.vue'),
        },
      ],
    },
    {
      path: '/ui-kit',
      name: 'ui-kit',
      component: () => import('../views/UiKitPreview.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminHome.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/guide',
      name: 'admin-guide',
      component: () => import('../views/AdminGuide.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/exercise-generator',
      name: 'exercise-generator',
      component: () => import('../views/ExerciseGenerator.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFound.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const storedId = getStoredUserId()
  if (!storedId) return { path: '/login', query: { redirect: to.fullPath } }

  const token = getAccessToken()
  if (!token) return { path: '/login', query: { redirect: to.fullPath } }

  const auth = useAuthStore()

  // Load user only once — reuse cached value from store on subsequent navigations
  if (!auth.user) {
    try {
      await auth.loadUser()
    } catch {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  const user = auth.user
  if (!user) return { path: '/login', query: { redirect: to.fullPath } }

  if (to.meta.requiresAdmin && !isAdminUser(user)) return { path: '/app' }
  if (to.meta.userOnly && isAdminUser(user)) return { path: '/admin' }

  return true
})

export default router
