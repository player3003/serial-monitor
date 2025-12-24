<template>
  <div class="serial-assistant-container">
    <div class="page-header">
      <div>
        <h2>串口助手</h2>
        <p v-if="currentDevice" class="device-info">
          {{ currentDevice.name }} ({{ currentDevice.id }})
        </p>
      </div>
      <el-button @click="goBack">
        <el-icon><Back /></el-icon>
        返回
      </el-button>
    </div>
    
    <div class="assistant-layout">
      <!-- 左侧：数据收发区 -->
      <el-card class="data-panel">
        <!-- 工具栏 -->
        <div class="toolbar">
          <el-radio-group v-model="displayMode" size="small">
            <el-radio-button label="text">文本模式</el-radio-button>
            <el-radio-button label="hex">HEX模式</el-radio-button>
          </el-radio-group>
          
          <div class="toolbar-actions">
            <el-button size="small" @click="clearReceiveData">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
            <el-button size="small" @click="saveToFile">
              <el-icon><Download /></el-icon>
              保存
            </el-button>
          </div>
        </div>
        
        <!-- 接收数据区 -->
        <div class="receive-area">
          <div class="area-header">
            <span>接收区 ({{ receiveData.length }}条)</span>
            <el-checkbox v-model="autoScroll">自动滚动</el-checkbox>
          </div>
          <div ref="receiveBox" class="data-box">
            <div
              v-for="(item, index) in receiveData"
              :key="index"
              class="data-item receive-item"
            >
              <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
              <span class="data-content">{{ formatData(item.data) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 发送数据区 -->
        <div class="send-area">
          <div class="area-header">
            <span>发送区</span>
            <div class="send-options">
              <el-checkbox v-model="sendOptions.addNewLine">添加换行</el-checkbox>
              <el-checkbox v-model="sendOptions.showSent">显示发送</el-checkbox>
            </div>
          </div>
          <div class="send-input-area">
            <el-input
              v-model="sendText"
              type="textarea"
              :rows="3"
              placeholder="请输入要发送的数据"
              @keydown.ctrl.enter="handleSend"
            />
            <div class="send-buttons">
              <el-button type="primary" :loading="sending" @click="handleSend">
                发送 (Ctrl+Enter)
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 右侧：快捷指令和统计 -->
      <div class="side-panel">
        <!-- 快捷指令 -->
        <el-card class="quick-commands">
          <template #header>
            <div class="card-header">
              <span>快捷指令</span>
              <el-button size="small" text @click="showAddCommand = true">
                <el-icon><Plus /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="command-list">
            <div
              v-for="(cmd, index) in quickCommands"
              :key="index"
              class="command-item"
            >
              <el-tooltip :content="cmd.command" placement="left">
                <el-button size="small" @click="sendQuickCommand(cmd)">
                  {{ cmd.name }}
                </el-button>
              </el-tooltip>
              <el-button
                size="small"
                text
                type="danger"
                @click="deleteCommand(index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          
          <el-empty v-if="quickCommands.length === 0" description="暂无快捷指令" />
        </el-card>
        
        <!-- 通信统计 -->
        <el-card class="statistics">
          <template #header>
            <span>通信统计</span>
          </template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">接收:</span>
              <span class="stat-value">{{ statistics.received }}条</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">发送:</span>
              <span class="stat-value">{{ statistics.sent }}条</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">连接时长:</span>
              <span class="stat-value">{{ formatDuration(connectionTime) }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 添加快捷指令对话框 -->
    <el-dialog
      v-model="showAddCommand"
      title="添加快捷指令"
      width="500px"
    >
      <el-form :model="newCommand" label-width="80px">
        <el-form-item label="指令名称">
          <el-input v-model="newCommand.name" placeholder="如：查询状态" />
        </el-form-item>
        <el-form-item label="指令内容">
          <el-input
            v-model="newCommand.command"
            type="textarea"
            :rows="3"
            placeholder="如：AT+STATUS"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCommand = false">取消</el-button>
        <el-button type="primary" @click="addQuickCommand">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '@/store/device'
import { sendSerialCommand } from '@/api/device'
import websocket from '@/utils/websocket'
import { stringToHex, hexToString, isValidHex } from '@/utils/dataParser'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

const deviceId = route.params.id
const currentDevice = computed(() => deviceStore.currentDevice)

// 显示模式
const displayMode = ref('text')
const autoScroll = ref(true)

// 接收数据
const receiveData = ref([])
const receiveBox = ref(null)

// 发送数据
const sendText = ref('')
const sending = ref(false)
const sendOptions = reactive({
  addNewLine: true,
  showSent: true
})

// 快捷指令
const quickCommands = ref([])
const showAddCommand = ref(false)
const newCommand = reactive({
  name: '',
  command: ''
})

// 统计信息
const statistics = reactive({
  received: 0,
  sent: 0
})

const connectionTime = ref(0)
let connectionTimer = null

// 格式化数据
const formatData = (data) => {
  if (displayMode.value === 'hex') {
    return stringToHex(data)
  }
  return data
}

// 格式化时间
const formatTime = (timestamp) => {
  return dayjs(timestamp).format('HH:mm:ss.SSS')
}

// 格式化时长
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 发送数据
const handleSend = async () => {
  if (!sendText.value.trim()) {
    ElMessage.warning('请输入要发送的数据')
    return
  }
  
  // 验证HEX格式
  if (displayMode.value === 'hex' && !isValidHex(sendText.value)) {
    ElMessage.error('HEX格式不正确，请输入如：01 02 03')
    return
  }
  
  sending.value = true
  try {
    let dataToSend = sendText.value
    
    // HEX模式转换
    if (displayMode.value === 'hex') {
      dataToSend = hexToString(sendText.value)
    }
    
    // 添加换行
    if (sendOptions.addNewLine) {
      dataToSend += '\n'
    }
    
    await sendSerialCommand({
      deviceId: deviceId,
      data: dataToSend
    })
    
    statistics.sent++
    
    // 显示发送的数据
    if (sendOptions.showSent) {
      receiveData.value.push({
        timestamp: Date.now(),
        data: sendText.value,
        type: 'sent'
      })
    }
    
    sendText.value = ''
    ElMessage.success('发送成功')
    
    // 自动滚动
    if (autoScroll.value) {
      scrollToBottom()
    }
  } catch (error) {
    console.error('发送失败:', error)
  } finally {
    sending.value = false
  }
}

// 清空接收数据
const clearReceiveData = () => {
  receiveData.value = []
  statistics.received = 0
  statistics.sent = 0
}

// 保存到文件
const saveToFile = () => {
  if (receiveData.value.length === 0) {
    ElMessage.warning('没有数据可保存')
    return
  }
  
  const content = receiveData.value
    .map(item => `[${formatTime(item.timestamp)}] ${formatData(item.data)}`)
    .join('\n')
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `serial_${deviceId}_${dayjs().format('YYYYMMDDHHmmss')}.txt`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('保存成功')
}

// 发送快捷指令
const sendQuickCommand = (cmd) => {
  sendText.value = cmd.command
  handleSend()
}

// 添加快捷指令
const addQuickCommand = () => {
  if (!newCommand.name || !newCommand.command) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  quickCommands.value.push({
    name: newCommand.name,
    command: newCommand.command
  })
  
  // 保存到本地存储
  localStorage.setItem('quickCommands', JSON.stringify(quickCommands.value))
  
  newCommand.name = ''
  newCommand.command = ''
  showAddCommand.value = false
  
  ElMessage.success('添加成功')
}

// 删除快捷指令
const deleteCommand = (index) => {
  quickCommands.value.splice(index, 1)
  localStorage.setItem('quickCommands', JSON.stringify(quickCommands.value))
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (receiveBox.value) {
      receiveBox.value.scrollTop = receiveBox.value.scrollHeight
    }
  })
}

// 监听自动滚动
watch(() => receiveData.value.length, () => {
  if (autoScroll.value) {
    scrollToBottom()
  }
})

// WebSocket数据接收
const onSerialData = (data) => {
  if (data.deviceId !== deviceId) return
  
  receiveData.value.push({
    timestamp: Date.now(),
    data: data.data,
    type: 'received'
  })
  
  statistics.received++
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  // 加载快捷指令
  const saved = localStorage.getItem('quickCommands')
  if (saved) {
    try {
      quickCommands.value = JSON.parse(saved)
    } catch (e) {
      console.error('加载快捷指令失败', e)
    }
  }
  
  // 监听串口数据
  websocket.on('serial_data', onSerialData)
  
  // 开始计时
  connectionTimer = setInterval(() => {
    connectionTime.value++
  }, 1000)
})

onUnmounted(() => {
  websocket.off('serial_data', onSerialData)
  if (connectionTimer) {
    clearInterval(connectionTimer)
  }
})
</script>

<style scoped>
.serial-assistant-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #333;
}

.device-info {
  margin: 0;
  font-size: 14px;
  color: #999;
}

.assistant-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  overflow: hidden;
}

.data-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.receive-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  min-height: 0;
}

.area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.data-box {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  background: #f5f7fa;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.data-item {
  margin-bottom: 8px;
  word-break: break-all;
}

.timestamp {
  color: #909399;
  margin-right: 10px;
}

.data-content {
  color: #333;
}

.receive-item {
  color: #67c23a;
}

.send-area {
  display: flex;
  flex-direction: column;
}

.send-options {
  display: flex;
  gap: 15px;
}

.send-input-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.send-buttons {
  display: flex;
  justify-content: flex-end;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.quick-commands {
  flex-shrink: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.command-list {
  max-height: 300px;
  overflow-y: auto;
}

.command-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.command-item .el-button {
  flex: 1;
  margin-right: 5px;
}

.statistics {
  flex-shrink: 0;
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 500;
  color: #409eff;
}
</style>

