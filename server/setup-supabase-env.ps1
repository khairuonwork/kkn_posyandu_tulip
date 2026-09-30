$ErrorActionPreference = 'Stop'

$securePassword = Read-Host 'Masukkan Database Password Supabase (input disembunyikan)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $encodedPassword = [Uri]::EscapeDataString($plainPassword)
    $databaseUrl = "postgresql://postgres.ptcelfakgdodpvmsurtp:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

    [System.IO.File]::WriteAllText(
        (Join-Path $PSScriptRoot '.env'),
        "DATABASE_URL=$databaseUrl`r`n",
        [System.Text.UTF8Encoding]::new($false)
    )

    Write-Host 'server/.env berhasil dibuat. Kata sandi tidak ditampilkan dan file tidak masuk Git.' -ForegroundColor Green
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $plainPassword = $null
    $encodedPassword = $null
    $databaseUrl = $null
}
