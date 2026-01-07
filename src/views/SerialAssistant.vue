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
      <!-- 左侧：串口设置 -->
      <el-card class="settings-panel">
        <template #header>
          <div class="settings-header">
            <span>串口设置</span>
            <div style="display:flex; gap: 5px">
                 <el-button size="small" type="warning" text @click="showForwardDialog = true">
                    <el-icon><Connection /></el-icon>
                 </el-button>
                 <el-tag size="small" :type="isPortOpen ? 'success' : 'info'">
                   {{ isPortOpen ? '已打开' : '已关闭' }}
                 </el-tag>
            </div>
          </div>
        </template>
        
        <el-form label-position="left" label-width="70px" size="default">
          <el-form-item label="端口号">
            <el-select v-model="serialConfig.port" disabled placeholder="选择端口">
              <el-option label="COM1" value="COM1" />
              <el-option label="COM3" value="COM3" />
              <el-option label="COM4" value="COM4" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="波特率">
            <el-select v-model="serialConfig.baudRate" :disabled="isPortOpen">
              <el-option v-for="rate in baudRateOptions" :key="rate" :label="rate" :value="rate" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="数据位">
            <el-select v-model="serialConfig.dataBits" :disabled="isPortOpen">
              <el-option label="5" :value="5" />
              <el-option label="6" :value="6" />
              <el-option label="7" :value="7" />
              <el-option label="8" :value="8" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="校验位">
            <el-select v-model="serialConfig.parity" :disabled="isPortOpen">
              <el-option label="None" value="None" />
              <el-option label="Odd" value="Odd" />
              <el-option label="Even" value="Even" />
              <el-option label="Mark" value="Mark" />
              <el-option label="Space" value="Space" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="停止位">
            <el-select v-model="serialConfig.stopBits" :disabled="isPortOpen">
              <el-option label="1" :value="1" />
              <el-option label="1.5" :value="1.5" />
              <el-option label="2" :value="2" />
            </el-select>
          </el-form-item>

          <el-form-item label="流控">
             <div class="flow-control">
               <el-checkbox label="DTR" size="small" />
               <el-checkbox label="RTS" size="small" />
             </div>
          </el-form-item>
        </el-form>

        <div class="settings-actions">
           <el-button 
             :type="isPortOpen ? 'danger' : 'primary'" 
             class="action-btn" 
             @click="handleOpenSerial"
           >
             {{ isPortOpen ? '关闭串口' : '打开串口' }}
           </el-button>
        </div>

        <el-divider />
        
        <div class="panel-section">
          <div class="section-title">接收设置</div>
          <el-checkbox v-model="receiveOptions.hexDisplay">HEX显示</el-checkbox>
          <el-checkbox v-model="receiveOptions.showTimestamp">显示时间戳</el-checkbox>
          <el-checkbox v-model="receiveOptions.autoScroll">自动滚动</el-checkbox>
          <el-checkbox v-model="receiveOptions.pause">暂停接收</el-checkbox>
          <el-button size="small" style="width: 100%; margin-top: 5px" @click="saveToFile">
            保存接收数据
          </el-button>
        </div>

        <el-divider />

        <div class="panel-section">
          <div class="section-title">发送设置</div> 
          <el-checkbox v-model="sendOptions.hexSend">HEX发送</el-checkbox>
          <el-checkbox v-model="sendOptions.addNewLine">发送新行</el-checkbox>
          <el-checkbox v-model="sendOptions.showSent">显示发送</el-checkbox>
          <div class="timer-send">
            <el-checkbox v-model="sendOptions.timedSend">定时发送</el-checkbox>
            <el-input-number 
              v-model="sendOptions.interval" 
              size="small" 
              :min="100" 
              :step="100" 
              controls-position="right"
              style="width: 90px"
              :disabled="!sendOptions.timedSend"
            /> ms
          </div>
        </div>
      </el-card>

      <!-- 中间：数据收发区 -->
      <el-card class="data-panel">
        <!-- 工具栏 -->
        <div class="toolbar">
          <!-- 移除旧的单选框，改用左侧设置 -->
          <div style="flex: 1"></div>
          
          <div class="toolbar-actions">
            <el-button size="small" @click="clearReceiveData">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
          </div>
        </div>
        
        <!-- 接收数据区 -->
        <div class="receive-area">
          <div class="area-header">
            <span>接收区 ({{ receiveData.length }}条)</span>
            <!-- 移除旧的 checkbox，功能移至左侧 -->
          </div>
          <div ref="receiveBox" class="data-box">
            <div
              v-for="(item, index) in receiveData"
              :key="index"
              class="data-item"
              :class="item.type === 'sent' ? 'sent-item' : 'receive-item'"
            >
              <span v-if="receiveOptions.showTimestamp" class="timestamp">[{{ formatTime(item.timestamp) }}]</span>
              <span class="data-content" :style="{ color: item.type === 'sent' ? '#409eff' : '#67c23a' }">
                {{ item.type === 'sent' ? 'SEND: ' : 'RECV: ' }}
                {{ formatData(item.data) }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- 发送数据区 -->
        <div class="send-area">
          <div class="area-header">
            <span>发送区</span>
             <!-- 移除旧的 checkbox，功能移至左侧 -->
          </div>
          <div class="send-input-area">
            <el-input
              v-model="sendText"
              type="textarea"
              :rows="3"
              placeholder="请输入要发送的数据"
              @keydown.ctrl.enter="handleSend(false)"
            />
            <div class="send-buttons">
              <el-button type="primary" :loading="sending" @click="handleSend(false)">
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

    <!-- 透传设置对话框 -->
    <el-dialog v-model="showForwardDialog" title="数据转发配置 (透传)" width="500px" @open="fetchForwardRules">
      <div class="forward-info">
          <p>将当前设备 ({{ currentDevice?.name }}) 的串口收到的所有数据转发给：</p>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <el-select v-model="selectedTarget" placeholder="选择目标设备" style="flex: 1">
              <el-option v-for="item in availableDevices" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
          <el-button type="primary" @click="handleAddForward" :disabled="!selectedTarget">添加</el-button>
      </div>

      <el-table :data="forwardTargets.map(id => ({id}))" border stripe empty-text="暂无转发规则">
          <el-table-column label="目标设备ID" prop="id" />
          <el-table-column label="操作" width="100" align="center">
              <template #default="scope">
                  <el-button type="danger" size="small" @click="handleDeleteForward(scope.row.id)" icon="Delete" circle />
              </template>
          </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '@/store/device'
import { sendSerialCommand, configureDevice, addForwardRule, deleteForwardRule, getForwardRules } from '@/api/device'
import websocket from '@/utils/websocket'
import { stringToHex, hexToString, isValidHex } from '@/utils/dataParser'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

const deviceId = route.params.id
const currentDevice = computed(() => deviceStore.currentDevice)

// 透传转发
const showForwardDialog = ref(false)
const forwardTargets = ref([]) // 当前已配置的转发目标ID列表
const availableDevices = computed(() => {
  return deviceStore.devices
    .filter(d => d.id !== deviceId) // 排除自己
    .map(d => ({ label: `${d.name} (${d.id})`, value: d.id }))
})
const selectedTarget = ref('')

// 获取转发规则
const fetchForwardRules = async () => {
    try {
        const rules = await getForwardRules(deviceId)
        forwardTargets.value = Array.isArray(rules) ? rules : []
    } catch (e) {
        console.error('获取转发规则失败', e)
    }
}

// 添加转发规则
const handleAddForward = async () => {
    if(!selectedTarget.value) return
    try {
        await addForwardRule(deviceId, selectedTarget.value)
        ElMessage.success('添加转发规则成功')
        selectedTarget.value = ''
        fetchForwardRules()
    } catch (error) {
        ElMessage.error('添加转发规则失败')
    }
}

// 删除转发规则
const handleDeleteForward = async (targetId) => {
    try {
        await deleteForwardRule(deviceId, targetId)
        ElMessage.success('删除转发规则成功')
        fetchForwardRules()
    } catch (error) {
        ElMessage.error('删除转发规则失败')
    }
}

// 串口配置
const serialConfig = reactive({
  port: 'COM1',
  baudRate: 115200,
  dataBits: 8,
  parity: 'None',
  stopBits: 1
})
const isPortOpen = ref(false)

// 常用波特率
const baudRateOptions = [
  1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600
]

const handleOpenSerial = async () => {
  try {
    if (isPortOpen.value) {
      // 关闭串口逻辑 (暂未实现后端关闭接口，仅前端状态切换)
      isPortOpen.value = false
      ElMessage.success('串口已关闭')
      return
    }

    // 发送配置到后端
    await configureDevice(deviceId, {
      baudRate: serialConfig.baudRate,
      dataBits: serialConfig.dataBits,
      parity: serialConfig.parity,
      stopBits: serialConfig.stopBits,
      status: 'online'
    })
    
    isPortOpen.value = true
    ElMessage.success('串口已打开')
  } catch (error) {
    console.error('配置串口失败:', error)
    ElMessage.error('打开串口失败')
  }
}

// 显示模式
// const displayMode = ref('text') // 已废弃，使用 receiveOptions.hexDisplay
// const autoScroll = ref(true) // 已废弃，使用 receiveOptions.autoScroll

const receiveOptions = reactive({
  hexDisplay: false,
  showTimestamp: true,
  autoScroll: true,
  pause: false
})

// 接收数据
const receiveData = ref([])
const receiveBox = ref(null)

// 发送数据
const sendText = ref('')
const sending = ref(false)
const sendOptions = reactive({
  hexSend: false,
  addNewLine: true,
  showSent: true,
  timedSend: false,
  interval: 1000
})
let sendTimer = null

// 监听定时发送开启/关闭
watch(() => sendOptions.timedSend, (val) => {
  if (val) {
    if (!sendTimer) {
      sendTimer = setInterval(() => {
        if (isPortOpen.value && sendText.value) {
          handleSend(true) // Pass true to indicate auto send
        }
      }, sendOptions.interval)
    }
  } else {
    if (sendTimer) {
      clearInterval(sendTimer)
      sendTimer = null
    }
  }
})

// 监听定时时间间隔变化
watch(() => sendOptions.interval, (val) => {
  if (sendOptions.timedSend && sendTimer) {
    clearInterval(sendTimer)
    sendTimer = setInterval(() => {
      if (isPortOpen.value && sendText.value) {
        handleSend(true)
      }
    }, val)
  }
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
  // 如果是HEX显示模式，则转换
  if (receiveOptions.hexDisplay) {
    // 假设data本身是文本，如果需要HEX显示
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
const handleSend = async (isAuto = false) => {
  if (!sendText.value) { // 允许发送空格，只是非空校验
    if (!isAuto) ElMessage.warning('请输入要发送的数据')
    return
  }
  
  // 验证HEX发送格式
  if (sendOptions.hexSend && !isValidHex(sendText.value)) {
    if (!isAuto) ElMessage.error('HEX格式不正确，请输入如：01 02 03')
    return
  }
  
  if (!isPortOpen.value) {
    if (!isAuto) ElMessage.warning('请先打开串口')
    return
  }
  
  sending.value = true
  try {
    let dataToSend = sendText.value
    
    // HEX发送模式转换：如果是HEX发送，输入的是HEX字符串，需要转换为实际字符发送给后端
    // 但后端现在除了 raw string 外，如果前端给的是 hex string 怎么处理？
    // 通常串口助手 "Hex Send" 意味着用户输入 "31 32", 实际发送 bytes 0x31 0x32 ('1', '2')
    // 我们现有的 hexToString 工具正是做这个： "31 32" -> "12"
    if (sendOptions.hexSend) {
      dataToSend = hexToString(sendText.value)
    }
    
    // 添加换行 (仅在文本发送模式下有效，或者Hex模式下需不需要由用户决定？通常Hex模式不自动加换行，除非用户写了 0D 0A)
    // 根据通用逻辑，Hex发送通常不自动加换行，除非有明确选项。这里简单处理：如果是文本模式且勾选，则加。
    if (!sendOptions.hexSend && sendOptions.addNewLine) {
      dataToSend += '\n'
    } else if (sendOptions.hexSend && sendOptions.addNewLine) {
        // Hex模式下加换行意味着追加 0D 0A
        dataToSend += '\r\n' 
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
        data: dataToSend, // 这里存原始发送出的数据，显示时会经过 formatData 处理
        type: 'sent'
      })
    }
    
    // 非定时发送才清空？通常串口助手不清空，方便重复发送。这里保持不清空
    // sendText.value = '' 
    if (!isAuto) ElMessage.success('发送成功')
    
    // 自动滚动
    if (receiveOptions.autoScroll) {
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
    .map(item => `[${formatTime(item.timestamp)}] ${item.type === 'sent' ? 'SEND' : 'RECV'} -> ${receiveOptions.hexDisplay ? stringToHex(item.data) : item.data}`)
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
  // 假设快捷指令也是遵循当前的 hexSend 设置，或者快捷指令应该自带类型？简单起见跟随当前设置
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
  if (receiveOptions.autoScroll) {
    scrollToBottom()
  }
})

// WebSocket数据接收
const onSerialData = (data) => {
  console.log('Component received:', data, 'Target ID:', deviceId)
  if (data.deviceId !== deviceId) {
    console.log('Device ID mismatch, ignored.')
    return
  }
  if (receiveOptions.pause) return // 暂停接收
  
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
    if (isPortOpen.value) {
        connectionTime.value++
    }
  }, 1000)
})

onUnmounted(() => {
  websocket.off('serial_data', onSerialData)
  if (connectionTimer) {
    clearInterval(connectionTimer)
  }
  if (sendTimer) {
    clearInterval(sendTimer)
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
  grid-template-columns: 240px 1fr 280px;
  gap: 15px;
  overflow: hidden;
}

.settings-panel {
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  width: 100%;
}

.flow-control {
  display: flex;
  gap: 10px;
}

.data-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.data-panel :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px 0;
}

.section-title {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 5px;
  color: #606266;
}

.timer-send {
  display: flex;
  align-items: center;
  gap: 5px;
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
  height: 500px;
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

