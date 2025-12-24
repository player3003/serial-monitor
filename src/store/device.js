import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDeviceStore = defineStore('device', () => {
  // 设备列表
  const devices = ref([])
  
  // 当前选中的设备
  const currentDevice = ref(null)
  
  // 实时数据缓存
  const realtimeData = ref({})

  // 更新设备列表
  const updateDevices = (deviceList) => {
    devices.value = deviceList
  }

  // 更新单个设备状态
  const updateDeviceStatus = (deviceId, status) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.status = status
      device.lastUpdateTime = new Date().toISOString()
    }
  }

  // 设置当前设备
  const setCurrentDevice = (device) => {
    currentDevice.value = device
  }

  // 添加实时数据
  const addRealtimeData = (deviceId, data) => {
    if (!realtimeData.value[deviceId]) {
      realtimeData.value[deviceId] = []
    }
    
    realtimeData.value[deviceId].push({
      ...data,
      timestamp: new Date().toISOString()
    })
    
    // 只保留最近1000条数据
    if (realtimeData.value[deviceId].length > 1000) {
      realtimeData.value[deviceId].shift()
    }
  }

  // 清除设备实时数据
  const clearRealtimeData = (deviceId) => {
    if (realtimeData.value[deviceId]) {
      realtimeData.value[deviceId] = []
    }
  }

  return {
    devices,
    currentDevice,
    realtimeData,
    updateDevices,
    updateDeviceStatus,
    setCurrentDevice,
    addRealtimeData,
    clearRealtimeData
  }
})

