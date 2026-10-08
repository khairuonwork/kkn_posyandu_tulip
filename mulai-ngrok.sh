#!/usr/bin/env bash
set -Eeuo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KONFIG="$AKAR/.env.ngrok"
FOLDER_STATUS="$AKAR/.ngrok-run"
SERVER_DIR="$AKAR/server"
CLIENT_DIR="$AKAR/client"
PORT_API="${PORT_API:-4321}"

if [[ ! -f "$SERVER_DIR/.env" ]]; then
  printf 'server/.env belum tersedia. Jalankan server/setup-supabase-env.ps1 lebih dulu.\n' >&2
  exit 1
fi

if [[ ! -f "$KONFIG" ]]; then
  printf 'Konfigurasi pertama kali untuk ngrok. Nilai ini disimpan lokal dan tidak ikut Git.\n'
  read -r -s -p 'Authtoken ngrok: ' NGROK_AUTHTOKEN
  printf '\n'
  while true; do
    read -r -p 'Static domain lengkap ngrok (contoh: abc123.ngrok-free.dev): ' NGROK_DOMAIN
    NGROK_DOMAIN="${NGROK_DOMAIN#https://}"
    NGROK_DOMAIN="${NGROK_DOMAIN#http://}"
    NGROK_DOMAIN="${NGROK_DOMAIN%/}"
    if [[ "$NGROK_DOMAIN" =~ ^[a-zA-Z0-9.-]+\.(ngrok-free\.dev|ngrok-free\.app|ngrok\.app)$ ]]; then
      break
    fi
    printf 'Domain belum lengkap. Salin persis alamat pada menu Gateway > Domains.\n' >&2
  done
  umask 077
  printf 'NGROK_AUTHTOKEN=%s\nNGROK_DOMAIN=%s\n' \
    "$NGROK_AUTHTOKEN" "$NGROK_DOMAIN" >"$KONFIG"
fi

set -a
# shellcheck disable=SC1090
source "$KONFIG"
set +a

NGROK_DOMAIN="${NGROK_DOMAIN#https://}"
NGROK_DOMAIN="${NGROK_DOMAIN#http://}"
NGROK_DOMAIN="${NGROK_DOMAIN%/}"

if [[ -z "${NGROK_AUTHTOKEN:-}" || -z "${NGROK_DOMAIN:-}" ]]; then
  printf 'NGROK_AUTHTOKEN dan NGROK_DOMAIN wajib diisi di .env.ngrok.\n' >&2
  exit 1
fi

if [[ ! "$NGROK_DOMAIN" =~ ^[a-zA-Z0-9.-]+\.(ngrok-free\.dev|ngrok-free\.app|ngrok\.app)$ ]]; then
  printf '\nDomain yang tersimpan bukan static domain lengkap milik akun ngrok.\n'
  printf 'Akun Free mendapat domain seperti abc123.ngrok-free.dev pada menu Gateway > Domains.\n'
  read -r -p 'Masukkan static domain lengkap (tanpa https://): ' NGROK_DOMAIN
  NGROK_DOMAIN="${NGROK_DOMAIN#https://}"
  NGROK_DOMAIN="${NGROK_DOMAIN#http://}"
  NGROK_DOMAIN="${NGROK_DOMAIN%/}"
  if [[ ! "$NGROK_DOMAIN" =~ ^[a-zA-Z0-9.-]+\.(ngrok-free\.dev|ngrok-free\.app|ngrok\.app)$ ]]; then
    printf 'Static domain belum valid. Salin persis domain yang tampil pada dashboard ngrok.\n' >&2
    exit 1
  fi
  umask 077
  printf 'NGROK_AUTHTOKEN=%s\nNGROK_DOMAIN=%s\n' \
    "$NGROK_AUTHTOKEN" "$NGROK_DOMAIN" >"$KONFIG"
fi

for perintah in node npm curl; do
  if ! command -v "$perintah" >/dev/null 2>&1; then
    printf '%s belum terpasang atau belum masuk PATH.\n' "$perintah" >&2
    exit 1
  fi
done

NGROK_BIN="$(command -v ngrok 2>/dev/null || true)"
if [[ -z "$NGROK_BIN" ]] || ! "$NGROK_BIN" version >/dev/null 2>&1; then
  if command -v cygpath >/dev/null 2>&1 && [[ -n "${LOCALAPPDATA:-}" ]]; then
    LOCAL_APP_DATA_UNIX="$(cygpath -u "$LOCALAPPDATA")"
    for kandidat in "$LOCAL_APP_DATA_UNIX"/Microsoft/WinGet/Packages/Ngrok.Ngrok_*/ngrok.exe; do
      if [[ -x "$kandidat" ]] && "$kandidat" version >/dev/null 2>&1; then
        NGROK_BIN="$kandidat"
        break
      fi
    done
  fi
fi

if [[ -z "$NGROK_BIN" ]] || ! "$NGROK_BIN" version >/dev/null 2>&1; then
  printf 'Ngrok agent belum dapat dijalankan. Pasang ngrok resmi lalu buka ulang terminal.\n' >&2
  exit 1
