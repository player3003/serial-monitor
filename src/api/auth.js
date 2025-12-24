import request from './request'

/**
 * 认证API - 连接真实后端
 */

/**
 * 用户登录
 */
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  }).then(response => {
    // 后端返回格式已经是 { code, message, data }
    return response
  })
}

/**
 * 用户注册
 */
export function register(data) {
  return request({
    url: '/auth/register',
    method: 'post',
    data
  })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return request({
    url: '/auth/userinfo',
    method: 'get'
  })
}

/**
 * 退出登录
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  }).finally(() => {
    // 无论成功失败都清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  })
}
