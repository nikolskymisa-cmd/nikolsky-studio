$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell -ArgumentList '-NoExit','-Command',"cd `"$root`"; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 5
Start-Process 'http://127.0.0.1:3000/editor'
