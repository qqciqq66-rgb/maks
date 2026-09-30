@echo off
cd /d "%~dp0"
echo Запускаю приложение "Решено"...

docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo Docker Desktop не запущен. Откройте Docker Desktop, дождитесь статуса "Engine running"
  echo и запустите этот файл ещё раз.
  pause
  exit /b 1
)

docker compose --profile tunnel up --build -d
if errorlevel 1 (
  echo.
  echo Не удалось запустить приложение. Текст ошибки выше.
  pause
  exit /b 1
)

echo Жду, пока приложение загрузится...
ping -n 4 127.0.0.1 >nul
start "" http://localhost:8080
echo Готово: http://localhost:8080
echo Остановить приложение: файл "Остановить.bat"
ping -n 6 127.0.0.1 >nul