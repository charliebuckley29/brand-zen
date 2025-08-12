@echo off
REM Get Windows LAN IP (first IPv4 starting with 192.168)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr "192.168"') do set IP=%%a
REM Trim spaces
set IP=%IP:~1%

REM Start Vite dev server in WSL
start "" wsl bash -c "cd ~/github-clones/brand-zen/brand-zen && npm run dev"

REM Wait a bit for server to start
timeout /t 5 /nobreak >nul

REM Open default browser to the Vite dev server URL
start "" "http://%IP%:8080"
