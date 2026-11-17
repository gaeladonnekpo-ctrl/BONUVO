@echo off
setlocal
cd /d "%~dp0"

echo [BONUVO] Verification de la construction locale (.next)...
if not exist ".next\BUILD_ID" (
  echo [BONUVO] Build absent - execution de npm run build...
  call npm run build
  if errorlevel 1 (
    echo [BONUVO] Echec du build.
    pause
    exit /b 1
  )
)

echo [BONUVO] Arret d'un eventuel ancien serveur sur le port 3000...
powershell -NoProfile -Command "$p = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }"

echo [BONUVO] Demarrage permanent du serveur sur http://localhost:3000 ...
echo Fermez cette fenetre uniquement lorsque vous voulez arreter BONUVO.
start "" http://localhost:3000/fr
call npm run start -- --port 3000
