@echo off
cd /d "D:\Desktop\python\juanpa\backend"
call venv\Scripts\activate
set JUANPA_ENVIRONMENT=production
set JUANPA_SECRET_KEY=mi-clave-secreta-personal-123
uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
