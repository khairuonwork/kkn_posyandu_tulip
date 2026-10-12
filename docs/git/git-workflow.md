# Git Branching & Development Workflow

Dokumen ini menjelaskan aturan branch, pembagian frontend/backend, alur testing, sampai deployment production untuk project KKN.

## Tujuan

- Mengurangi konflik saat beberapa anggota mengerjakan fitur bersamaan.
- Memisahkan kode yang sedang dikerjakan, yang sedang dites, dan yang sudah production.
- Memastikan frontend dan backend dapat bekerja paralel berdasarkan API contract.
- Menjaga `main` selalu stabil dan siap digunakan.

---

## Branch utama

| Branch | Fungsi | Environment |
|---|---|---|
| `main` | Kode yang sudah stabil dan siap rilis. Tidak boleh commit langsung. | Production |
| `develop` | Tempat seluruh fitur yang telah direview digabungkan dan diuji bersama. | Staging / Testing |

Struktur utama:

```text
main
└── develop
    ├── frontend/feat/*
    ├── backend/feat/*
    ├── feat/*
    ├── fix/*
    ├── chore/*
    └── refactor/*
```

> Tidak memakai `frontend/dev`, `backend/dev`, `merged/testing`, atau `merged/prod` sebagai branch permanen.  
> `develop` sudah menjadi branch integrasi/testing, sedangkan `main` menjadi branch production.

---

## Naming branch

### Frontend

```text
frontend/feat/<nama-fitur>
frontend/fix/<nama-perbaikan>
frontend/chore/<nama-pekerjaan>
frontend/refactor/<nama-perubahan>
```

Contoh:

```text
frontend/feat/data-balita-form
frontend/feat/jadwal-posyandu
frontend/feat/dashboard-kader
frontend/fix/login-validation
frontend/chore/setup-eslint
frontend/refactor/extract-table-component
```

### Backend

```text
backend/feat/<nama-fitur>
backend/fix/<nama-perbaikan>
backend/chore/<nama-pekerjaan>
backend/refactor/<nama-perubahan>
```

Contoh:

```text
backend/feat/data-balita-crud
backend/feat/imunisasi-api
backend/feat/jadwal-posyandu-api
backend/fix/duplicate-data-balita
backend/chore/setup-api-documentation
backend/refactor/auth-service
```

### Full-stack atau perubahan lintas frontend/backend

Gunakan ketika satu orang mengerjakan perubahan kecil yang menyentuh frontend dan backend sekaligus.

```text
feat/<nama-fitur>
fix/<nama-perbaikan>
chore/<nama-pekerjaan>
refactor/<nama-perubahan>
```

Contoh:

```text
feat/dashboard-admin
feat/role-kader
fix/akses-menu-admin
chore/setup-github-actions
refactor/struktur-authentication
```

### Hotfix production

Gunakan hanya untuk bug mendesak yang sudah terjadi di production.

```text
hotfix/<nama-perbaikan>
```

Contoh:

```text
hotfix/login-production-error
hotfix/data-balita-not-saved
```

---

## Aturan dasar branch

1. Jangan commit langsung ke `main` atau `develop`.
2. Semua perubahan harus melalui Pull Request.
3. Semua branch fitur dibuat dari `develop`.
4. Semua branch fitur kembali merge ke `develop`.
5. `develop` hanya merge ke `main` saat siap rilis.
6. Branch fitur dihapus setelah berhasil di-merge.
7. Jangan mengambil perubahan langsung dari branch teman; ambil dari `develop` setelah perubahan tersebut sudah masuk dan direview.
8. Satu branch sebaiknya menangani satu tujuan kecil dan jelas.

---

## Alur umum pengembangan

```text
develop
   ↓
buat branch fitur
   ↓
kerjakan fitur
   ↓
commit dan push
   ↓
Pull Request ke develop
   ↓
review + CI checks
   ↓
merge ke develop
   ↓
testing pada staging
   ↓
Pull Request develop ke main
   ↓
deploy production
```

Visual:

