import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/devices',
    children: [
      {
        path: '/devices',
        name: 'DeviceList',
        component: () => import('@/views/DeviceList.vue'),
        meta: { title: '设备列表' }
      },
      {
        path: '/device/:id',
        name: 'DeviceMonitor',
        component: () => import('@/views/DeviceMonitor.vue'),
        meta: { title: '设备监控' }
      },
      {
        path: '/serial/:id',
        name: 'SerialAssistant',
        component: () => import('@/views/SerialAssistant.vue'),
        meta: { title: '串口助手' }
      },
      {
        path: '/history',
        name: 'HistoryData',
        component: () => import('@/views/HistoryData.vue'),
        meta: { title: '历史数据' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth !== false) {
    if (!userStore.token) {
      next('/login')
    } else {
      next()
    }
  } else {
    if (to.path === '/login' && userStore.token) {
      next('/devices')
    } else {
      next()
    }
  }
})

export default router

