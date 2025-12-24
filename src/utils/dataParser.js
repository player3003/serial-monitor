/**
 * 数据解析工具
 */

/**
 * 字符串转HEX
 */
export function stringToHex(str) {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    hex += code.toString(16).padStart(2, '0').toUpperCase() + ' '
  }
  return hex.trim()
}

/**
 * HEX转字符串
 */
export function hexToString(hex) {
  const hexArray = hex.replace(/\s/g, '').match(/.{1,2}/g) || []
  let str = ''
  for (let i = 0; i < hexArray.length; i++) {
    str += String.fromCharCode(parseInt(hexArray[i], 16))
  }
  return str
}

/**
 * 验证HEX格式
 */
export function isValidHex(hex) {
  const pattern = /^([0-9A-Fa-f]{2}\s*)+$/
  return pattern.test(hex.trim())
}

/**
 * 格式化HEX字符串（每两个字符添加空格）
 */
export function formatHex(hex) {
  const cleanHex = hex.replace(/\s/g, '')
  return cleanHex.match(/.{1,2}/g)?.join(' ').toUpperCase() || ''
}

/**
 * 解析传感器数据（示例：温湿度传感器）
 * 假设数据格式：T:25.5,H:60.2
 */
export function parseSensorData(data) {
  const result = {}
  
  // 尝试解析温湿度数据
  const tempMatch = data.match(/T[:\s]*(-?\d+\.?\d*)/)
  const humidityMatch = data.match(/H[:\s]*(-?\d+\.?\d*)/)
  
  if (tempMatch) {
    result.temperature = parseFloat(tempMatch[1])
  }
  
  if (humidityMatch) {
    result.humidity = parseFloat(humidityMatch[1])
  }
  
  // 尝试解析JSON格式
  if (data.trim().startsWith('{')) {
    try {
      const jsonData = JSON.parse(data)
      Object.assign(result, jsonData)
    } catch (e) {
      // JSON解析失败，忽略
    }
  }
  
  return result
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const Y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const D = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

