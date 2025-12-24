<template>
  <div class="device-monitor-container">
    <div class="page-header">
      <div>
        <h2>设备监控</h2>
        <p v-if="currentDevice" class="device-info">
          {{ currentDevice.name }} ({{ currentDevice.id }})
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="goBack">
          <el-icon><Back /></el-icon>
          返回
        </el-button>
      </div>
    </div>
    
    <!-- 实时数据卡片 -->
    <div class="data-cards">
      <el-card class="data-card">
        <div class="card-content">
          <div class="card-icon temperature">
            <el-icon :size="32"><Sunny /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-label">温度</div>
            <div class="card-value">{{ latestData.temperature || '--' }}°C</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="data-card">
        <div class="card-content">
          <div class="card-icon humidity">
            <el-icon :size="32"><Water /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-label">湿度</div>
            <div class="card-value">{{ latestData.humidity || '--' }}%</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="data-card">
        <div class="card-content">
          <div class="card-icon status">
            <el-icon :size="32"><Connection /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-label">连接状态</div>
            <div class="card-value">{{ currentDevice?.status === 'online' ? '在线' : '离线' }}</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="data-card">
        <div class="card-content">
          <div class="card-icon update">
            <el-icon :size="32"><Clock /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-label">最后更新</div>
            <div class="card-value-small">{{ formatTime(latestData.timestamp) }}</div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 图表区 -->
    <div class="charts-container">
      <el-card class="chart-card">
        <template #header>
          <div class="chart-header">
            <span>温度趋势</span>
            <el-radio-group v-model="timeRange" size="small" @change="updateCharts">
              <el-radio-button label="1h">1小时</el-radio-button>
              <el-radio-button label="6h">6小时</el-radio-button>
              <el-radio-button label="24h">24小时</el-radio-button>
            </el-radio-group>
          </div>
        </template>
        <v-chart
          ref="temperatureChartRef"
          :option="temperatureOption"
          :autoresize="true"
          class="chart"
        />
      </el-card>
      
      <el-card class="chart-card">
        <template #header>
          <span>湿度趋势</span>
        </template>
        <v-chart
          ref="humidityChartRef"
          :option="humidityOption"
          :autoresize="true"
          class="chart"
        />
      </el-card>
    </div>
    
    <!-- 原始数据表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>实时数据流</span>
          <el-button size="small" @click="clearDataStream">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>
      </template>
      <el-table
        :data="dataStream"
        height="300"
        stripe
        border
      >
        <el-table-column
          prop="timestamp"
          label="时间"
          width="180"
          :formatter="row => formatTime(row.timestamp)"
        />
        <el-table-column
          prop="temperature"
          label="温度(°C)"
          width="120"
        />
        <el-table-column
          prop="humidity"
          label="湿度(%)"
          width="120"
        />
        <el-table-column
          prop="rawData"
          label="原始数据"
          min-width="200"
          show-overflow-tooltip
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useDeviceStore } from '@/store/device'
import websocket from '@/utils/websocket'
import { parseSensorData } from '@/utils/dataParser'
import dayjs from 'dayjs'

// 注册ECharts组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

const deviceId = route.params.id
const currentDevice = computed(() => deviceStore.currentDevice)

// 时间范围
const timeRange = ref('1h')

// 最新数据
const latestData = reactive({
  temperature: null,
  humidity: null,
  timestamp: null
})

// 数据流
const dataStream = ref([])

// 图表数据
const temperatureData = ref([])
const humidityData = ref([])

// 图表引用
const temperatureChartRef = ref(null)
const humidityChartRef = ref(null)

// 温度图表配置
const temperatureOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const data = params[0]
      return `${data.name}<br/>温度: ${data.value}°C`
    }
  },
  grid: {
    left: '50px',
    right: '30px',
    bottom: '30px',
    top: '30px'
  },
  xAxis: {
    type: 'category',
    data: temperatureData.value.map(item => dayjs(item.timestamp).format('HH:mm:ss')),
    boundaryGap: false
  },
  yAxis: {
    type: 'value',
    name: '温度(°C)',
    axisLabel: {
      formatter: '{value}°C'
    }
  },
  series: [
    {
      name: '温度',
      type: 'line',
      data: temperatureData.value.map(item => item.value),
      smooth: true,
      lineStyle: {
        color: '#ff6b6b',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0.05)' }
          ]
        }
      }
    }
  ]
}))

