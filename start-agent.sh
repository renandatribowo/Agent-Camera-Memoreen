#!/usr/bin/env bash
# Memoreen DSLR Agent - startup script (Linux / macOS)
#
# Agar agent otomatis berjalan saat komputer kiosk dinyalakan.
# JANGAN lupa set variabel di bawah sesuai environment Anda.
#
# Prasyarat:
#   - Node.js >= 18  (cek: node -v)
#   - gphoto2 sudah diinstall  (cek: gphoto2 --version)
#   - Kamera DSLR terhubung via USB data (bukan charge-only)

set -e

# ── Konfigurasi ─────────────────────────────────────────────────────────────
# Origin aplikasi (WAJIB diisi). Browser kiosk akan memblokir akses ke agent
# kalau origin tidak cocok (CORS). Contoh: https://memoreen.id
export DSLR_AGENT_ALLOWED_ORIGINS="${DSLR_AGENT_ALLOWED_ORIGINS:-https://memoreen.id,https://www.memoreen.id}"

# Bind ke semua interface agar bisa diakses dari perangkat lain di jaringan.
# Ganti ke 127.0.0.1 kalau hanya dipakai dari komputer yang sama.
export DSLR_AGENT_HOST="${DSLR_AGENT_HOST:-0.0.0.0}"

# Port (opsional, default 3100)
export DSLR_AGENT_PORT="${DSLR_AGENT_PORT:-3100}"

# ── Lokasi script agent ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_SCRIPT="${SCRIPT_DIR}/index.mjs"

if [ ! -f "${AGENT_SCRIPT}" ]; then
  echo "[start-agent] ERROR: Tidak menemukan ${AGENT_SCRIPT}" >&2
  exit 1
fi

echo "[start-agent] Memulai DSLR Agent..."
echo "[start-agent]   Host:            ${DSLR_AGENT_HOST}"
echo "[start-agent]   Port:            ${DSLR_AGENT_PORT}"
echo "[start-agent]   Allowed origins: ${DSLR_AGENT_ALLOWED_ORIGINS}"
exec node "${AGENT_SCRIPT}"
