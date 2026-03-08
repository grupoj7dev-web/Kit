param(
  [string]$Cloudflared = "cloudflared",
  [string]$CertDir = "$env:USERPROFILE\.cloudflared"
)

$ErrorActionPreference = "Stop"
$certPath = Join-Path $CertDir "cert.pem"

if (Test-Path $certPath) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = Join-Path $CertDir ("cert.pre-iasolar-login-" + $stamp + ".pem")
  Copy-Item $certPath $backup -Force
  Write-Host "Backup criado:" $backup
}

Write-Host "Abrindo login do Cloudflare."
Write-Host "No navegador, selecione a zona: iasolar.io"
& $Cloudflared tunnel login

Write-Host "Login finalizado. Proximo passo: rode .\\bind-kit-iasolar-dns.ps1"
