#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ================= 用户配置区域 =================
const char* ssid = "111111";         // WiFi名称
const char* password = "00000000"; // WiFi密码
const char* mqtt_server = "10.182.87.35";   // 后端服务器IP地址
const int   mqtt_port = 1883;                // MQTT端口
const char* device_id = "device_001"; 

// 【关键修改1】根据你的硬件调整LED引脚和电平逻辑
const int LED_A = 10;   // 替换为你实际的LED引脚（比如板载LED是GPIO2就改2）
const int LED_B = 11;
bool LED_HIGH_ON = true; // 若LED是低电平点亮，改为false

// 默认串口参数
unsigned long serial_baud = 115200;
uint32_t serial_config = SERIAL_8N1;
// ===============================================

WiFiClient espClient;
PubSubClient client(espClient);

String cmd_topic;
String config_topic;
String data_topic;
String status_topic;

unsigned long lastMsg = 0;
String serialBuffer = "";

// 模拟获取温度传感器数据
float generateRandomTemp() {
  return 20.0 + (random(0, 100) / 10.0);
}

// 动态映射校验位等配置
uint32_t getSerialConfig(int dataBits, String parity, float stopBits) {
  if(dataBits == 8 && parity == "None" && stopBits == 1) return SERIAL_8N1;
  if(dataBits == 8 && parity == "Even" && stopBits == 1) return SERIAL_8E1;
  if(dataBits == 8 && parity == "Odd" && stopBits == 1) return SERIAL_8O1;
  return SERIAL_8N1; 
}

// 【新增】LED控制封装函数（适配电平逻辑）
void setLED(int pin, bool on) {
  bool level = (LED_HIGH_ON) ? on : !on;
  digitalWrite(pin, level ? HIGH : LOW);
  Serial.printf("LED(GPIO%d) set to %s (实际输出电平：%s)\n", pin, on ? "ON" : "OFF", level ? "HIGH" : "LOW");
}

// 【新增】去除字符串首尾空白字符（换行、回车、空格等）
String trimString(String str) {
  str.replace("\n", ""); // 去掉换行
  str.replace("\r", ""); // 去掉回车
  str.replace(" ", "");  // 去掉空格
  return str;
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.println("IP address: " + WiFi.localIP().toString());
}

