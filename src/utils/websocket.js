import { ElMessage } from 'element-plus'
import SockJS from 'sockjs-client/dist/sockjs'
import { Client } from '@stomp/stompjs'

/**
 * WebSocket 客户端 - STOMP + SockJS
 */
class WebSocketClient {
  constructor() {
    this.stompClient = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 3000
    this.listeners = new Map()
    this.subscriptions = []
    this.connected = false
  }

  /**
   * 连接 WebSocket
   */
  connect(token) {
    if (this.connected) {
      console.log('WebSocket 已连接')
      return
    }

    // 开发环境用代理，生产环境用同源
    const isDev = import.meta.env.DEV
    const wsUrl = isDev ? 'http://localhost:8080/ws' : `${window.location.protocol}//${window.location.host}/ws`
    console.log('连接 WebSocket:', wsUrl)

    try {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        debug: (str) => {
          if (str.includes('ERROR')) {
            console.log('STOMP:', str)
        }
        },
        reconnectDelay: this.reconnectInterval,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log('WebSocket 连接成功')
    this.connected = true
    this.reconnectAttempts = 0
    this.emit('connected')

          // 订阅实时数据
          this.stompClient.subscribe('/topic/realtime', (message) => {
            this.onRealtimeMessage(message)
          })

    ElMessage.success('实时连接已建立')
        },
        onStompError: (frame) => {
          console.error('STOMP 错误:', frame)
          this.onError(frame)
        },
        onDisconnect: () => {
          console.log('WebSocket 断开')
          this.connected = false
          this.emit('disconnected')
        },
        onWebSocketClose: () => {
          this.connected = false
        }
      })

      this.stompClient.activate()
    } catch (error) {
      console.error('WebSocket 连接失败:', error)
      this.onError(error)
    }
  }

  /**
   * 处理实时消息
   */
  onRealtimeMessage(message) {
    try {
      // DEBUG: 打印收到的原始消息
      console.log('WS Raw Message:', message.body)
      const data = JSON.parse(message.body)
      
      // 兼容后端新旧字段
      const type = data.type || data.messageType || 'telemetry'
      
      // 1. 设备状态变更消息
      if (type === 'device_status') {
          console.log(`设备状态变更: ${data.deviceId} -> ${data.status}`)
          this.emit('device_status_change', {
              deviceId: data.deviceId,
              status: data.status,
              timestamp: data.timestamp
          })
          return
      }

      // 2. 串口数据消息
      if (type === 'serial_data' || type === 'telemetry' || type === 'sensor_data' || type === 'command' || type === 'status') {
          const rawData = data.data || data.rawData || '' // 兼容
          this.emit('serial_data', {
            deviceId: data.deviceId,
            data: rawData,
            payload: data.payload,
            timestamp: data.timestamp,
            type: data.subType || type
          })
          
          // 如果收到数据，也隐含设备在线 (除非是离线消息，但离线消息应该走 device_status)
          if (data.deviceId) {
            this.emit('device_data_received', {
              deviceId: data.deviceId,
              timestamp: data.timestamp
            })
          }
      }
    } catch (e) {
      console.error('解析消息失败', e)
    }
  }

  /**
   * 订阅设备
   */
  subscribeDevice(deviceId) {
    if (!this.connected || !this.stompClient) return

    const topic = `/topic/device/${deviceId}`
    const subscription = this.stompClient.subscribe(topic, (message) => {
    try {
      const data = JSON.parse(message.body)
      this.emit('serial_data', {
        deviceId: data.deviceId || deviceId,
        data: data.rawData,
        payload: data.payload,
        timestamp: data.timestamp
      })
      } catch (e) {
        console.error('解析设备消息失败:', e)
      }
    })
    
    this.subscriptions.push({ deviceId, subscription })
  }

  /**
   * 取消订阅设备
   */
  unsubscribeDevice(deviceId) {
    const index = this.subscriptions.findIndex(s => s.deviceId === deviceId)
    if (index !== -1) {
      this.subscriptions[index].subscription?.unsubscribe()
      this.subscriptions.splice(index, 1)
    }
  }

  /**
   * 错误处理
   */
  onError(error) {
    console.error('WebSocket 错误:', error)
    this.connected = false
    this.emit('error', error)
    this.emit('disconnected')

        this.reconnectAttempts++
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      ElMessage.warning('实时连接断开，部分功能可能受限')
    }
  }

  /**
   * 发送消息
   */
  send(destination, body) {
    if (!this.connected || !this.stompClient) return

    this.stompClient.publish({
      destination,
      body: JSON.stringify(body)
    })
    }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return
    if (callback) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) callbacks.splice(index, 1)
    } else {
      this.listeners.delete(event)
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return
    this.listeners.get(event).forEach(cb => {
      try { cb(data) } catch (e) { console.error(e) }
    })
  }

  disconnect() {
    this.subscriptions.forEach(sub => sub.subscription?.unsubscribe())
    this.subscriptions = []
    this.stompClient?.deactivate()
    this.stompClient = null
    this.connected = false
    this.listeners.clear()
    this.reconnectAttempts = 0
  }

  isConnected() {
    return this.connected
  }
}

export default new WebSocketClient()
