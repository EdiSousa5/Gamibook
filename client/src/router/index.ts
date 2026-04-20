import { createRouter, createWebHistory } from 'vue-router'
import { fetchUserById, getStoredUserId, isAdminUser } from '@/services/directus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue'),
      meta: { layout: 'landing' },
    },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    {
      path: '/app',
      name: 'app',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('../views/Rankings.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/collection',
      name: 'collection',
      component: () => import('../views/Collection.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/help',
      name: 'help',
      component: () => import('../views/Help.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/settings/conta' },
        {
          path: 'conta',
          name: 'settings-conta',
          component: () => import('../views/settings/SettingsAccount.vue'),
        },
        {
          path: 'dados',
          name: 'settings-dados',
          component: () => import('../views/settings/SettingsUserData.vue'),
        },
        {
          path: 'notificacoes',
          name: 'settings-notificacoes',
          component: () => import('../views/settings/SettingsNotifications.vue'),
        },
        {
          path: 'idioma',
          name: 'settings-idioma',
          component: () => import('../views/settings/SettingsLanguage.vue'),
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
      path: '/admin/books',
      name: 'admin-books',
      component: () => import('../views/AdminBooks.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/exercise-generator',
      name: 'exercise-generator',
      component: () => import('../views/ExerciseGenerator.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const storedId = getStoredUserId()
  if (!storedId) return { path: '/login' }

  if (to.meta.requiresAdmin) {
    try {
      const user = await fetchUserById(storedId)
      if (!isAdminUser(user)) return { path: '/app' }
    } catch (error) {
      console.error('[Router] Failed to validate admin access', error)
      return { path: '/app' }
    }
  }

  if (to.meta.requiresAuth) {
    try {
      const user = await fetchUserById(storedId)
      if (isAdminUser(user) && !to.meta.requiresAdmin) return { path: '/admin/books' }
    } catch (error) {
      console.error('[Router] Failed to validate user role', error)
      return { path: '/login' }
    }
  }

  return true
})

export default router
