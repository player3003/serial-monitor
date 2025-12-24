<template>
  <div class="history-data-container">
    <div class="page-header">
      <h2>历史数据</h2>
    </div>
    
    <!-- 查询表单 -->
    <el-card class="filter-card">
      <el-form :model="queryForm" inline>
        <el-form-item label="设备">
          <el-select
            v-model="queryForm.deviceId"
            placeholder="请选择设备"
            style="width: 200px"
          >
            <el-option
              v-for="device in devices"
              :key="device.id"
              :label="device.name"
              :value="device.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="queryForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 400px"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        height="calc(100vh - 400px)"
      >
        <el-table-column
          prop="deviceName"
          label="设备名称"
          width="150"
        />
        <el-table-column
          prop="timestamp"
          label="时间"
          width="180"
          :formatter="formatTimestamp"
        />
        <el-table-column
          prop="dataType"
          label="数据类型"
          width="120"
        />
        <el-table-column
          prop="value"
          label="数据值"
          min-width="200"
        />
        <el-table-column
          prop="rawData"
          label="原始数据"
          min-width="300"
          show-overflow-tooltip
        />
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleQuery"
          @current-change="handleQuery"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDeviceList, getDeviceHistory } from '@/api/device'
import dayjs from 'dayjs'

const loading = ref(false)
const devices = ref([])
const tableData = ref([])

const queryForm = reactive({
  deviceId: '',
  timeRange: [
    dayjs().subtract(7, 'day').toDate(),
    dayjs().toDate()
  ]
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 获取设备列表
const fetchDevices = async () => {
  try {
    const res = await getDeviceList()
    devices.value = res.data || []
  } catch (error) {
    console.error('获取设备列表失败:', error)
  }
}

// 查询历史数据
const handleQuery = async () => {
  if (!queryForm.deviceId) {
    ElMessage.warning('请选择设备')
    return
  }
  
  loading.value = true
  try {
    const params = {
      deviceId: queryForm.deviceId,
      startTime: queryForm.timeRange ? dayjs(queryForm.timeRange[0]).format('YYYY-MM-DD HH:mm:ss') : null,
      endTime: queryForm.timeRange ? dayjs(queryForm.timeRange[1]).format('YYYY-MM-DD HH:mm:ss') : null,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    
    const res = await getDeviceHistory(params)
    tableData.value = res.data.records || []
    pagination.total = res.data.total || 0
  } catch (error) {
    console.error('查询历史数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 重置查询
const handleReset = () => {
  queryForm.deviceId = ''
  queryForm.timeRange = [
    dayjs().subtract(7, 'day').toDate(),
    dayjs().toDate()
  ]
  pagination.page = 1
  tableData.value = []
  pagination.total = 0
}

// 导出数据
const handleExport = () => {
  if (!queryForm.deviceId) {
    ElMessage.warning('请先选择设备并查询数据')
    return
  }
  
  if (tableData.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  
  // 这里可以实现导出为Excel功能
  ElMessage.info('导出功能开发中')
}

// 格式化时间戳
const formatTimestamp = (row) => {
  return dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  fetchDevices()
})
</script>

<style scoped>
.history-data-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.filter-card {
  margin-bottom: 20px;
}

.data-card {
  min-height: 400px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>

