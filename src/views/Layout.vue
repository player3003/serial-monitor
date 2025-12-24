<template>
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <el-header class="layout-header">
      <div class="header-left">
        <el-icon :size="24" class="logo-icon">
          <Monitor />
        </el-icon>
        <span class="system-title">串口监控系统</span>
      </div>
      
      <div class="header-right">
        <!-- WebSocket连接状态 -->
        <div class="connection-status">
          <el-tag :type="wsConnected ? 'success' : 'danger'" size="small">
            <el-icon><Connection /></el-icon>
            {{ wsConnected ? '已连接' : '未连接' }}
          </el-tag>
        </div>
        
        <!-- 用户信息 -->
        <el-dropdown @command="handleCommand">
          <div class="user-info">
            <el-avatar :size="32" :icon="UserFilled" />
            <span class="username">{{ userStore.userInfo?.username || '用户' }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人信息
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    
    <!-- 主体内容 -->
    <el-container class="layout-main">
      <!-- 侧边栏 -->
      <el-aside width="200px" class="layout-aside">
        <el-menu
          :default-active="currentRoute"
          router
          class="side-menu"
        >
          <el-menu-item index="/devices">
            <el-icon><List /></el-icon>
            <span>设备列表</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Document /></el-icon>
            <span>历史数据</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <!-- 内容区 -->
      <el-main class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import websocket from '@/utils/websocket'
import { logout } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const wsConnected = ref(false)

const currentRoute = computed(() => {
  return route.path
})

// 初始化WebSocket
onMounted(() => {
  if (userStore.token) {
    websocket.connect(userStore.token)
  }
  
  // 监听WebSocket连接状态
  websocket.on('connected', () => {
    wsConnected.value = true
    ElMessage.success('实时数据连接成功')
  })
  
  websocket.on('disconnected', () => {
    wsConnected.value = false
  })
})

// 清理WebSocket
onUnmounted(() => {
  websocket.off('connected')
  websocket.off('disconnected')
})

// 处理下拉菜单命令
const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人信息功能开发中')
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 退出登录
const handleLogout = async () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await logout()
    } catch (error) {
      console.error('退出登录失败:', error)
    }
    
    // 断开WebSocket
    websocket.disconnect()
    
    // 清除用户信息
    userStore.clear()
    
    // 跳转到登录页
    router.push('/login')
    ElMessage.success('已退出登录')
  }).catch(() => {})
}
</script>

<style scoped>
.layout-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo-icon {
  color: #409eff;
  margin-right: 12px;
}

.system-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.connection-status {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #333;
}

.layout-main {
  flex: 1;
  overflow: hidden;
}

.layout-aside {
  background: #fff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.side-menu {
  border-right: none;
  height: 100%;
}

.layout-content {
  background: #f0f2f5;
  overflow-y: auto;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

