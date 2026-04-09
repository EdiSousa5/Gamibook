import { createRouter, createWebHistory } from 'vue-router'
import { fetchUserById, getStoredUserId, isAdminUser } from '@/services/directus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/Home.vue') },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/book/:id',
      name: 'book',
      component: () => import('../views/Book.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/book/:bookId/module/:moduleId',
      name: 'module',
      component: () => import('../views/Module.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rankings',
      name: 'rankings',
      component: () => import('../views/Rankings.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/exercise-generator',
      name: 'exercise-generator',
      component: () => import('../views/ExerciseGenerator.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const storedId = getStoredUserId()
  if (!storedId) return { path: '/login' }

  if (to.name === 'exercise-generator') {
    try {
      const user = await fetchUserById(storedId)
      if (!isAdminUser(user)) return { path: '/profile' }
    } catch (error) {
      console.error('[Router] Failed to validate admin access', error)
      return { path: '/profile' }
    }
  }

  return true
})

export default router
