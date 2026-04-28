import { createRouter, createWebHistory } from 'vue-router'
import { fetchUserById, isAdminUser } from '@/services/auth'
import { getStoredUserId } from '@/services/client'

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
      meta: { requiresAuth: true, userOnly: true },
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('../views/Rankings.vue'),
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
          path: 'aparencia',
          name: 'settings-aparencia',
          component: () => import('../views/settings/Appearance.vue'),
        },
        {
          path: 'privacidade',
          name: 'settings-privacidade',
          component: () => import('../views/settings/Privacy.vue'),
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
      path: '/admin/stats',
      name: 'admin-stats',
      component: () => import('../views/AdminStats.vue'),
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
  if (!storedId) return { path: '/login', query: { redirect: to.fullPath } }

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
      if (isAdminUser(user) && to.meta.userOnly) return { path: '/admin' }
    } catch (error) {
      console.error('[Router] Failed to validate user role', error)
      return { path: '/login' }
    }
  }

  return true
})

export default router
