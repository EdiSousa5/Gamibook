import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/Home.vue') },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
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
      path: '/flowise-test',
      name: 'flowise-test',
      component: () => import('../views/FlowiseTest.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true
  const isAuthed = !!localStorage.getItem('gb_user_id')
  return isAuthed ? true : { path: '/login' }
})

export default router
