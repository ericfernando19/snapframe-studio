# SnapFrame

Studio foto online berbasis browser. Pilih tema, tata letak, ambil foto, lalu unduh (PNG/JPG/PDF). Mendukung Live Photo (klip singkat ~3 detik) yang diekspor sebagai MP4/GIF.

## Menjalankan

```bash
npm install
npm run dev
npm run build
```

## Fitur Live Photo

- Toggle Live tersedia di viewfinder kamera (ikon lingkaran). Status disimpan di `localStorage` (`snapframe.settings.v1`, kunci `liveEnabled`).
- Klip diproses sepenuhnya di perangkat; tidak ada data yang dikirim ke server.
- Buffer pra-rana 1,5 detik + pasca-rana 1,5 detik, 15 fps, sisi terpanjang maks. 720 px.
- Ekspor gerak: MP4 (WebCodecs) atau GIF (gifenc). Resolusi: Standar 720 px / HD 1080 px sisi pendek; GIF dibatasi 480 px.

## Dukungan browser

- Prioritas: Chrome/Edge terbaru, Android Chrome.
- Safari iOS dan Firefox: fallback sesuai deteksi dukungan. Bila WebCodecs tidak tersedia, opsi MP4 disembunyikan; tetap bisa GIF atau WebM.
- Live membutuhkan `getUserMedia`, `canvas`, dan `ImageBitmap`.

## Menonaktifkan Live lewat konfigurasi

Set default di `src/state/StudioContext.jsx` (`DEFAULTS.liveEnabled = false`) atau hapus toggle. Untuk mematikan total, set `liveSupported()` di `src/lib/live.js` agar mengembalikan `false`.

## Batas resolusi

- Buffer: 720 px sisi terpanjang.
- Ekspor MP4/WebM: 720 px (Standar) / 1080 px (HD) sisi pendek.
- Ekspor GIF: 480 px sisi pendek.