fi

mkdir -p "$FOLDER_STATUS"
if [[ -f "$FOLDER_STATUS/aktif" ]]; then
  printf 'SIMPATIK tampaknya sudah berjalan. Hentikan terminal lama dengan Ctrl+C sebelum memulai lagi.\n' >&2
  exit 1
fi

API_PID=''
NGROK_PID=''

bersihkan() {
  trap - EXIT INT TERM
  [[ -n "$NGROK_PID" ]] && kill "$NGROK_PID" 2>/dev/null || true
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
  rm -f "$FOLDER_STATUS/aktif"
  printf '\nSIMPATIK dan tunnel ngrok telah dihentikan.\n'
}
trap bersihkan EXIT INT TERM

printf 'Memeriksa kecocokan authtoken dan static domain ngrok...\n'
: >"$FOLDER_STATUS/ngrok.log"
: >"$FOLDER_STATUS/ngrok-error.log"
"$NGROK_BIN" http "$PORT_API" \
  --url "https://$NGROK_DOMAIN" \
  --log stdout >"$FOLDER_STATUS/ngrok.log" 2>"$FOLDER_STATUS/ngrok-error.log" &
NGROK_PID=$!

for _ in {1..8}; do
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    if grep -q 'ERR_NGROK_320' "$FOLDER_STATUS/ngrok-error.log" "$FOLDER_STATUS/ngrok.log" 2>/dev/null; then
      rm -f "$KONFIG"
      printf 'Authtoken dan static domain berasal dari akun ngrok yang berbeda.\n' >&2
      printf 'Konfigurasi yang tidak cocok sudah dihapus. Salin authtoken dari akun yang memiliki domain %s, lalu jalankan kembali file BAT.\n' "$NGROK_DOMAIN" >&2
    elif grep -q 'ERR_NGROK_314' "$FOLDER_STATUS/ngrok-error.log" "$FOLDER_STATUS/ngrok.log" 2>/dev/null; then
      rm -f "$KONFIG"
      printf 'Domain tersebut bukan domain gratis yang tersedia untuk akun ngrok ini.\n' >&2
      printf 'Konfigurasi sudah dihapus. Gunakan domain lengkap yang tampil pada menu Gateway > Domains.\n' >&2
    else
      printf 'ngrok gagal saat validasi awal. Periksa .ngrok-run/ngrok-error.log.\n' >&2
    fi
    exit 1
  fi
  sleep 1
done
printf 'Authtoken dan static domain cocok.\n'

printf 'Membangun website SIMPATIK...\n'
VITE_ALAMAT_PUBLIK="https://$NGROK_DOMAIN" npm --prefix "$CLIENT_DIR" run build

printf 'Menyalakan website dan REST API...\n'
(
  cd "$SERVER_DIR"
  HOST=127.0.0.1 PORT="$PORT_API" NODE_ENV=production \
    node --experimental-strip-types --env-file=.env src/http/server.ts
) >"$FOLDER_STATUS/server.log" 2>"$FOLDER_STATUS/server-error.log" &
API_PID=$!

siap_lokal=false
for _ in {1..60}; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    printf 'Server berhenti saat mulai. Periksa .ngrok-run/server-error.log.\n' >&2
    exit 1
  fi
  if curl --fail --silent --max-time 2 "http://127.0.0.1:$PORT_API/api/v1/kesehatan" >/dev/null; then
    siap_lokal=true
    break
  fi
  sleep 1
done

if [[ "$siap_lokal" != true ]]; then
  printf 'Server belum siap setelah 60 detik. Periksa log di .ngrok-run.\n' >&2
  exit 1
fi

printf 'Memeriksa akses publik melalui ngrok...\n'
siap_publik=false
for _ in {1..45}; do
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    printf 'ngrok berhenti saat server mulai. Periksa .ngrok-run/ngrok-error.log.\n' >&2
    exit 1
  fi
  if curl --fail --silent --max-time 3 \
    -H 'ngrok-skip-browser-warning: true' \
    "https://$NGROK_DOMAIN/api/v1/kesehatan" >/dev/null; then
    siap_publik=true
    break
  fi
  sleep 1
done

if [[ "$siap_publik" != true ]]; then
  printf 'Domain ngrok belum dapat menjangkau server. Periksa domain, authtoken, dan log di .ngrok-run.\n' >&2
  exit 1
fi

printf '%s\n' "$API_PID" "$NGROK_PID" >"$FOLDER_STATUS/aktif"
printf '\nSIMPATIK siap digunakan.\n'
printf 'Website : https://%s\n' "$NGROK_DOMAIN"
printf 'REST API: https://%s/api/v1\n' "$NGROK_DOMAIN"
printf 'Biarkan terminal ini tetap terbuka. Tekan Ctrl+C untuk menghentikan semuanya.\n\n'

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$NGROK_PID" 2>/dev/null; do
  sleep 2
done

printf 'Salah satu layanan berhenti. Periksa log di .ngrok-run.\n' >&2
exit 1
