@echo off
cd /d "D:\Desktop\python\juanpa\frontend"
npm run build
npx serve -s dist -l 3000
pause
