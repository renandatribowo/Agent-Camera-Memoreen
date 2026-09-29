# Memoreen Camera & Print Agent

Agent lokal untuk menghubungkan kamera DSLR dan printer kiosk ke aplikasi Memoreen.

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
PRINT_AGENT_SECRET=rahasia-yang-sama-dengan-server-minimal-24-karakter
```

Nilai dapat diganti melalui environment variable. Contoh:

```bash
DSLR_AGENT_ALLOWED_ORIGINS="https://memoreen.id,https://www.memoreen.id" ./start-agent.sh
```

`PRINT_AGENT_SECRET` wajib sama persis dengan environment variable pada server Next.js.
Gunakan nilai acak minimal 24 karakter dan jangan menaruhnya di pengaturan admin atau browser.
Tanpa secret ini endpoint `/print` akan menolak semua job.

## Printer

- Windows menggunakan driver printer yang sudah terpasang melalui `System.Drawing.Printing`.
- Linux/macOS menggunakan CUPS dan perintah `lp`.
- Nama printer, ukuran kertas, borderless, dan URL agent diatur dari **Admin → Settings → Printer**.
- Kosongkan nama printer untuk menggunakan default printer sistem.
- Lakukan test driver secara langsung dari sistem operasi sebelum menggunakan kiosk.

Agent hanya menerima print job bertanda tangan dari server. Token berlaku 90 detik,
mengikat jumlah copy dan gambar tertentu, serta tidak dapat dipakai ulang pada proses agent yang sama.

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
