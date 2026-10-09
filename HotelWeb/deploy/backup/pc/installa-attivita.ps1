# Prepara il PC a ricevere ogni giorno la copia dei backup di HotelWeb:
#  1. crea (se manca) la chiave SSH dedicata in %USERPROFILE%\.ssh\hotelweb_backup;
#  2. crea l'operazione pianificata "HotelWeb - copia backup" ogni giorno alle 9:00 (se il PC era
#     spento parte appena si accende), solo con la rete disponibile;
#  3. mostra la chiave PUBBLICA da installare sul server (la privata non esce mai dal PC).
# Si puo' rilanciare: non duplica nulla.
param(
  [string]$Ora = "09:00",
  [string]$Cartella = (Join-Path $env:USERPROFILE "Documents\HotelWeb-backup")
)
$ErrorActionPreference = "Stop"
$Chiave = Join-Path $env:USERPROFILE ".ssh\hotelweb_backup"
$Script = Join-Path $PSScriptRoot "copia-sul-pc.ps1"
$keygen = Join-Path $env:WINDIR "System32\OpenSSH\ssh-keygen.exe"

New-Item -ItemType Directory -Force -Path (Split-Path $Chiave) | Out-Null
if (-not (Test-Path $Chiave)) {
  # Senza passphrase: l'operazione pianificata deve funzionare senza nessuno davanti. La chiave pero'
  # sul server puo' solo scaricare l'ultima copia (comando forzato), nient'altro.
  & $keygen -q -t ed25519 -f $Chiave -N '""' -C "hotelweb-backup-$env:COMPUTERNAME"
  if ($LASTEXITCODE -ne 0) { throw "creazione della chiave non riuscita" }
}

# Lo script si copia accanto alle copie: l'operazione non dipende dalla cartella del progetto.
New-Item -ItemType Directory -Force -Path $Cartella | Out-Null
$Destinazione = Join-Path $Cartella "copia-sul-pc.ps1"
Copy-Item -Force $Script $Destinazione

$azione = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Destinazione`" -Cartella `"$Cartella`""
$quando = New-ScheduledTaskTrigger -Daily -At $Ora
$impostazioni = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "HotelWeb - copia backup" -Description "Scarica ogni giorno l'ultimo backup notturno di HotelWeb" -Action $azione -Trigger $quando -Settings $impostazioni -Force | Out-Null

Write-Output "Operazione pianificata pronta: ogni giorno alle $Ora (o appena il PC si accende), copie in $Cartella"
Write-Output "Chiave pubblica da installare sul server:"
Get-Content "$Chiave.pub"
