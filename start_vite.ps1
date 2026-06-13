$ErrorActionPreference = "Stop"
Set-Location "F:\Tesis\0.1\frontend"
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
npm run dev