```text
frontend/feat/data-balita-form ─┐
                                │
backend/feat/data-balita-crud ──┼──→ develop ───→ main
                                │       │           │
feat/dashboard-admin ───────────┘    staging    production
```

---

## Use case: developer frontend

### Kondisi

Developer frontend mengerjakan halaman form Data Balita. Endpoint backend belum selesai, tetapi API contract sudah disepakati.

### Branch

```text
frontend/feat/data-balita-form
```

### Alur

```bash
git switch develop
git pull origin develop
git switch -c frontend/feat/data-balita-form
```

Frontend dapat mengerjakan:

- halaman daftar balita;
- form tambah dan edit balita;
- komponen input dan tabel;
- responsive layout;
- loading state;
- error state;
- empty state;
- validasi form untuk pengalaman pengguna;
- mock data sesuai API contract.

Contoh commit:

```bash
git add .
git commit -m "feat: tambah form data balita"
git push -u origin frontend/feat/data-balita-form
```

Setelah selesai, buat Pull Request:

```text
frontend/feat/data-balita-form → develop
```

---

## Use case: developer backend

### Kondisi

Developer backend mengerjakan API CRUD Data Balita.

### Branch

```text
backend/feat/data-balita-crud
```

### Alur

```bash
git switch develop
git pull origin develop
git switch -c backend/feat/data-balita-crud
```

Backend mengerjakan:

- migration database;
- model dan relasi;
- request validation;
- controller atau service;
- endpoint API;
- authentication dan authorization;
- business logic;
- testing API.

Contoh commit:

```bash
git add .
git commit -m "feat: tambah CRUD API data balita"
git push -u origin backend/feat/data-balita-crud
```

Setelah selesai, buat Pull Request:

```text
backend/feat/data-balita-crud → develop
```

---

## Use case: frontend dan backend mengerjakan satu fitur bersamaan

### Contoh fitur

Fitur Data Balita dikerjakan oleh dua orang:

```text
frontend/feat/data-balita-form
backend/feat/data-balita-crud
```

Keduanya tetap dibuat dari `develop` dan masing-masing membuat Pull Request ke `develop`.

```text
develop
├── frontend/feat/data-balita-form
└── backend/feat/data-balita-crud
```

Sebelum mulai, sepakati API contract.

Contoh:

```text
POST /api/balita
GET /api/balita
GET /api/balita/:id
PATCH /api/balita/:id
DELETE /api/balita/:id
```

Contoh request:

```json
{
  "nama": "Aisyah",
  "tanggal_lahir": "2024-01-12",
  "nama_ibu": "Siti"
}
```

Contoh response:

```json
{
  "id": 12,
  "nama": "Aisyah",
  "tanggal_lahir": "2024-01-12",
  "nama_ibu": "Siti"
}
```

Frontend dapat memakai mock data terlebih dahulu. Setelah endpoint backend sudah tersedia di `develop` atau staging, frontend mengganti mock data dengan request ke API asli.

> Frontend dan backend tidak perlu merge ke branch satu sama lain. Keduanya merge ke `develop`.

---

## Use case: satu developer mengerjakan frontend dan backend sekaligus

### Kondisi

Fitur kecil dikerjakan satu orang dari frontend sampai backend.

### Branch

```text
feat/dashboard-admin
```

atau:

```text
feat/role-kader
```

### Alur

```bash
git switch develop
git pull origin develop
git switch -c feat/dashboard-admin
```

Setelah selesai:

```text
feat/dashboard-admin → develop
```

Gunakan pola ini jika perubahan cukup kecil dan tidak perlu dibagi ke dua developer.

---

## Use case: mengambil perubahan terbaru dari develop

Jika ada anggota lain yang sudah merge ke `develop`, update branch sendiri sebelum melanjutkan pekerjaan atau sebelum membuat Pull Request.

```bash
git switch develop
git pull origin develop

git switch frontend/feat/data-balita-form
git merge develop
```

Jika ada conflict, selesaikan conflict pada branch fitur sendiri, lalu commit hasilnya.

