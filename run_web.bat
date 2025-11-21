@echo off
echo Uruchamianie serwera gry...
echo Gra otworzy sie w przegladarce pod adresem http://127.0.0.1:8080
start "" "http://127.0.0.1:8080"
call npm run dev
pause
