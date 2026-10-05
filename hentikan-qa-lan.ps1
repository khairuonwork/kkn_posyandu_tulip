[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$folderStatus = Join-Path $PSScriptRoot '.qa-lan'
$berkasStatus = Join-Path $folderStatus 'status.json'

if (-not (Test-Path -LiteralPath $berkasStatus)) {
    Write-Host 'Mode QA LAN tidak sedang tercatat berjalan.'
    exit 0
}

$status = Get-Content -LiteralPath $berkasStatus -Raw | ConvertFrom-Json

foreach ($nama in @('api', 'web')) {
    $catatan = $status.$nama
    $proses = Get-Process -Id $catatan.id -ErrorAction SilentlyContinue
    if ($null -eq $proses) { continue }

    # ConvertFrom-Json dapat mengubah ISO timestamp menjadi DateTime dengan
    # presisi/kultur yang sedikit berbeda. Toleransi dua detik tetap mencegah
    # proses baru dengan PID daur ulang ikut dihentikan.
    $mulaiTercatat = Get-Date $catatan.mulai
    $selisihDetik = [Math]::Abs(($proses.StartTime - $mulaiTercatat).TotalSeconds)
    if ($selisihDetik -gt 2) {
        throw "PID $($catatan.id) sudah dipakai proses lain; proses itu tidak dihentikan."
    }

    Stop-Process -Id $proses.Id -Force
}

Remove-Item -LiteralPath $berkasStatus
Write-Host 'Mode QA LAN telah dihentikan.' -ForegroundColor Green
