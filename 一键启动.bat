@echo off
chcp 65001 >nul
title Docker 方式启动项目
color 0A

echo ╔════════════════════════════════════════════╗
echo ║     串口监控系统 - Docker 一键启动        ║
echo ╚════════════════════════════════════════════╝
echo.

:: 检查 Docker Desktop 是否运行
echo [1/3] 检查 Docker 状态...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo [完成] Docker 已运行
echo.

:: 启动所有服务
echo [2/3] 正在构建并启动服务 (可能需要几分钟)...
cd webserial
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [错误] 启动失败
    pause
    exit /b 1
)
echo [完成] 所有服务已启动
echo.

:: 等待服务就绪
echo [3/3] 等待服务就绪...
timeout /t 10 /nobreak >nul

echo.
echo ╔════════════════════════════════════════════╗
echo ║            启动成功！                      ║
echo ╠════════════════════════════════════════════╣
echo ║  访问地址: http://localhost                ║
echo ║  后端 API: http://localhost:8080          ║
echo ║  MongoDB:  localhost:27017                ║
echo ║  MQTT:     localhost:1883                 ║
echo ╚════════════════════════════════════════════╝
echo.
echo [提示] 查看日志: cd webserial ^&^& docker-compose logs -f
echo [提示] 停止服务: 运行"一键停止.bat"
echo.

choice /c YN /t 5 /d Y /m "是否自动打开浏览器？"
if %errorlevel%==1 (
    start http://localhost
)

pause

