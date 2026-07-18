@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo No se encontro Python. Abra la carpeta con Visual Studio Code y use Live Server.
  pause
  exit /b 1
)
start "" "http://localhost:5500/sistema_coleo.html"
python -m http.server 5500
