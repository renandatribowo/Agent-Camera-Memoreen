# Memoreen Camera Agent

Agent lokal untuk menghubungkan kamera DSLR ke aplikasi Memoreen melalui USB dan `gphoto2`.

## Prasyarat

- Node.js 18 atau lebih baru
- `gphoto2` terpasang dan bisa dijalankan dari terminal
- Kamera terhubung dengan kabel USB data
- Live View kamera dimatikan saat proses capture dimulai

## Instalasi

Download semua file di repository ini ke satu folder, misalnya `memoreen-dslr-agent`.

### macOS / Linux

```bash
chmod +x start-agent.sh
./start-agent.sh
```

### Windows

Jalankan `start-agent.bat` dari Command Prompt.

## Konfigurasi

Launcher menggunakan konfigurasi berikut secara default:

```text
DSLR_AGENT_HOST=0.0.0.0
DSLR_AGENT_PORT=3100
DSLR_AGENT_ALLOWED_ORIGINS=https://memoreen.id,https://www.memoreen.id
```

Nilai dapat diganti melalui environment variable. Contoh:

```bash
DSLR_AGENT_ALLOWED_ORIGINS="https://memoreen.id,https://www.memoreen.id" ./start-agent.sh
```

Jika agent dijalankan dari komputer terpisah, pastikan firewall mengizinkan port `3100` dan gunakan alamat IP komputer agent pada pengaturan kamera Memoreen.

## Verifikasi

Buka endpoint berikut dari komputer yang menjalankan agent:

```text
http://localhost:3100/health
```

Agent menyediakan endpoint capture, live view, dan recording yang dipakai oleh aplikasi Memoreen.

## Auto-start

Gunakan `start-agent.sh` atau `start-agent.bat` sebagai program yang dijalankan saat komputer kiosk menyala. Pastikan working directory mengarah ke folder tempat file agent disimpan.

## Catatan kamera

Capture diarahkan ke internal RAM kamera melalui `gphoto2`. Kamera tetap harus mendukung mode capture tanpa memory card; dukungan ini bergantung pada model dan firmware kamera.
