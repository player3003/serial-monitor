import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import router from '@/router'

/**
 * Axios 请求封装 - 适配 webserial 后端
 * 后端直接返回数据（数组或对象），不包装在 code/data 中
 */

// 创建axios实例
const service = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers['Authorization'] = `Bearer ${userStore.token}`
    }
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // webserial 后端直接返回数据，不包装在 code/data 中
    // 如果响应有 code 字段，按原逻辑处理
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code !== 200 && res.code !== 0) {
        ElMessage.error(res.message || '请求失败')
        
        if (res.code === 401) {
          const userStore = useUserStore()
          userStore.clear()
          router.push('/login')
        }
        
        return Promise.reject(new Error(res.message || '请求失败'))
      }
      return res
    }
    
    // 后端直接返回数据（数组或对象），直接返回
    return res
  },
  error => {
    console.error('响应错误:', error)
    
    if (error.response) {
      const status = error.response.status
      
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          {
            const userStore = useUserStore()
            userStore.clear()
            router.push('/login')
          }
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          // 404 可能是设备没有数据，不显示错误
          console.warn('请求资源不存在:', error.config?.url)
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(error.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查后端服务是否启动')
    } else {
      ElMessage.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

export default service