// 湿度图表配置
const humidityOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const data = params[0]
      return `${data.name}<br/>湿度: ${data.value}%`
    }
  },
  grid: {
    left: '50px',
    right: '30px',
    bottom: '30px',
    top: '30px'
  },
  xAxis: {
    type: 'category',
    data: humidityData.value.map(item => dayjs(item.timestamp).format('HH:mm:ss')),
    boundaryGap: false
  },
  yAxis: {
    type: 'value',
    name: '湿度(%)',
    min: 0,
    max: 100,
    axisLabel: {
      formatter: '{value}%'
    }
  },
  series: [
    {
      name: '湿度',
      type: 'line',
      data: humidityData.value.map(item => item.value),
      smooth: true,
      lineStyle: {
        color: '#4ecdc4',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
            { offset: 1, color: 'rgba(78, 205, 196, 0.05)' }
          ]
        }
      }
    }
  ]
}))

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '--'
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

// 更新图表
const updateCharts = () => {
  // 根据时间范围过滤数据
  const now = Date.now()
  let duration = 3600000 // 1小时
  
  if (timeRange.value === '6h') {
    duration = 3600000 * 6
  } else if (timeRange.value === '24h') {
    duration = 3600000 * 24
  }
  
  const filteredData = dataStream.value.filter(item => {
    return now - new Date(item.timestamp).getTime() < duration
  })
  
  temperatureData.value = filteredData
    .filter(item => item.temperature != null)
    .map(item => ({
      timestamp: item.timestamp,
      value: item.temperature
    }))
  
  humidityData.value = filteredData
    .filter(item => item.humidity != null)
    .map(item => ({
      timestamp: item.timestamp,
      value: item.humidity
    }))
}

// 刷新数据
const refreshData = () => {
  updateCharts()
}

// 清空数据流
const clearDataStream = () => {
  dataStream.value = []
  temperatureData.value = []
  humidityData.value = []
  latestData.temperature = null
  latestData.humidity = null
  latestData.timestamp = null
}

// 返回
const goBack = () => {
  router.back()
}

// WebSocket数据接收
const onSensorData = (data) => {
  if (data.deviceId !== deviceId) return
  
  // 解析传感器数据
  const parsed = parseSensorData(data.data)
  
  const newData = {
    timestamp: Date.now(),
    temperature: parsed.temperature || null,
    humidity: parsed.humidity || null,
    rawData: data.data
  }
  
  // 更新最新数据
  if (newData.temperature != null) {
    latestData.temperature = newData.temperature
  }
  if (newData.humidity != null) {
    latestData.humidity = newData.humidity
  }
  latestData.timestamp = newData.timestamp
  
  // 添加到数据流
  dataStream.value.unshift(newData)
  
  // 限制数据流长度
  if (dataStream.value.length > 100) {
    dataStream.value.pop()
  }
  
  // 更新图表
  updateCharts()
}

onMounted(() => {
  // 监听传感器数据
  websocket.on('serial_data', onSensorData)
  websocket.on('sensor_data', onSensorData)
})

onUnmounted(() => {
  websocket.off('serial_data', onSensorData)
  websocket.off('sensor_data', onSensorData)
})
</script>

<style scoped>
.device-monitor-container {
  padding: 20px;
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

.header-actions {
  display: flex;
  gap: 10px;
}

.data-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.data-card {
  cursor: pointer;
  transition: all 0.3s;
}

.data-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-icon.temperature {
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
}

.card-icon.humidity {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
}

.card-icon.status {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.card-icon.update {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.card-value-small {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  min-height: 350px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart {
  width: 100%;
  height: 300px;
}

.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

