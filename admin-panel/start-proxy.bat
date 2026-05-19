@echo off
echo Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL%==0 (
	echo Node found. Starting Node proxy-server.js...
	echo.
	echo ========================================
	echo   CORS Proxy (Node) running on port 3000
	echo ========================================
	echo Frontend: http://localhost:5500
	echo Backend: http://localhost:8081
	echo Proxy: http://localhost:3000
	echo ========================================
	node proxy-server.js
) else (
	echo Node not found. Installing Python dependencies...
	pip install -r requirements.txt
	echo.
	echo Starting CORS Proxy Server (Python)...
	echo.
	echo ========================================
	echo   CORS Proxy (Python) running on port 3000
	echo ========================================
	echo Frontend: http://localhost:5500
	echo Backend: http://localhost:8081
	echo Proxy: http://localhost:3000
	echo ========================================
	python proxy.py
)
