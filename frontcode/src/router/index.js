import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true }  // 添加需要认证的元信息
    },
    {
      path: '/relitu',
      name: 'relitu',
      component: () => import('../views/RelituView.vue'),
      meta: { requiresAuth: true }  // 添加需要认证的元信息
    },
  ],
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 获取用户登录状态
  const isAuthenticated = sessionStorage.getItem('isLogin')
  
  // 判断该路由是否需要登录权限
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 需要登录权限
    if (!isAuthenticated) {
      // 未登录，跳转到登录页
      next({
        name: 'login',
        query: { redirect: to.fullPath } // 保存想要访问的路由
      })
    } else {
      // 已登录，允许访问
      next()
    }
  } else {
    // 不需要登录权限的路由直接放行
    next()
  }
})

export default router
