# 串口监控系统 - Serial Monitor System

[English](README.md) | [中文](README.zh.md)

基于ESP32与SpringBoot+Vue的跨平台网页串口通信与设备监控系统

## 📖 项目简介

这是一个现代化的B/S架构远程串口通信与监控系统，采用前后端分离设计。系统通过MQTT协议连接ESP32设备，实现了串口数据的远程收发、设备状态监控、传感器数据可视化和历史数据查询等功能。

### 🎯 主要特性

- ✅ **设备管理**: 设备列表展示、在线/离线状态实时更新
- ✅ **串口助手**: 支持文本/HEX模式、快捷指令、历史记录
- ✅ **实时监控**: WebSocket实时数据推送、传感器数据可视化
- ✅ **历史数据**: 按设备和时间范围查询、数据导出
- ✅ **用户认证**: Token认证、自动保持登录状态
- ✅ **Docker部署**: 一键启动所有服务

## 🏗️ 系统架构

```
┌─────────────┐      MQTT       ┌──────────────┐
│   ESP32     │ ◄─────────────► │   Mosquitto  │
│   设备层    │                 │  MQTT Broker │
└─────────────┘                 └──────┬───────┘
                                       │
                                       │
┌─────────────┐   WebSocket    ┌──────▼────────┐      ┌─────────────┐
│  Vue3 前端  │ ◄─────────────►│  SpringBoot   │◄────►│   MongoDB   │
│  (Nginx)    │   HTTP REST    │    后端服务   │      │   数据库    │
└─────────────┘                └───────────────┘      └─────────────┘
```

## 💻 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite 5.x
- **UI组件**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **数据可视化**: ECharts 5
- **实时通信**: WebSocket

### 后端
- **框架**: Spring Boot 3.x
- **数据库**: MongoDB
- **消息队列**: MQTT (Eclipse Mosquitto)
- **实时通信**: WebSocket + STOMP

### 设备层
- **硬件**: ESP32
- **通信协议**: MQTT
- **传感器**: DHT11/DHT22 (温湿度)

### 部署
- **容器化**: Docker + Docker Compose
- **Web服务器**: Nginx

## 🚀 快速开始

### 方式一：Docker部署（推荐）

#### 前置条件
- 已安装 Docker Desktop
- Windows系统可直接运行 `docker-start.bat`

#### 启动步骤

1. **克隆项目**
```bash
git clone https://github.com/Curry-RJJ/serial-monitor.git
cd serial-monitor
```

2. **一键启动**

**Windows**: 双击 `docker-start.bat`

**Linux/Mac**:
```bash
cd webserial
docker-compose up --build -d
```

3. **访问应用**

打开浏览器访问：http://localhost

默认登录账号：
- 用户名: `admin`
- 密码: `admin123`

#### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 80 | Web界面 |
| 后端 | 8080 | API接口 |
| MongoDB | 27017 | 数据库 |
| MQTT | 1883 | 设备连接 |

### 方式二：本地开发

#### 前置条件
- Node.js >= 16.0.0
- Java >= 17
- Maven >= 3.6
- MongoDB
- Mosquitto MQTT Broker

#### 后端启动

```bash
cd webserial
mvn spring-boot:run
```

#### 前端启动

```bash
npm install
npm run dev
```

## 📁 项目结构

```
serial-monitor/
├── src/                      # 前端源码
│   ├── api/                  # API接口层
│   ├── router/               # 路由配置
│   ├── store/                # 状态管理
│   ├── utils/                # 工具函数
│   └── views/                # 页面组件
├── webserial/                # 后端源码
│   ├── src/main/java/        # Java源码
│   │   └── com/example/webserial/
│   │       ├── controller/   # 控制器
│   │       ├── entity/       # 实体类
│   │       ├── mqtt/         # MQTT服务
│   │       ├── processor/    # 数据处理
│   │       ├── repo/         # 数据仓库
│   │       └── websocket/    # WebSocket
│   ├── src/main/resources/   # 配置文件
│   └── docker-compose.yml    # Docker编排
├── Dockerfile                # 前端Docker镜像
├── docker-start.bat          # Windows一键启动
├── 一键启动.bat              # 备用启动脚本
└── 一键停止.bat              # 停止脚本
```

## 🔌 ESP32设备连接

### 配置示例

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "您的WiFi名称";
const char* password = "您的WiFi密码";
const char* mqtt_server = "服务器IP";  // Docker部署请使用局域网IP
const int mqtt_port = 1883;

void setup() {
  // 连接WiFi
  WiFi.begin(ssid, password);
  
  // 连接MQTT
  client.setServer(mqtt_server, mqtt_port);
}
```

### MQTT主题规范

- **发送数据**: `device/{deviceId}/data`
- **接收指令**: `device/{deviceId}/command`
- **状态上报**: `device/{deviceId}/status`

### 数据格式

**传感器数据**（两种格式任选其一）：
```
键值对格式: T:25.5,H:60.2
JSON格式: {"temperature":25.5,"humidity":60.2}
```

## 📚 API文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/login | 用户登录 |
| POST | /auth/register | 用户注册 |
| GET | /auth/userinfo | 获取用户信息 |
| POST | /auth/logout | 退出登录 |

### 设备接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /device/list | 获取设备列表 |
| GET | /device/:id | 获取设备详情 |
| POST | /device/command | 发送串口指令 |
| GET | /device/history | 获取历史数据 |
| POST | /device/add | 添加设备 |
| PUT | /device/:id | 更新设备信息 |
| DELETE | /device/:id | 删除设备 |

## 🔧 配置说明

### 后端配置 (application.yml)

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/webserialdb

app:
  mqtt:
    broker: tcp://localhost:1883
    clientId: webserial-backend
```

### 前端配置 (vite.config.js)

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
}
```

## 🐛 常见问题

### 1. Docker服务无法启动
```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs frontend
```

### 2. ESP32无法连接MQTT
- 检查IP地址是否正确（使用局域网IP，不是localhost）
- 检查防火墙是否开放1883端口
- 使用 `ipconfig` (Windows) 或 `ifconfig` (Linux/Mac) 查看IP

### 3. WebSocket连接失败
- 检查后端服务是否正常运行
- 检查浏览器控制台错误信息
- 确认WebSocket地址配置正确

### 4. 端口被占用
修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8081:8080"  # 将外部端口改为8081
```

## 📦 部署指南

详细的Docker部署文档请查看：[DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)

## 🎓 项目成员

本项目由6名同学共同完成：
- **设备层 (ESP32)**: 2名
- **后端服务层 (SpringBoot)**: 2名
- **前端展示层 (Vue)**: 2名

## 📄 许可证

本项目为大学生课程设计项目，仅供学习交流使用。

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 联系方式

如有问题，请通过以下方式联系：
- 提交 [Issue](https://github.com/Curry-RJJ/serial-monitor/issues)
- 发送邮件到项目负责人

## ⭐ Star History

如果这个项目对你有帮助，请给我们一个Star！

---

**开发时间**: 2024年
**课程**: 物联网工程课程设计