// 处理接收到的MQTT消息（核心修改）
void callback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String rawMsg = "";
  for (unsigned int i = 0; i < length; i++) {
    rawMsg += (char)payload[i];
  }
  
  Serial.print("Received MQTT raw msg: [");
  Serial.print(topicStr);
  Serial.print("] ");
  Serial.println(rawMsg);
  
  // 1. 处理指令主题
  if (topicStr.equals(cmd_topic)) {
    String cmd = "";
    // 尝试解析JSON格式的指令（{"data":"指令"}）
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, rawMsg);
    
    if (!error && doc.containsKey("data")) {
      // 解析JSON成功，提取data字段并去除空白
      cmd = trimString(doc["data"].as<String>());
      Serial.print("Parsed cmd from JSON: ");
      Serial.println(cmd);
    } else {
      // 不是JSON格式，直接用原始消息（兼容纯文本指令）
      cmd = trimString(rawMsg);
      Serial.print("Use raw cmd (non-JSON): ");
      Serial.println(cmd);
    }

    // 【新增】收到任意指令后立即回发 ACK，确保通信链路正常
    String ackMsg = "ACK_RECV: " + cmd;
    client.publish(data_topic.c_str(), ackMsg.c_str());

    // ---------------- LED控制指令 ----------------
    if (cmd.equals("LED_A_ON")) {
        setLED(LED_A, true);
        client.publish(data_topic.c_str(), ("LED_A: ON (GPIO" + String(LED_A) + ")").c_str());
    } 
    else if (cmd.equals("LED_A_OFF")) {
        setLED(LED_A, false);
        client.publish(data_topic.c_str(), ("LED_A: OFF (GPIO" + String(LED_A) + ")").c_str());
    }
    else if (cmd.equals("LED_B_ON")) {
        setLED(LED_B, true);
        client.publish(data_topic.c_str(), ("LED_B: ON (GPIO" + String(LED_B) + ")").c_str());
    }
    else if (cmd.equals("LED_B_OFF")) {
        setLED(LED_B, false);
        client.publish(data_topic.c_str(), ("LED_B: OFF (GPIO" + String(LED_B) + ")").c_str());
    }
    // ---------------- 获取温度指令 ----------------
    else if (cmd.equals("GET_TEMP")) {
        float temp = generateRandomTemp();
        String resp = "Temperature: " + String(temp) + "°C";
        client.publish(data_topic.c_str(), resp.c_str());
        Serial.println("Send temp data: " + resp);
    }
    // ---------------- 清除串口缓冲区指令 ----------------
    else if (cmd.equals("CLEAR_SERIAL_BUFFER")) {
        serialBuffer.clear();
        Serial.flush();
        String resp = "Serial buffer cleared (software + hardware)";
        client.publish(data_topic.c_str(), resp.c_str());
    }
    // ---------------- 原有指令保留 ----------------
    else {
        Serial.print("Forward to serial: ");
        Serial.println(cmd);
        Serial.print(cmd); // 透传给物理串口

        // 【新增】通用指令回显，证明设备已尝试执行
        String execMsg = "CMD_EXEC: " + cmd;
        client.publish(data_topic.c_str(), execMsg.c_str());

        // 【新增】每条透传指令都返回确认信息到 data_topic
        String feedback = "CMD Executed: " + cmd;
        client.publish(data_topic.c_str(), feedback.c_str());
        
        if (cmd.indexOf("PING") >= 0) {
           client.publish(data_topic.c_str(), "System Response: PONG");
        }
        if (cmd.indexOf("TEST_CONNECT") >= 0) {
           String resp = "Connection OK: Device " + String(device_id) + " is online.";
           client.publish(data_topic.c_str(), resp.c_str());
        }
    }
  }
  
  // 2. 处理配置主题
  else if (topicStr.equals(config_topic)) {
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, rawMsg);
    if (!error) {
      if (doc.containsKey("baudRate")) {
        serial_baud = doc["baudRate"];
        Serial.end();
        Serial.begin(serial_baud);
        delay(100);
        String log = "Config Applied: Baud=" + String(serial_baud);
        client.publish(status_topic.c_str(), log.c_str());
      }
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    
    String lwtMsg = "Device Offline: " + String(device_id);
    if (client.connect(clientId.c_str(), NULL, NULL, status_topic.c_str(), 0, false, lwtMsg.c_str(), true)) {
      Serial.println(" connected");
      client.subscribe(cmd_topic.c_str());
      client.subscribe(config_topic.c_str());
      String onlineMsg = "Device Online: " + String(device_id);
      client.publish(status_topic.c_str(), onlineMsg.c_str());
      
      // 上线后自动测试LED
      Serial.println("Test LED...");
      setLED(LED_A, true);
      setLED(LED_B, true);
      delay(500);
      setLED(LED_A, false);
      setLED(LED_B, false);
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(serial_baud);
  while (!Serial); 
  
  pinMode(LED_A, OUTPUT);
  pinMode(LED_B, OUTPUT);
  setLED(LED_A, false);
  setLED(LED_B, false);
  
  cmd_topic = "device/" + String(device_id) + "/serial/cmd";
  config_topic = "device/" + String(device_id) + "/config";
  data_topic = "device/" + String(device_id) + "/serial/raw";
  status_topic = "device/" + String(device_id) + "/serial/status";

  Serial.println("Topic list:");
  Serial.println("CMD: " + cmd_topic);
  Serial.println("CONFIG: " + config_topic);
  
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 读取物理串口数据并上报
  while (Serial.available()) {
    char c = (char)Serial.read();
    serialBuffer += c;
    if (c == '\n' || serialBuffer.length() > 64) {
      if (client.connected()) {
        client.publish(data_topic.c_str(), serialBuffer.c_str());
      }
      serialBuffer = "";
    }
  }
  
  // 超时发送串口数据
  static unsigned long lastSerialTime = 0;
  if (serialBuffer.length() > 0 && millis() - lastSerialTime > 100) {
     if (client.connected()) {
        client.publish(data_topic.c_str(), serialBuffer.c_str());
     }
     serialBuffer = "";
     lastSerialTime = millis();
  } else if (Serial.available()) {
     lastSerialTime = millis();
  }

  // 心跳包 (每10秒发送一次)
  unsigned long now = millis();
  if (now - lastMsg > 10000) {
    lastMsg = now;
    String heartbeat = "HEARTBEAT: Time=" + String(now/1000) + "s";
    client.publish(status_topic.c_str(), heartbeat.c_str());
  }
}