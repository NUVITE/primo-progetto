# Copia sul PC dell'ultimo backup notturno di HotelWeb (lo lancia ogni giorno l'operazione
# pianificata creata da installa-attivita.ps1; si puo' lanciare anche a mano).
#
# Si collega al server con la chiave dedicata: quella chiave puo' solo ricevere l'ultima copia,
# nient'altro. Controlla che la copia sia integra (la decomprime e guarda che il dump sia arrivato in
# fondo), tiene le ultime $Tengo copie e scrive tutto in registro.txt nella cartella delle copie.
# Usa solo strumenti gia' presenti in Windows 10/11 (PowerShell e il client SSH di Windows).
param(
  [string]$Cartella = (Join-Path $env:USERPROFILE "Documents\HotelWeb-backup"),
  [string]$Chiave = (Join-Path $env:USERPROFILE ".ssh\hotelweb_backup"),
  [string]$Server = "backupcopia@hotelweb.nuvite.it",
  [int]$Tengo = 30,
  # Solo per il collaudo: prende la copia da questo file invece che dal server.
  [string]$ProvaDaFile = ""
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $Cartella | Out-Null
$Registro = Join-Path $Cartella "registro.txt"
function Scrivi([string]$testo) {
  $riga = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $testo
  Add-Content -Path $Registro -Value $riga -Encoding UTF8
  Write-Output $riga
}

$ssh = Join-Path $env:WINDIR "System32\OpenSSH\ssh.exe"
if (-not (Test-Path $ssh)) { $ssh = "ssh.exe" }
if (-not $ProvaDaFile -and -not (Test-Path $Chiave)) { Scrivi "ERRORE: chiave $Chiave non trovata."; exit 1 }

$nome = "hotelweb-{0}.sql.gz" -f (Get-Date -Format "yyyyMMdd-HHmm")
$file = Join-Path $Cartella $nome
$parziale = "$file.parziale"
try {
  # Redirezione con cmd: l'archivio arriva byte per byte (PowerShell 5 rovinerebbe i dati binari).
  if ($ProvaDaFile) {
    Copy-Item -Force $ProvaDaFile $parziale
  } else {
    $comando = "`"$ssh`" -i `"$Chiave`" -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new $Server > `"$parziale`""
    cmd.exe /c $comando
    if ($LASTEXITCODE -ne 0) { throw "collegamento al server non riuscito (codice $LASTEXITCODE)" }
  }

  $dimensione = (Get-Item $parziale).Length
  if ($dimensione -lt 10000) { throw "copia troppo piccola ($dimensione byte)" }
  # Integrita': si decomprime tutto e l'ultima riga deve essere quella di fine dump.
  $in = [System.IO.File]::OpenRead($parziale)
  try {
    $gz = New-Object System.IO.Compression.GZipStream($in, [System.IO.Compression.CompressionMode]::Decompress)
    $lettore = New-Object System.IO.StreamReader($gz)
    $ultima = ""
    $tabelle = 0
    while ($null -ne ($riga = $lettore.ReadLine())) {
      if ($riga.Length -gt 0) { $ultima = $riga }
      if ($riga.StartsWith("CREATE TABLE")) { $tabelle++ }
    }
  } finally { $in.Dispose() }
  if ($ultima -notmatch "Dump completed") { throw "copia incompleta (manca la fine del dump)" }

  Move-Item -Force $parziale $file
  Scrivi ("OK  {0}  {1:N0} KB, {2} tabelle" -f $nome, ($dimensione / 1KB), $tabelle)

  # Conservazione: le $Tengo copie piu' recenti.
  Get-ChildItem -Path $Cartella -Filter "hotelweb-*.sql.gz" | Sort-Object Name -Descending | Select-Object -Skip $Tengo | Remove-Item -Force
  exit 0
} catch {
  if (Test-Path $parziale) { Remove-Item -Force $parziale }
  Scrivi "ERRORE: $($_.Exception.Message)"
  exit 1
}
