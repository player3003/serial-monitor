# Serial Monitor System

[English](README.md) | [中文](README.zh.md)

A Cross-Platform Web Serial Communication and Device Monitoring System based on ESP32, SpringBoot, and Vue.js

> 基于ESP32与SpringBoot+Vue的跨平台网页串口通信与设备监控系统

---

**For detailed Chinese documentation, please see [README.zh.md](README.zh.md)**

**中文文档请查看 [README.zh.md](README.zh.md)**

---

## 🚀 Quick Start

### Docker Deployment (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/Curry-RJJ/serial-monitor.git
cd serial-monitor
```

2. **Start all services**

**Windows**: Double-click `docker-start.bat`

**Linux/Mac**:
```bash
cd webserial
docker-compose up --build -d
```

3. **Access the application**

Open browser: http://localhost

Default credentials:
- Username: `admin`
- Password: `admin123`

## 📖 Project Overview

This is a modern B/S architecture remote serial communication and monitoring system with frontend-backend separation. The system connects ESP32 devices via MQTT protocol, enabling remote serial data transmission, device status monitoring, sensor data visualization, and historical data queries.

## 🎯 Key Features

- ✅ **Device Management**: Device list, real-time online/offline status
- ✅ **Serial Assistant**: Text/HEX mode, quick commands, history
- ✅ **Real-time Monitoring**: WebSocket push, sensor data visualization
- ✅ **Historical Data**: Query by device and time range, data export
- ✅ **User Authentication**: Token authentication, auto-login
- ✅ **Docker Deployment**: One-click startup for all services

## 🏗️ System Architecture

```
┌─────────────┐      MQTT       ┌──────────────┐
│   ESP32     │ ◄─────────────► │   Mosquitto  │
│   Devices   │                 │  MQTT Broker │
└─────────────┘                 └──────┬───────┘
                                       │
                                       │
┌─────────────┐   WebSocket    ┌──────▼────────┐      ┌─────────────┐
│ Vue3 Frontend│◄─────────────►│  SpringBoot   │◄────►│   MongoDB   │
│   (Nginx)   │   HTTP REST    │    Backend    │      │   Database  │
└─────────────┘                └───────────────┘      └─────────────┘
```

## 💻 Tech Stack

### Frontend
- Vue 3, Vite 5.x, Element Plus, Pinia, Vue Router 4
- ECharts 5, WebSocket, Axios

### Backend
- Spring Boot 3.x, MongoDB, MQTT (Eclipse Mosquitto)
- WebSocket + STOMP

### Device Layer
- ESP32, MQTT Protocol, DHT11/DHT22 Sensors

### Deployment
- Docker + Docker Compose, Nginx

## 📁 Project Structure

```
serial-monitor/
├── src/                      # Frontend source
│   ├── api/                  # API layer
│   ├── router/               # Routing
│   ├── store/                # State management
│   ├── utils/                # Utilities
│   └── views/                # View components
├── webserial/                # Backend source
│   ├── src/main/java/        # Java source
│   │   └── com/example/webserial/
│   │       ├── controller/   # Controllers
│   │       ├── entity/       # Entities
│   │       ├── mqtt/         # MQTT service
│   │       ├── processor/    # Data processor
│   │       ├── repo/         # Repositories
│   │       └── websocket/    # WebSocket
│   ├── src/main/resources/   # Configuration
│   └── docker-compose.yml    # Docker orchestration
├── Dockerfile                # Frontend Docker
├── docker-start.bat          # Windows startup
└── README.md
```

## 🔌 ESP32 Device Connection

### Configuration Example

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "Your_WiFi_SSID";
const char* password = "Your_WiFi_Password";
const char* mqtt_server = "Server_IP";  // Use LAN IP for Docker
const int mqtt_port = 1883;

void setup() {
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, mqtt_port);
}
```

### MQTT Topics

- **Send Data**: `device/{deviceId}/data`
- **Receive Commands**: `device/{deviceId}/command`
- **Status Report**: `device/{deviceId}/status`

### Data Format

**Sensor Data** (choose one):
```
Key-Value: T:25.5,H:60.2
JSON: {"temperature":25.5,"humidity":60.2}
```

## 📚 API Documentation

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | User login |
| POST | /auth/register | User registration |
| GET | /auth/userinfo | Get user info |
| POST | /auth/logout | User logout |

### Device

| Method | Path | Description |
|--------|------|-------------|
| GET | /device/list | Get device list |
| GET | /device/:id | Get device details |
| POST | /device/command | Send serial command |
| GET | /device/history | Get historical data |
| POST | /device/add | Add device |
| PUT | /device/:id | Update device |
| DELETE | /device/:id | Delete device |

## 🔧 Configuration

### Backend (application.yml)

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

### Frontend (vite.config.js)

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

## 🐛 Troubleshooting

### 1. Docker service fails to start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### 2. ESP32 cannot connect to MQTT
- Check IP address (use LAN IP, not localhost)
- Check firewall settings for port 1883
- Use `ipconfig` (Windows) or `ifconfig` (Linux/Mac) to find IP

### 3. WebSocket connection fails
- Check if backend service is running
- Check browser console for errors
- Verify WebSocket address configuration

## 📦 Deployment Guide

For detailed Docker deployment documentation, see: [DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)

## 🎓 Project Team

This project was completed by 6 students:
- **Device Layer (ESP32)**: 2 members
- **Backend (SpringBoot)**: 2 members
- **Frontend (Vue)**: 2 members

## 📄 License

This project is a university course design project for learning and educational purposes only.

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📞 Contact

For questions, please:
- Submit an [Issue](https://github.com/Curry-RJJ/serial-monitor/issues)
- Contact the project maintainer

## ⭐ Star History

If this project helps you, please give us a Star!

---

**Development Year**: 2024  
**Course**: IoT Engineering Course Design

