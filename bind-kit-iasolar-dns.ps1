param(
  [string]$TunnelName = "kit-iasolar",
  [string]$Hostname = "kit.iasolar.io",
  [string]$Cloudflared = "cloudflared"
)

$ErrorActionPreference = "Stop"

Write-Host "Vinculando DNS $Hostname ao tunel $TunnelName"
& $Cloudflared tunnel route dns -f $TunnelName $Hostname

Write-Host "Validando DNS..."
try {
  nslookup $Hostname
} catch {
  Write-Host "nslookup falhou localmente, mas o registro pode propagar em alguns minutos."
}

Write-Host "Pronto. Se ainda nao abrir, aguarde a propagacao DNS e teste novamente."
