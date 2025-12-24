@echo off
chcp 65001 >nul
title 停止 Docker 服务
color 0C

echo ╔════════════════════════════════════════════╗
echo ║       串口监控系统 - 停止所有服务         ║
echo ╚════════════════════════════════════════════╝
echo.

cd webserial
docker-compose down

echo.
echo [完成] 所有服务已停止
echo.
pause

