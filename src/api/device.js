import request from './request'

/**
 * 设备API - 连接真实后端
 */

/**
 * 获取设备列表
 */
export function getDeviceList(params) {
  return request({
    url: '/devices',
    method: 'get',
    params
  })
}

/**
 * 获取设备详情
 */
export function getDeviceDetail(deviceId) {
  return request({
    url: `/devices/${deviceId}`,
    method: 'get'
  })
}

/**
 * 添加设备
 */
export function addDevice(data) {
  return request({
    url: '/devices',
    method: 'post',
    data
  })
}

/**
 * 更新设备信息
 */
export function updateDevice(deviceId, data) {
  return request({
    url: `/devices/${deviceId}`,
    method: 'put',
    data
  })
}

/**
 * 删除设备
 */
export function deleteDevice(deviceId) {
  return request({
    url: `/devices/${deviceId}`,
    method: 'delete'
  })
}

/**
 * 更新设备状态
 */
export function updateDeviceStatus(deviceId, status) {
  return request({
    url: `/devices/${deviceId}/status`,
    method: 'patch',
    data: { status }
  })
}

/**
 * 发送串口指令
 * 后端接口: POST /api/device/{deviceId}/command
 */
export function sendSerialCommand(data) {
  const { deviceId, ...commandData } = data
  return request({
    url: `/device/${deviceId}/command`,
    method: 'post',
    data: commandData
  })
}

/**
 * 配置设备
 * 后端接口: POST /api/device/{deviceId}/config
 */
export function configureDevice(deviceId, config) {
  return request({
    url: `/device/${deviceId}/config`,
    method: 'post',
    data: config
  })
}

/**
 * 获取设备历史数据
 * 后端接口: GET /api/device/{deviceId}/data?from={timestamp}&to={timestamp}
 */
export function getDeviceHistory(params) {
  const { deviceId, startTime, endTime, page = 1, pageSize = 20 } = params
  
  // 将时间字符串转换为时间戳
  const from = startTime ? new Date(startTime).getTime() : 0
  const to = endTime ? new Date(endTime).getTime() : Date.now()
  
  return request({
    url: `/device/${deviceId}/data`,
    method: 'get',
    params: { from, to }
  }).then(response => {
    // 后端直接返回数组，需要包装成前端期望的格式
    const records = Array.isArray(response) ? response : (response.data || [])
    
    // 转换数据格式
    const formattedRecords = records.map((item, index) => ({
      id: item.id || index,
      deviceId: item.deviceId,
      deviceName: item.deviceId, // 将在组件中通过 store 获取真实名称
      dataType: item.messageType || 'sensor',
      value: formatPayload(item.payload),
      rawData: item.rawData,
      timestamp: new Date(item.timestamp).toISOString()
    }))
    
    // 模拟分页
    const startIndex = (page - 1) * pageSize
    const paginatedRecords = formattedRecords.slice(startIndex, startIndex + pageSize)
    
    return {
      code: 200,
      message: 'success',
      data: {
        total: formattedRecords.length,
        page,
        pageSize,
        records: paginatedRecords
      }
    }
  })
}

/**
 * 格式化 payload 为显示字符串
 */
function formatPayload(payload) {
  if (!payload) return '-'
  if (typeof payload === 'string') return payload
  
  // 将对象转换为可读字符串
  const parts = []
  if (payload.TEMP !== undefined) parts.push(`${payload.TEMP}°C`)
  if (payload.temperature !== undefined) parts.push(`${payload.temperature}°C`)
  if (payload.HUM !== undefined) parts.push(`${payload.HUM}%`)
  if (payload.humidity !== undefined) parts.push(`${payload.humidity}%`)
  if (payload.PRESSURE !== undefined) parts.push(`${payload.PRESSURE}hPa`)
  
  return parts.length > 0 ? parts.join(', ') : JSON.stringify(payload)
}

/**
 * 获取设备实时数据 - 从历史数据接口获取最新数据
 */
export function getRealtimeData(deviceId, params) {
  const limit = params?.limit || 100
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  
  return request({
    url: `/device/${deviceId}/data`,
    method: 'get',
    params: { from: oneHourAgo, to: now }
  }).then(response => {
    const records = Array.isArray(response) ? response : (response.data || [])
    // 只返回最新的 limit 条数据
    const latestRecords = records.slice(-limit).map(item => ({
      temperature: item.payload?.TEMP || item.payload?.temperature,
      humidity: item.payload?.HUM || item.payload?.humidity,
      timestamp: new Date(item.timestamp).toISOString()
    }))
    
    return {
      code: 200,
      message: 'success',
      data: latestRecords
    }
  })
}
