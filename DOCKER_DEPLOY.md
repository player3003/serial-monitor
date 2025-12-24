# Docker 部署指南

## 🐳 Docker 方式部署（推荐）

### 快速启动

**双击运行** `docker-start.bat` 即可！

---

## 📋 手动启动步骤

### 1. 启动所有服务

```bash
cd webserial
docker-compose up --build -d
```

### 2. 查看运行状态

```bash
docker-compose ps
```

应该看到 4 个服务：
- ✅ mosquitto (MQTT Broker)
- ✅ mongo (MongoDB)
- ✅ serial-backend (Spring Boot)
- ✅ serial-frontend (Vue + Nginx)

### 3. 访问应用

打开浏览器访问：**http://localhost**

---

## 📊 服务端口

| 服务 | 内部端口 | 外部端口 | 说明 |
|------|----------|----------|------|
| 前端 | 80 | 80 | Web 界面 |
| 后端 | 8080 | 8080 | API 接口 |
| MongoDB | 27017 | 27017 | 数据库 |
| MQTT | 1883 | 1883 | 设备连接 |

---

## 🔧 常用命令

### 查看日志
```bash
# 所有服务
docker-compose logs -f

# 指定服务
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 重启服务
```bash
# 重启所有
docker-compose restart

# 重启指定服务
docker-compose restart backend
```

### 停止服务
```bash
# 停止（保留数据）
docker-compose stop

# 停止并删除容器（保留数据卷）
docker-compose down

# 停止并删除所有（包括数据）
docker-compose down -v
```

### 重新构建
```bash
# 重新构建镜像
docker-compose build --no-cache

# 重新构建并启动
docker-compose up --build -d
```

---

## 🔌 ESP32 连接配置

### Docker 部署后的连接方式

```cpp
const char* MQTT_SERVER = "您电脑的IP";  // 不是 localhost!
const int MQTT_PORT = 1883;
```

**获取电脑 IP**：
```cmd
ipconfig
```

找到 **以太网适配器** 或 **无线局域网适配器** 的 IPv4 地址。

---

## 📦 优势

### Docker 部署的优点

| 对比项 | 本地部署 | Docker 部署 |
|--------|----------|-------------|
| 环境配置 | 需要安装 Java、Maven、Node.js | 只需要 Docker |
| 依赖管理 | 手动安装 MongoDB、MQTT | 自动管理 |
| 端口冲突 | 可能冲突 | 隔离环境 |
| 启动方式 | 多个终端 | 一键启动 |
| 数据持久化 | 手动备份 | Docker 卷自动管理 |
| 跨平台 | 依赖系统 | 完全一致 |

---

## 🐛 故障排查

### 服务无法启动

```bash
# 查看详细错误
docker-compose logs backend
docker-compose logs frontend
```

### 端口被占用

修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8081:8080"  # 将外部端口改为 8081
```

### 数据库连接失败

```bash
# 检查 MongoDB 健康状态
docker exec mongo mongosh --eval "db.adminCommand('ping')"
```

### 清除所有数据重新开始

```bash
docker-compose down -v
docker-compose up --build -d
```

---

## 📝 注意事项

1. **首次构建**需要下载依赖，大约需要 5-10 分钟
2. **数据持久化**存储在 Docker 卷 `mongo_data` 中
3. **更新代码**后需要重新构建：`docker-compose up --build -d`
4. **硬件设备**连接 MQTT 时使用电脑的局域网 IP，不能用 localhost

