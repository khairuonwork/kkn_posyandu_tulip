[CmdletBinding()]
param(
    [string]$AlamatIp = '',
    [ValidateRange(1024, 65535)]
    [int]$PortApi = 4321,
    [ValidateRange(1024, 65535)]
    [int]$PortWeb = 5173
)

$ErrorActionPreference = 'Stop'
$akar = $PSScriptRoot
$folderStatus = Join-Path $akar '.qa-lan'
$berkasStatus = Join-Path $folderStatus 'status.json'
$serverDir = Join-Path $akar 'server'
$clientDir = Join-Path $akar 'client'

if (-not (Test-Path -LiteralPath (Join-Path $serverDir '.env'))) {
    throw 'server/.env belum tersedia. Jalankan server/setup-supabase-env.ps1 lebih dulu.'
}

if ($AlamatIp -eq '') {
    $calon = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object {
            $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up -and
            $_.NetworkInterfaceType -ne [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback
        } |
        ForEach-Object {
            $properti = $_.GetIPProperties()
            if ($properti.GatewayAddresses.Count -gt 0) {
                $properti.UnicastAddresses |
                    Where-Object {
                        $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                        -not $_.Address.ToString().StartsWith('169.254.')
                    } |
                    ForEach-Object { $_.Address.ToString() }
            }
        } |
        Select-Object -First 1

    if ($null -eq $calon) {
        throw 'IP LAN tidak ditemukan. Jalankan ulang dengan -AlamatIp, misalnya -AlamatIp 192.168.1.20.'
    }

    $AlamatIp = $calon
}

$alamatTerurai = $null
if (-not [System.Net.IPAddress]::TryParse($AlamatIp, [ref]$alamatTerurai)) {
    throw "AlamatIp tidak valid: $AlamatIp"
}

if (Test-Path -LiteralPath $berkasStatus) {
    throw 'Mode QA LAN tampaknya sudah berjalan. Jalankan .\hentikan-qa-lan.ps1 lebih dulu.'
}

New-Item -ItemType Directory -Force -Path $folderStatus | Out-Null
$node = (Get-Command node.exe -ErrorAction Stop).Source
$vite = Join-Path $clientDir 'node_modules\vite\bin\vite.js'
$viteArgumen = 'node_modules/vite/bin/vite.js'
$portWebArgumen = $PortWeb.ToString()

if (-not (Test-Path -LiteralPath $vite)) {
    throw 'Dependensi client belum tersedia. Jalankan npm --prefix client ci.'
}

$hostLama = $env:HOST
$portLama = $env:PORT
$api = $null
$web = $null

try {
    $env:HOST = '0.0.0.0'
    $env:PORT = [string]$PortApi
    $api = Start-Process -FilePath $node `
        -ArgumentList '--experimental-strip-types', '--env-file=.env', 'src/http/server.ts' `
        -WorkingDirectory $serverDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $folderStatus 'api.log') `
        -RedirectStandardError (Join-Path $folderStatus 'api-error.log') `
        -PassThru

    $web = Start-Process -FilePath $node `
        -ArgumentList $viteArgumen, '--host', '0.0.0.0', '--port', $portWebArgumen, '--strictPort' `
        -WorkingDirectory $clientDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $folderStatus 'web.log') `
        -RedirectStandardError (Join-Path $folderStatus 'web-error.log') `
        -PassThru
} finally {
    if ($null -eq $hostLama) {
        Remove-Item Env:HOST -ErrorAction SilentlyContinue
    } else {
        $env:HOST = $hostLama
    }

    if ($null -eq $portLama) {
        Remove-Item Env:PORT -ErrorAction SilentlyContinue
    } else {
        $env:PORT = $portLama
    }
}

# Startup Node/Vite pertama di Windows dapat memerlukan lebih dari 20 detik,
# terutama setelah perpindahan jaringan. Beri waktu cukup sebelum dianggap gagal.
$batas = (Get-Date).AddSeconds(60)
$siap = $false

while ((Get-Date) -lt $batas) {
    if ($api.HasExited -or $web.HasExited) {
        break
    }

    try {
        $kesehatan = Invoke-RestMethod -Uri "http://127.0.0.1:$PortApi/api/v1/kesehatan" -TimeoutSec 2
        $halaman = Invoke-WebRequest -Uri "http://127.0.0.1:$PortWeb" -UseBasicParsing -TimeoutSec 2
        if ($kesehatan.status -eq 'siap' -and $halaman.StatusCode -eq 200) {
            $siap = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 500
    }
}

if (-not $siap) {
    if (-not $api.HasExited) { Stop-Process -Id $api.Id -Force }
    if (-not $web.HasExited) { Stop-Process -Id $web.Id -Force }
    throw "Mode QA LAN gagal menyala. Periksa $folderStatus\api-error.log dan web-error.log."
}

@{
    api = @{ id = $api.Id; mulai = $api.StartTime.ToString('o') }
    web = @{ id = $web.Id; mulai = $web.StartTime.ToString('o') }
    alamatIp = $AlamatIp
    portApi = $PortApi
    portWeb = $PortWeb
} | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $berkasStatus -Encoding UTF8

Write-Host ''
Write-Host 'Mode QA LAN siap.' -ForegroundColor Green
Write-Host "Website PC/tablet : http://${AlamatIp}:$PortWeb"
Write-Host "REST API Android  : http://${AlamatIp}:$PortApi/api/v1"
Write-Host "Auto-Discovery    : Aktif (UDP 43210 & Smart Probe)" -ForegroundColor Cyan
Write-Host "Tes kesehatan     : http://${AlamatIp}:$PortApi/api/v1/kesehatan"
Write-Host 'Untuk berhenti    : .\hentikan-qa-lan.ps1'
Write-Host ''
Write-Host 'Aplikasi tablet Android sekarang dapat otomatis menemukan PC ini di Hotspot/Wi-Fi mana pun tanpa ketik IP manual.' -ForegroundColor Green
