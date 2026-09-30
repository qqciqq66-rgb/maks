@echo off
cd /d "%~dp0"
docker compose --profile tunnel down
echo Приложение остановлено.
ping -n 4 127.0.0.1 >nul