```bash
git add .
git commit -m "chore: sync develop into data balita form"
git push
```

> Untuk tim ini, gunakan `merge develop` agar lebih aman dan tidak mengubah riwayat commit yang sudah di-push.

---

## Use case: bug ditemukan di staging

Jika bug ditemukan saat testing di `develop` atau staging, buat branch fix dari `develop`.

```bash
git switch develop
git pull origin develop
git switch -c frontend/fix/data-balita-validation
```

atau:

```bash
git switch develop
git pull origin develop
git switch -c backend/fix/duplicate-data-balita
```

Setelah selesai:

```text
frontend/fix/data-balita-validation → develop
```

---

## Use case: bug mendesak di production

Jika bug sudah masuk production, buat branch hotfix dari `main`.

```bash
git switch main
git pull origin main
git switch -c hotfix/login-production-error
```

Setelah diperbaiki:

```text
hotfix/login-production-error → main
```

Setelah hotfix masuk ke `main`, perubahan tersebut juga harus disinkronkan kembali ke `develop` agar tidak hilang pada rilis berikutnya.

```text
hotfix/login-production-error → main
main → develop
```

---

## Alur release ke production

Saat fitur-fitur di `develop` sudah selesai dan lolos testing:

```text
develop → main
```

Alurnya:

1. Buat Pull Request dari `develop` ke `main`.
2. Jalankan review dan CI checks.
3. Deploy hasil merge `main` ke production.
4. Tambahkan release tag bila diperlukan.

Contoh tag:

```text
v0.1.0
v0.2.0
v1.0.0
```

---

## Pembagian tanggung jawab

### Frontend

Frontend bertanggung jawab atas:

- halaman dan routing UI;
- komponen;
- styling dan responsive design;
- form;
- validasi untuk pengalaman pengguna;
- state di browser;
- loading, error, dan empty state;
- memanggil API;
- menampilkan response API.

Frontend tidak mengubah database, business logic inti, atau API contract tanpa koordinasi.

### Backend

Backend bertanggung jawab atas:

- migration database;
- model dan relasi;
- endpoint API;
- validasi server;
- authentication;
- authorization dan role;
- business logic;
- response API;
- testing backend.

Backend tidak perlu mengubah layout/UI tanpa koordinasi.

---

## Pipeline / CI

Pipeline dijalankan otomatis menggunakan GitHub Actions.

### Pull Request ke develop

Jalankan:

```text
- install dependencies
- lint frontend
- lint backend
- unit test
- API test
- build frontend
- build backend
```

Jika semua lolos, Pull Request boleh direview dan di-merge ke `develop`.

### Merge ke develop

Lakukan:

```text
- deploy ke staging/testing
- QA manual
- integrasi frontend dengan backend
```

### Pull Request atau merge ke main

Jalankan:

```text
- lint
- test
- build
- deploy production
```

---

## Proteksi branch

### main

Aturan yang disarankan:

```text
- tidak boleh push langsung
- wajib Pull Request
- wajib approval minimal 1 orang
- wajib CI checks lulus
- hanya maintainer yang boleh merge
```

### develop

Aturan yang disarankan:

```text
- tidak boleh push langsung
- wajib Pull Request
- wajib CI checks lulus
- minimal review dari 1 anggota tim jika memungkinkan
```

---

## Format commit

Gunakan format berikut:

```text
feat: tambah halaman jadwal posyandu
fix: perbaiki validasi tanggal lahir balita
chore: tambah konfigurasi github actions
refactor: pisahkan service autentikasi
docs: tambah dokumentasi API balita
test: tambah pengujian endpoint imunisasi
```

---

## Ringkasan cepat

```text
Branch fitur baru selalu dibuat dari develop.

frontend/feat/* → develop
backend/feat/*  → develop
feat/*          → develop
fix/*           → develop
chore/*         → develop
refactor/*      → develop

develop → main

hotfix/* dibuat dari main
hotfix/* → main
main → develop
```

```text
develop = integrasi dan staging/testing
main    = production
```
