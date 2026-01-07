<template>
  <div class="device-list-container">
    <div class="page-header">
      <h2>设备列表</h2>
      <el-button type="primary" @click="refreshDevices">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
    
    <!-- 设备卡片列表 -->
    <div v-loading="loading" class="device-grid">
      <el-empty v-if="!loading && devices.length === 0" description="暂无设备" />
      
      <div
        v-for="device in devices"
        :key="device.id"
        class="device-card"
        @click="handleDeviceClick(device)"
      >
        <div class="device-header">
          <div class="device-info">
            <el-icon :size="32" class="device-icon">
              <Monitor />
            </el-icon>
            <div>
              <h3>{{ device.name }}</h3>
              <p class="device-id">ID: {{ device.id }}</p>
            </div>
          </div>
          <el-tag :type="device.status === 'online' ? 'success' : 'info'">
            {{ device.status === 'online' ? '在线' : '离线' }}
          </el-tag>
        </div>
        
        <el-divider />
        
        <div class="device-body">
          <div class="device-item">
            <span class="label">设备类型：</span>
            <span>{{ device.type || 'ESP32' }}</span>
          </div>
          <div class="device-item">
            <span class="label">串口：</span>
            <span>{{ device.serialPort || 'UART0' }}</span>
          </div>
          <div class="device-item">
            <span class="label">IP地址：</span>
            <span>{{ device.ipAddress || '未知' }}</span>
          </div>
          <div class="device-item">
            <span class="label">最后更新：</span>
            <span>{{ formatTime(device.lastUpdateTime) }}</span>
          </div>
        </div>
        
        <div class="device-footer">
          <el-button size="small" @click.stop="openSerialAssistant(device)">
            <el-icon><Connection /></el-icon>
            串口助手
          </el-button>
          <el-button size="small" @click.stop="openMonitor(device)">
            <el-icon><DataLine /></el-icon>
            数据监控
          </el-button>
          <el-button size="small" type="danger" @click.stop="handleDelete(device)">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDeviceList, deleteDevice } from '@/api/device'
import { useDeviceStore } from '@/store/device'
import websocket from '@/utils/websocket'
import dayjs from 'dayjs'

const router = useRouter()
const deviceStore = useDeviceStore()

const loading = ref(false)
const devices = ref([])

// 获取设备列表
const fetchDevices = async () => {
  loading.value = true
  try {
    const res = await getDeviceList()
    devices.value = res.data || []
    deviceStore.updateDevices(devices.value)
  } catch (error) {
    console.error('获取设备列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新设备列表
const refreshDevices = () => {
  ElMessage.success('正在刷新...')
  fetchDevices()
}

// 处理设备卡片点击
const handleDeviceClick = (device) => {
  deviceStore.setCurrentDevice(device)
  openMonitor(device)
}

// 打开串口助手
const openSerialAssistant = (device) => {
  if (device.status !== 'online') {
    ElMessage.warning('设备离线，无法操作')
    return
  }
  deviceStore.setCurrentDevice(device)
  router.push(`/serial/${device.id}`)
}

// 打开设备监控
const openMonitor = (device) => {
  if (device.status !== 'online') {
    ElMessage.warning('设备离线，无法查看数据')
    return
  }
  deviceStore.setCurrentDevice(device)
  router.push(`/device/${device.id}`)
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '无'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 删除设备
const handleDelete = async (device) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除设备 "${device.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteDevice(device.id)
    ElMessage.success('删除成功')
    fetchDevices()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除设备失败:', error)
    }
  }
}

// WebSocket设备状态更新监听
const onDeviceStatusUpdate = (data) => {
  const device = devices.value.find(d => d.id === data.deviceId)
  if (device) {
    if (device.status !== data.status) {
       ElMessage.info(`设备 ${device.name} ${data.status === 'online' ? '上线' : '下线'}`)
    }
    device.status = data.status
    device.lastUpdateTime = data.timestamp ? dayjs(data.timestamp).toISOString() : new Date().toISOString()
  } else if (data.status === 'online') {
    // 新设备上线，刷新列表
    refreshDevices()
  }
}

onMounted(() => {
  fetchDevices()
  
  // 监听设备状态更新
  websocket.on('device_status_change', onDeviceStatusUpdate)
})

onUnmounted(() => {
  websocket.off('device_status_change', onDeviceStatusUpdate)
})
</script>

<style scoped>
.device-list-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.device-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
}

.device-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.device-info {
  display: flex;
  gap: 12px;
}

.device-icon {
  color: #409eff;
}

.device-info h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #333;
}

.device-id {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.device-body {
  margin: 15px 0;
}

.device-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.device-item .label {
  color: #666;
  font-weight: 500;
}

.device-footer {
  display: flex;
  gap: 10px;
}

.device-footer .el-button {
  flex: 1;
}
</style>

