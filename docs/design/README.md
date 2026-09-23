# Sumber desain Portal

| | |
|---|---|
| **Jenis** | Sejarah — prototipe HTML |
| **Status** | beku |
| **Perubahan berarti terakhir** | 21 September 2026 |

Salinan artboard dari project Claude Design `014dc8d1-6c07-42c3-bee3-4ed3963de545`.
Rujukan untuk [bagian 8](../rujukan/layar-demo.md) PRD demo frontend dan
[bagian 2, 3, dan 8](../rujukan/ui-ux.md) UI/UX spec.

Project memuat **sembilan artboard**. Lima sudah disalin ke sini; empat sisanya
sudah dibaca dan isinya terekam di [bagian 13](../rujukan/layar-demo.md) PRD,
tetapi berkasnya belum disalin.

## Yang ada di folder ini

| Berkas | Artboard asal | Peran |
|---|---|---|
| `portal-prototipe.*` | `Portal Posyandu - Prototipe.dc.html` | Prototipe desain berjalan. **Sumber seluruh token warna, tipografi, dan radius.** Memuat tabel LMS WHO dan fungsi `wflClass`/`hazClass`/`wazClass` |
| `portal-layar-desktop-v2.*` | `Portal Posyandu - Layar Desktop v2.dc.html` | Lima layar desktop, **putaran kedua**. Ini yang diikuti PRD bagian 6 |
| `portal-prototipe-v2.*` | `Portal Posyandu - Prototipe v2.dc.html` | Prototipe berjalan **putaran kedua**, ditarik 11 September 2026. **Sumber geometri yang dipakai sekarang**: radius 20/14/10 px, tinggi kontrol 52 px, dasar halaman abu dengan isi di atas kartu putih. Warnanya **tidak** diikuti — lihat [`rujukan/ui-ux.md`](../rujukan/ui-ux.md) bagian 2.7 |
| `portal-layar-kader.*` | `Portal Posyandu - Layar Kader.dc.html` | Lima layar **putaran pertama**, plus Meja Ukur dan alur mobile Mode A |
| `portal-sistem-desain.*` | `Portal Posyandu - Sistem Desain.dc.html` | ⚠️ Sistem desain **aplikasi tablet** — lansia-first, dasar 18 px, radius 12 px, target sentuh 56 px. **Bukan Portal.** Portal memakai 15/17 px, radius 6/8/10 px, target 44 px |

Berkas `.txt` adalah isi teks hasil strip tag, untuk dibaca cepat tanpa membuka HTML.

## Yang belum disalin

| Artboard | Sudah dibaca? | Isinya terekam di |
|---|---|---|
| `Catatan Posyandu - Daftar Temuan.dc.html` | ✅ | PRD bagian 13.3 — 3 tambah, 6 kurangi, 3 putuskan |
| `GrafikKMS.dc.html` | ✅ | PRD bagian 6.5 — spesifikasi kurva lengkap |
| `Panel Ubah A - Drawer.dc.html` | ✅ | PRD bagian 6.4 — geometri tabel Data Anak |
| `Panel Ubah B - Baris.dc.html` | ❌ | belum — pola panel barisnya sendiri sudah ada di `portal-prototipe-v2` dan sudah diterapkan di Data Anak |
| `Panel Ubah C - Modal.dc.html` | ❌ | belum — varian modal tidak dipakai |

Menariknya kapan saja lewat `DesignSync get_file` pada project id di atas.

## Catatan format

Format `.dc.html` adalah kanvas Claude Design: tag `<x-dc>`, `<sc-for>`, `<sc-if>`,
dan `<script type="text/x-dc">`. **Tidak dapat dibuka langsung di browser** tanpa
`support.js` milik kanvas — baca sebagai teks, atau buka artboard-nya di Claude Design.

Project juga memuat `Portal Posyandu - Prototipe (standalone).html`, versi yang
seharusnya bisa dibuka langsung di browser. Belum disalin ke sini.

## Aturan

Bila desain berubah, **artboard di Claude Design yang menang**, bukan salinan ini.
Salinan ini hanya cadangan agar pekerjaan tidak berhenti saat Claude Design tidak
dapat diakses.

Perkecualian: dua penyimpangan pada `portal-prototipe.html` yang
tercatat di [OI-13](../pertanyaan-terbuka.md) — `wflClass()` tanpa cabang Obesitas, dan
nada warna yang tidak cocok dengan sistem desainnya sendiri. Untuk keduanya,
implementasi mengikuti [`rujukan/ui-ux.md`](../rujukan/ui-ux.md) bagian 3.

Perkecualian kedua, **`portal-prototipe-v2.html`**: artboard ini kembali memakai
garis `#DCE0DA` (1,3:1) dan `#A8B0A9` (2,3:1), keduanya di bawah syarat 3:1 untuk
komponen non-teks, serta merah `#B42318` dan tanpa nada biru. Implementasi
mengambil **geometrinya saja** dan menahan warna pada nilai revisi 11 September
(bagian 2.2 dan 2.3). Lihat bagian 2.7 UI/UX spec.
