# ADR-0004 — Reuse tabel `teams`/`Membership` sebagai RBAC single-tenant

- **Status:** Accepted
- **Tanggal:** 2026-09-09

## Konteks

Repo ini dimulai dari Laravel React *starter kit* yang membawa sistem *team* multi-tenant lengkap: tabel `teams` dan `team_members`, model `Team` dan `Membership`, enum `TeamRole` dan `TeamPermission`, `TeamPolicy`, undangan anggota lewat email, *middleware* `EnsureTeamMembership`, dan *prefix* URL `{current_team}` pada setiap route.

Portal Posyandu Tulip hanya melayani **satu** Posyandu. Multi-tenancy tidak dibutuhkan.

Godaan yang wajar: hapus semuanya. Tetapi yang akan hilang bukan cuma multi-tenancy — hilang juga peran pengguna, matriks izin, kebijakan otorisasi, undangan anggota, dan sekitar 40 *test* yang sudah hijau. Semua itu harus dibangun ulang untuk kebutuhan yang sama persis: tiga peran dengan hak berbeda.

## Keputusan

**Pertahankan tabel dan model `teams`/`Membership` sebagai fondasi RBAC. Nonaktifkan hanya bagian routing dan antarmuka multi-tenant-nya.**

| Aspek | Keputusan |
|---|---|
| Tabel `teams` | Dipertahankan. Berisi tepat satu baris: `Posyandu Tulip`. |
| Tabel `team_members` | Dipertahankan sebagai roster kader beserta perannya. |
| `TeamRole` | Dipertahankan, diperluas menjadi `Admin`, `Bidan`, `Kader` dengan label bahasa Indonesia. |
| `TeamPolicy`, `TeamPermission` | Dipertahankan apa adanya. |
| *Prefix* URL `{current_team}` | **Dihapus.** URL menjadi `/dashboard`, bukan `/posyandu-tulip/dashboard`. |
| Komponen `TeamSwitcher` | **Disembunyikan.** Tidak ada yang perlu dipilih. |
| Menu Settings → Teams | **Disembunyikan** dari navigasi. Route-nya tetap ada untuk pengelolaan anggota oleh admin. |
| `SetTeamUrlDefaults`, `EnsureTeamMembership` | Dipertahankan untuk route `settings/teams/{team}`. |

## Alasan

Penghapusan total menyentuh sekitar 30 berkas dan mengorbankan kode yang sudah teruji, demi menghilangkan satu tabel berisi satu baris. Penonaktifan routing menyentuh tujuh berkas dan hanya menyentuh hal yang memang terlihat pengguna.

Selain itu, `Membership` sudah merupakan bentuk yang tepat untuk masalah ini: relasi banyak-ke-banyak antara pengguna dan Posyandu, dengan peran pada tabel penghubung. Kalaupun Kelurahan Citeureup nanti ingin menambahkan Posyandu lain, kemampuan itu sudah ada tanpa biaya tambahan.

Yang **tidak** dilakukan adalah menyimpan biaya kosmetiknya: *prefix* URL dan *switcher* dihapus, karena keduanya membingungkan pada sistem yang hanya punya satu Posyandu.

## Pemetaan peran

| `TeamRole` | Label | Hak |
|---|---|---|
| `Admin` | Admin Sistem | Seluruh hak, termasuk kelola akun, peran, periode, dan impor. |
| `Bidan` | Bidan / Koordinator | Kelola master data, koreksi pengukuran, putuskan penggabungan duplikat, lihat seluruh RT, unduh rekap. |
| `Kader` | Kader | Baca data anak dan riwayat, lihat dashboard. Tanpa hak ubah. |

Matriks izin lengkap ada di [03-sdd.md](../03-sdd.md).

## Konsekuensi

- Berkas yang berubah: `routes/web.php`, `app/Http/Responses/Concerns/RedirectsToCurrentTeam.php`, `app/Enums/TeamRole.php`, `resources/js/components/app-sidebar.tsx`, `resources/js/pages/dashboard.tsx`, `resources/js/layouts/settings/layout.tsx`, dan `tests/Feature/DashboardTest.php`.
- Seluruh tabel domain menyimpan `team_id` yang, untuk saat ini, selalu bernilai sama. Kolom itu adalah harga yang dibayar agar dukungan multi-Posyandu tidak memerlukan migrasi data di kemudian hari.
- Istilah "team" tetap muncul di kode *starter kit*. Kode baru memakai istilah domain (`Posyandu`); penamaan lama tidak diubah agar *diff* tetap kecil dan *test* bawaan tetap berlaku.
