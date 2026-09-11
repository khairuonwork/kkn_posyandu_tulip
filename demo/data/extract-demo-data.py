#!/usr/bin/env python3
"""Ekstrak arsip Posyandu Tulip 2026 menjadi posyandu.json untuk demo frontend.

Nama dan NIK diganti; tanggal lahir, RT, jenis kelamin, dan seluruh nilai ukur
dipertahankan apa adanya supaya z-score-nya tetap cocok dengan arsip Excel yang
berjalan. Lihat docs/10-prd-demo-frontend.md bagian 5.

Berkas Excel sumber berada di luar repo. Skrip ini hanya dijalankan ulang bila
arsipnya bertambah, dan hasilnya deterministik: dua kali jalan menghasilkan
berkas yang identik.

Pakai:
    python demo/data/extract-demo-data.py <folder arsip> [master z-score.xlsx]

Argumen kedua opsional. Bila diberikan, z-score tiap anak dibandingkan dengan
master milik pemilik program:

    python demo/data/extract-demo-data.py "E:/TUGAS KULIAH/KKN/REKAP TAHUN 2026" \
        "E:/TUGAS KULIAH/KKN/Excel ibu Sri/6_JUNI 2026_MASTER Z SCORE.xlsx"

Hanya memakai pustaka standar Python — tidak perlu openpyxl/pandas.
"""

import html
import json
import math
import random
import re
import sys
import zipfile
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

# --------------------------------------------------------------------------
# Sumber
# --------------------------------------------------------------------------

# Nama berkas -> (id periode, label). Periode diambil dari nama berkas, bukan
# dari nama sheet: sheet Februari tertulis "FABRUARI_2026" di sumbernya.
BERKAS = [
    ("JANUARO_2026.XLSX", "2026-01", "Januari 2026"),
    ("FEBRUARI_2026_HASIL.xlsx", "2026-02", "Februari 2026"),
    ("MARET_2026_HASIL.xlsx", "2026-03", "Maret 2026"),
    ("APRIL_2026_HASIL.xlsx", "2026-04", "April 2026"),
    ("MEI_HASIL_EKSTRAK.xlsx", "2026-05", "Mei 2026"),
    ("REKAP JUNI 2026.xlsx", "2026-06", "Juni 2026"),
]

# Susunan 22 kolom format 2026, docs/06-migrasi-data.md bagian 4.1.
KOLOM = {
    "B": "nik",
    "C": "nama",
    "D": "anak_ke",
    "E": "bb_lahir",
    "F": "pb_lahir",
    "G": "buku_kia",
    "H": "imd",
    "I": "tgl_lahir",
    "J": "jk",
    "K": "nama_ortu",
    "L": "nik_ortu",
    "M": "rt",
    "N": "rw",
    "O": "tanggal_ukur",
    "P": "bb",
    "Q": "tinggi",
    "R": "ntob",
    "S": "lila",
    "T": "lika",
}

HEADER = [
    "NO", "NIK", "NAMA ANAK", "ANAK KE", "BB LHR", "PB LHR", "BUKUKIA", "IMD",
    "TGL LAHIR", "JK", "NAMA ORTU", "NIK ORTU", "RT", "RW", "TANGGAL UKUR",
    "BB", "TB", "NTOB", "LILA", "LIKA", "UMUR LENGKAP", "UMUR HARI",
]

RW = "18"
VERSI_STANDAR = "WHO-2006"

# Excel menghitung hari sejak 1899-12-30, termasuk bug tahun kabisat 1900.
EPOCH_EXCEL = date(1899, 12, 30)

# --------------------------------------------------------------------------
# Pembacaan xlsx dengan pustaka standar
# --------------------------------------------------------------------------

RE_SI = re.compile(r"<si>(.*?)</si>", re.S)
RE_T = re.compile(r"<t[^>]*>(.*?)</t>", re.S)
RE_ROW = re.compile(r'<row r="(\d+)"[^>]*?(?:/>|>(.*?)</row>)', re.S)
RE_CELL = re.compile(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
RE_V = re.compile(r"<v>(.*?)</v>", re.S)
RE_IS = re.compile(r"<is>.*?<t[^>]*>(.*?)</t>", re.S)


def baca_sheet(zf: "zipfile.ZipFile", sheet: str) -> list[dict[str, str]]:
    """Baris satu sheet sebagai peta kolom -> nilai teks yang sudah di-trim.

    Sel kosong tidak muncul sebagai kunci sama sekali, sehingga "tidak ada
    nilai" tidak pernah tertukar dengan nol.
    """
    bersama = [
        html.unescape("".join(RE_T.findall(si)))
        for si in RE_SI.findall(
            zf.read("xl/sharedStrings.xml").decode("utf8", "ignore")
        )
    ]
    xml = zf.read(f"xl/{sheet}").decode("utf8", "ignore")

    baris = []

    for m in RE_ROW.finditer(xml):
        sel = {}

        for c in RE_CELL.finditer(m.group(2) or ""):
            kolom, atribut, isi = c.groups()
            v = RE_V.search(isi or "") or RE_IS.search(isi or "")

            if v is None:
                continue

            nilai = html.unescape(v.group(1))

            # Seluruh nilai teks di-trim: kolom NTOB berisi " N" berspasi.
            if 't="s"' in atribut:
                nilai = bersama[int(nilai)]

            nilai = nilai.strip()

            if nilai != "":
                sel[kolom] = nilai

        baris.append(sel)

    return baris


def baca_baris(berkas: Path) -> list[dict[str, str]]:
    """Baris data satu berkas arsip, setelah susunan kolomnya diperiksa."""
    baris = baca_sheet(zipfile.ZipFile(berkas), "worksheets/sheet1.xml")

    # Spasi diabaikan saat membandingkan: berkas Mei menulis "BUKU KIA",
    # lima berkas lainnya "BUKUKIA". Kolomnya sama, ejaannya saja yang beda.
    header = [
        baris[0].get(chr(65 + i), "").replace(" ", "") for i in range(len(HEADER))
    ]

    if header != [h.replace(" ", "") for h in HEADER]:
        raise ValueError(
            f"Susunan kolom {berkas.name} tidak seperti format 2026: {header}"
        )

    return [sel for sel in baris[1:] if sel]


# --------------------------------------------------------------------------
# Normalisasi — docs/06-migrasi-data.md bagian 5
# --------------------------------------------------------------------------

# Empat ejaan "pindah" muncul di kolom berat: PINDAH RUMAH, PINDAH, Pindah,
# dan P I N D A H.
RE_PINDAH = re.compile(r"^p\s*i\s*n\s*d\s*a\s*h", re.I)
RE_ISO = re.compile(r"\d{4}-\d{2}-\d{2}")


def angka(nilai: str | None) -> float | None:
    """Nilai ukur yang bukan angka tidak pernah menjadi nol (DR-04)."""
    if nilai is None:
        return None

    try:
        return float(nilai)
    except ValueError:
        return None


def tanggal(nilai: str | None) -> date | None:
    """Dua bentuk hidup berdampingan di arsip 2026 dan keduanya harus ditangani.

    Berkas Juni memakai string ISO; lima berkas lainnya memakai serial Excel,
    meskipun docs/06-migrasi-data.md bagian 5.1 menduga hanya arsip 2025 yang
    berbentuk serial.
    """
    if nilai is None:
        return None

    if RE_ISO.fullmatch(nilai):
        return date.fromisoformat(nilai)

    serial = angka(nilai)

    if serial is None:
        return None

    return EPOCH_EXCEL + timedelta(days=int(serial))


def umur_bulan(lahir: date, ukur: date) -> int:
    """Umur bulan penuh. Kolom UMUR LENGKAP di sumber diabaikan (DR-03).

    Dihitung eksplisit, sama seperti Anak::umurBulanPada di sisi PHP.
    """
    bulan = (ukur.year - lahir.year) * 12 + (ukur.month - lahir.month)

    if ukur.day < lahir.day:
        bulan -= 1

    return bulan


# --------------------------------------------------------------------------
# Antropometri — porting app/Support/Antropometri, bukan rumus yang ditulis ulang
# --------------------------------------------------------------------------

EPSILON_L = 1e-7

INDEKS = ["BB_U", "TB_U", "BB_TB", "IMT_U", "LILA_U", "LIKA_U"]

# TB/U dan LIKA/U berdistribusi mendekati normal sehingga tidak dikoreksi.
PAKAI_KOREKSI = {"BB_U", "BB_TB", "IMT_U", "LILA_U"}

BATAS_WAJAR = {
    "BB_U": (-6.0, 5.0),
    "TB_U": (-6.0, 6.0),
    "BB_TB": (-5.0, 5.0),
    "IMT_U": (-5.0, 5.0),
    "LILA_U": (-5.0, 5.0),
    "LIKA_U": (-5.0, 5.0),
}

# LILA/U dibatasi sejak 6 bulan mengikuti PMK 2/2020 dan praktik pelaporan
# Posyandu Tulip; master Juni 2026 menandai anak di bawahnya USIA <6BLN.
UMUR_MINIMUM = {"LILA_U": 6}


def bulat(x: float, digit: int) -> float:
    """PHP round() membulatkan setengah menjauhi nol, round() Python ke genap."""
    faktor = 10**digit

    return math.copysign(math.floor(abs(x) * faktor + 0.5) / faktor, x)


def muat_standar(berkas: Path) -> dict[tuple[str, str], list[tuple[float, ...]]]:
    """Tabel LMS -> daftar (kunci, l, m, s) terurut menaik per indeks dan JK."""
    isi = json.loads(berkas.read_text(encoding="utf8"))
    tabel: dict[tuple[str, str], list[tuple[float, ...]]] = {}

    for b in isi["baris"]:
        tabel.setdefault((b["indeks"], b["jk"]), []).append(
            (b["kunci"], b["l"], b["m"], b["s"])
        )

    for kunci in tabel:
        tabel[kunci].sort()

    return tabel


def cari_lms(tabel, indeks: str, jk: str, kunci: float) -> tuple[float, float, float] | None:
    """Indeks berkunci umur dibaca per bulan penuh; berkunci tinggi diinterpolasi.

    Tabel WHO memang per bulan penuh, sedangkan tabel berkunci panjang atau
    tinggi badan berlangkah 0,5 cm sementara nilai ukur bisa jatuh di antaranya.
    Kunci di luar rentang tabel mengembalikan None — tidak pernah diekstrapolasi.
    """
    baris = tabel.get((indeks, jk))

    if not baris:
        return None

    if indeks != "BB_TB":
        umur = float(int(kunci))

        return next(((l, m, s) for k, l, m, s in baris if k == umur), None)

    if kunci < baris[0][0] or kunci > baris[-1][0]:
        return None

    for i, (k, l, m, s) in enumerate(baris):
        if k == kunci:
            return (l, m, s)

        if k > kunci:
            k0, l0, m0, s0 = baris[i - 1]
            bobot = (kunci - k0) / (k - k0)

            return (
                l0 + (l - l0) * bobot,
                m0 + (m - m0) * bobot,
                s0 + (s - s0) * bobot,
            )

    return None


def z_dari_lms(l: float, m: float, s: float, nilai: float) -> float | None:
    """Z = ((X/M)^L - 1) / (L*S), atau ln(X/M)/S ketika L mendekati nol."""
    if m <= 0 or s <= 0:
        return None

    if abs(l) < EPSILON_L:
        return math.log(nilai / m) / s

    return (((nilai / m) ** l) - 1) / (l * s)


def nilai_pada_z(l: float, m: float, s: float, z: float) -> float:
    """Nilai ukur yang setara dengan z-score tertentu pada kurva ini."""
    if abs(l) < EPSILON_L:
        return m * math.exp(s * z)

    return m * ((1 + l * s * z) ** (1 / l))


def koreksi_ekstrem(l: float, m: float, s: float, nilai: float, z: float) -> float:
    """Ekstrapolasi linear WHO di luar 3 SD.

    Distribusi LMS menjadi tidak stabil di ekor, justru pada rentang tempat
    kasus gizi buruk dan obesitas berada. Karena itu koreksi ini tidak boleh
    disederhanakan.
    """
    if z > 3:
        sd3 = nilai_pada_z(l, m, s, 3)
        sd2 = nilai_pada_z(l, m, s, 2)

        return z if sd3 == sd2 else 3 + (nilai - sd3) / (sd3 - sd2)

    sd3 = nilai_pada_z(l, m, s, -3)
    sd2 = nilai_pada_z(l, m, s, -2)

    return z if sd2 == sd3 else -3 + (nilai - sd3) / (sd2 - sd3)


def hitung_z(tabel, indeks: str, jk: str, kunci: float, nilai: float) -> float | None:
    """Mengembalikan None bila tidak dapat dihitung.

    Status gizi yang salah lebih berbahaya daripada yang kosong.
    """
    if nilai <= 0:
        return None

    lms = cari_lms(tabel, indeks, jk, kunci)

    if lms is None:
        return None

    z = z_dari_lms(*lms, nilai)

    if z is None:
        return None

    if indeks in PAKAI_KOREKSI and abs(z) > 3:
        z = koreksi_ekstrem(*lms, nilai, z)

    return z


def kategori(indeks: str, z: float) -> str | None:
    """Ambang PMK No. 2 Tahun 2020, sesuai docs/05-uiux-spec.md bagian 3.

    Mengembalikan None untuk LILA/U: labelnya belum dikonfirmasi (OI-04).
    Cabang Obesitas ada di sini, tidak seperti wflClass() pada prototipe desain
    (OI-13).
    """
    if indeks == "BB_U":
        if z < -3:
            return "Berat badan sangat kurang"

        if z < -2:
            return "Berat badan kurang"

        return "Berat badan normal" if z <= 1 else "Risiko berat badan lebih"

    if indeks == "TB_U":
        if z < -3:
            return "Sangat pendek"

        if z < -2:
            return "Pendek"

        return "Normal" if z <= 3 else "Tinggi"

    if indeks in ("BB_TB", "IMT_U"):
        if z < -3:
            return "Gizi buruk"

        if z < -2:
            return "Gizi kurang"

        if z <= 1:
            return "Gizi baik"

        if z <= 2:
            return "Berisiko gizi lebih"

        return "Gizi lebih" if z <= 3 else "Obesitas"

    if indeks == "LIKA_U":
        if z < -2:
            return "Mikrosefali"

        return "Normal" if z <= 2 else "Makrosefali"

    return None


def penilaian_gizi(tabel, jk: str, umur: int, ukur: dict) -> dict[str, dict]:
    """Enam indeks untuk satu pengukuran.

    Indeks yang tidak dapat dihitung tidak menghasilkan kunci sama sekali —
    ketiadaan kunci berarti "tidak dapat dihitung", bukan nol.
    """
    bb = ukur["bbKg"]
    tinggi = ukur["tinggiCm"]
    imt = bb / ((tinggi / 100) ** 2) if bb is not None and tinggi else None

    masukan = {
        "BB_U": (umur, bb),
        "TB_U": (umur, tinggi),
        "BB_TB": (tinggi, bb),
        "IMT_U": (umur, imt),
        "LILA_U": (umur, ukur["lilaCm"]),
        "LIKA_U": (umur, ukur["likaCm"]),
    }

    hasil = {}

    for indeks in INDEKS:
        kunci, nilai = masukan[indeks]

        if kunci is None or nilai is None or umur < UMUR_MINIMUM.get(indeks, 0):
            continue

        z = hitung_z(tabel, indeks, jk, float(kunci), nilai)

        if z is None:
            continue

        bawah, atas = BATAS_WAJAR[indeks]
        hasil[indeks] = {
            "z": bulat(z, 3),
            "kategori": kategori(indeks, z),
            "tidakWajar": z < bawah or z > atas,
        }

    return hasil


# --------------------------------------------------------------------------
# Anonimisasi — docs/10-prd-demo-frontend.md bagian 5.2
# --------------------------------------------------------------------------

DEPAN_ANAK = [
    "Adzkia", "Alesha", "Alfath", "Almira", "Arkana", "Athaya", "Azzam",
    "Bilqis", "Danish", "Elvano", "Faiza", "Gibran", "Hafiza", "Ibrahim",
    "Jauza", "Kayla", "Kenzie", "Lubna", "Mikail", "Nadhira", "Naura",
    "Prabu", "Qonita", "Raisa", "Sakhi", "Syafiq", "Talita", "Umar",
    "Vania", "Wildan", "Yasmin", "Zahra",
]

BELAKANG_ANAK = [
    "Adinata", "Alfarizi", "Anggraeni", "Bramantyo", "Cahyani", "Dirgantara",
    "Fitriani", "Gunawan", "Habibie", "Kusuma", "Lestari", "Mahendra",
    "Maheswara", "Nugroho", "Nurhaliza", "Permana", "Pratama", "Purnama",
    "Ramadhan", "Saputra", "Setiawan", "Suryani", "Wibowo", "Widodo",
    "Yudhistira", "Zulaikha",
]

DEPAN_ORTU = [
    "Ai", "Ani", "Asep", "Cucu", "Dadang", "Dedeh", "Deni", "Elis", "Endang",
    "Enung", "Euis", "Ika", "Iis", "Imas", "Iwan", "Lilis", "Neneng", "Nia",
    "Nunung", "Popon", "Rina", "Rudi", "Siti", "Tati", "Teti", "Ujang",
    "Wati", "Wawan", "Yani", "Yuyun",
]

BELAKANG_ORTU = [
    "Firmansyah", "Herawati", "Hermawan", "Hidayat", "Juanda", "Komalasari",
    "Kurniasih", "Kurniawan", "Maryati", "Mulyadi", "Nugraha", "Nurjanah",
    "Rahayu", "Ramdani", "Rohaeti", "Rohman", "Rosmiati", "Saefudin",
    "Sopandi", "Suherman", "Sumiati", "Susilawati", "Sutisna", "Wulandari",
]


def kolam_nama(depan: list[str], belakang: list[str], jumlah: int) -> list[str]:
    """Nama unik dalam urutan tetap.

    Diacak sekali dengan benih tetap supaya hasilnya tidak berpola tetapi tetap
    sama setiap kali dijalankan.
    """
    semua = [f"{d} {b}" for d in depan for b in belakang]
    random.Random(20260909).shuffle(semua)

    if len(semua) < jumlah:
        raise ValueError(f"Kolam nama kurang: {len(semua)} untuk {jumlah} nama")

    return semua[:jumlah]


def nik_palsu(benih: str, panjang: int) -> str:
    """NIK berbentuk wajar tetapi tidak menunjuk siapa pun.

    Empat digit pertama kode wilayah yang memang dipakai di arsip; sisanya
    dibangkitkan dari benih tetap sehingga konsisten antar periode. Panjang
    aslinya dipertahankan supaya NIK yang memang belum lengkap tetap terbaca
    belum lengkap.
    """
    rng = random.Random(f"nik-{benih}")
    digit = "3277" + "".join(rng.choice("0123456789") for _ in range(12))

    return digit[:panjang]


# --------------------------------------------------------------------------
# Perakitan
# --------------------------------------------------------------------------


def kunci_identitas(baris: dict) -> tuple:
    """Pencocokan anak lintas periode: NIK dulu, lalu nama, tanggal lahir, JK.

    docs/06-migrasi-data.md bagian 6. Tanpa penggabungan otomatis.
    """
    if baris["nik"]:
        return ("nik", baris["nik"])

    return (
        "nama",
        (baris["nama"] or "").upper(),
        str(baris["tgl_lahir"]),
        baris["jk"] or "",
    )


def baca_semua(sumber: Path) -> tuple[list[dict], list[dict]]:
    """Seluruh baris arsip, sudah dinormalisasi tetapi belum dianonimkan."""
    mentah = []
    periode = []

    for nama_berkas, id_periode, label in BERKAS:
        berkas = sumber / nama_berkas

        if not berkas.exists():
            raise FileNotFoundError(f"Berkas arsip tidak ditemukan: {berkas}")

        tanggal_ukur = Counter()

        for sel in baca_baris(berkas):
            baris = {nama: sel.get(kolom) for kolom, nama in KOLOM.items()}
            baris["periode"] = id_periode
            baris["tgl_lahir"] = tanggal(baris["tgl_lahir"])
            baris["tanggal_ukur"] = tanggal(baris["tanggal_ukur"])

            # Kolom JK memuat "p" huruf kecil pada 16 baris.
            if baris["jk"]:
                baris["jk"] = baris["jk"].upper()

            mentah.append(baris)

            if baris["tanggal_ukur"]:
                tanggal_ukur[baris["tanggal_ukur"].isoformat()] += 1

        periode.append(
            {
                "id": id_periode,
                "label": label,
                "tanggalKegiatan": (
                    tanggal_ukur.most_common(1)[0][0] if tanggal_ukur else None
                ),
            }
        )

    return mentah, periode


def kehadiran(baris: dict) -> tuple[str, dict[str, str]]:
    """Status kehadiran dibaca dari isi kolom ukur, bukan dari berat badan nol.

    docs/06-migrasi-data.md bagian 5.4. Tanda hubung dipakai sebagai penanda
    kosong pada kolom LILA dan LIKA, jadi bukan konflik.
    """
    catatan: dict[str, str] = {}
    teks = [baris[k] for k in ("bb", "tinggi", "lila", "lika") if baris[k]]

    if any(RE_PINDAH.match(t) for t in teks):
        return "pindah", catatan

    bukan_angka = [t for t in teks if t != "-" and angka(t) is None]

    if bukan_angka:
        catatan["nilaiBukanAngka"] = "; ".join(bukan_angka)

        return "tidak_dapat_diukur", catatan

    if angka(baris["bb"]) is None:
        return "tidak_hadir", catatan

    return "hadir", catatan


def kelompokkan(mentah: list[dict]) -> dict[tuple, list[dict]]:
    """Kumpulkan baris satu anak lintas periode.

    Pencocokan dasarnya mengikuti docs/06-migrasi-data.md bagian 6, tetapi ada
    dua NIK di arsip yang dipakai dua anak berbeda sekaligus — satu di antaranya
    dengan tanggal lahir terpaut dua tahun dan RT yang berbeda. Penandanya jelas:
    satu NIK muncul dua kali pada periode yang sama, padahal seorang anak tidak
    ditimbang dua kali dalam satu sesi.

    Hanya grup seperti itu yang dipecah menurut nama. Memecah semua grup menurut
    nama akan memisahkan empat anak lain yang namanya sekadar berubah ejaan antar
    bulan (ALUARO menjadi ALVARO), dan riwayat pertumbuhannya ikut terputus.

    Bagian 6 menyatakan menggabungkan dua anak yang ternyata berbeda jauh lebih
    merugikan daripada meninggalkan keduanya terpisah.
    """
    kasar: dict[tuple, list[dict]] = {}

    for baris in mentah:
        kasar.setdefault(kunci_identitas(baris), []).append(baris)

    halus: dict[tuple, list[dict]] = {}

    for kunci, baris_anak in kasar.items():
        if max(Counter(b["periode"] for b in baris_anak).values()) == 1:
            halus[kunci] = baris_anak

            continue

        for baris in baris_anak:
            nama = (baris["nama"] or "").upper()
            halus.setdefault((*kunci, nama), []).append(baris)

    return halus


def rakit(mentah: list[dict], tabel) -> tuple[list[dict], list[dict]]:
    """Anak yang sudah dianonimkan beserta seluruh pengukurannya."""
    # Baris satu anak dikumpulkan lebih dulu supaya nama dan NIK penggantinya
    # sama di keenam periode.
    per_anak = kelompokkan(mentah)

    # Urutan tetap tanpa bergantung pada urutan baca berkas.
    urutan = sorted(
        per_anak,
        key=lambda k: (
            str(per_anak[k][-1]["tgl_lahir"]),
            per_anak[k][-1]["jk"] or "",
            repr(k),
        ),
    )

    nama_anak = kolam_nama(DEPAN_ANAK, BELAKANG_ANAK, len(urutan))
    nama_ortu = kolam_nama(DEPAN_ORTU, BELAKANG_ORTU, len(urutan))

    anak = []
    pengukuran = []

    for nomor, kunci in enumerate(urutan, start=1):
        baris_anak = sorted(per_anak[kunci], key=lambda b: b["periode"])
        # Baris terakhir dipakai sebagai identitas: periode termuda memuat
        # koreksi yang sudah dilakukan pemilik program pada bulan sebelumnya.
        akhir = baris_anak[-1]
        nik_asli = akhir["nik"] or ""
        nik_ortu_asli = akhir["nik_ortu"] or ""
        bb_lahir = angka(akhir["bb_lahir"])
        anak_ke = angka(akhir["anak_ke"])

        anak.append(
            {
                "id": nomor,
                # Dua anak memang tanpa nama di sumbernya. Dipertahankan.
                "nama": nama_anak[nomor - 1] if akhir["nama"] else None,
                "nik": nik_palsu(f"anak-{nomor}", len(nik_asli)) if nik_asli else None,
                "nikLengkap": len(nik_asli) == 16,
                "jk": akhir["jk"],
                "tglLahir": (
                    akhir["tgl_lahir"].isoformat() if akhir["tgl_lahir"] else None
                ),
                "anakKe": int(anak_ke) if anak_ke is not None else None,
                "bbLahirKg": bb_lahir,
                # Nilai seperti 2986 jelas bersatuan gram; ditandai, tidak
                # dikonversi diam-diam (docs/06-migrasi-data.md bagian 5.5).
                "bbLahirMeragukan": bb_lahir is not None and bb_lahir > 10,
                "pbLahirCm": angka(akhir["pb_lahir"]),
                "bukuKia": bool(akhir["buku_kia"]),
                "imd": bool(akhir["imd"]),
                "rt": akhir["rt"],
                "rw": akhir["rw"] or RW,
                "namaOrtu": nama_ortu[nomor - 1] if akhir["nama_ortu"] else None,
                "nikOrtu": (
                    nik_palsu(f"ortu-{nomor}", len(nik_ortu_asli))
                    if nik_ortu_asli
                    else None
                ),
            }
        )

        for baris in baris_anak:
            status, catatan = kehadiran(baris)
            ukur = {
                "bbKg": angka(baris["bb"]),
                "tinggiCm": angka(baris["tinggi"]),
                "lilaCm": angka(baris["lila"]),
                "likaCm": angka(baris["lika"]),
            }
            umur = (
                umur_bulan(akhir["tgl_lahir"], baris["tanggal_ukur"])
                if akhir["tgl_lahir"] and baris["tanggal_ukur"]
                else None
            )

            # jenis_ukur tidak ada di berkas sumber (bagian 5.8), jadi selalu
            # diasumsikan dari umur. Asumsinya ikut tercatat supaya terlihat di
            # antarmuka — prinsip P4, bukan sekadar catatan basis data. Koreksi
            # posisi 0,7 cm pada mesin PHP tidak pernah berlaku di sini karena
            # tidak ada satu pun baris yang mencatat cara ukurnya.
            if ukur["tinggiCm"] is not None:
                catatan["jenisUkur"] = "diasumsikan dari umur"

            pengukuran.append(
                {
                    "anakId": nomor,
                    "periodeId": baris["periode"],
                    "tanggalUkur": (
                        baris["tanggal_ukur"].isoformat()
                        if baris["tanggal_ukur"]
                        else None
                    ),
                    "umurBulan": umur,
                    **ukur,
                    "ntob": baris["ntob"],
                    "statusKehadiran": status,
                    "catatanUkur": catatan or None,
                    "penilaian": (
                        penilaian_gizi(tabel, akhir["jk"], umur, ukur)
                        if umur is not None and umur >= 0 and akhir["jk"]
                        else {}
                    ),
                }
            )

    return anak, pengukuran


def garis_sd_bbu(tabel) -> list[dict]:
    """Parameter LMS BB/U 0-60 bulan untuk menggambar pita KMS di Detail anak.

    Ditulis di sini karena skrip ini sudah membaca who-lms.json; skrip kedua
    untuk data yang sama adalah pekerjaan dua kali.
    """
    return [
        {"jk": jk, "umurBulan": int(kunci), "l": l, "m": m, "s": s}
        for jk in ("L", "P")
        for kunci, l, m, s in tabel[("BB_U", jk)]
        if kunci <= 60
    ]


# --------------------------------------------------------------------------
# Pemeriksaan mandiri — docs/10-prd-demo-frontend.md bagian 5.5 dan 14.8
# --------------------------------------------------------------------------

SEBARAN_JUNI = {
    "anak": 101,
    "rt": {"1": 39, "2": 20, "3": 8, "4": 7, "5": 7, "6": 13, "7": 7},
    "jk": {"L": 45, "P": 56},
    "obesitas": 3,
}

# Satu baris pada master Juni memuat z-score TB/U 210,49 untuk anak bertinggi
# 87,9 cm — jelas kesalahan rumus di berkasnya, bukan selisih metode.
OUTLIER_MASTER = {("TB_U", 77)}

# Kolom master per indeks: (nama sheet, kolom z-score hasil LMS, kolom nilai
# ukur di arsip). Hanya indeks berkunci umur yang dibandingkan; BB/TB memakai
# metode pencarian tabel yang berbeda, lihat docs/11-catatan-tahap-demo.md.
KOLOM_MASTER = {
    "BB_U": ("JUN_BB_U", "P"),
    "TB_U": ("JUN_TB_U", "Q"),
    "LIKA_U": ("JUN_LIKA_U", "T"),
}


def periksa(anak: list[dict], pengukuran: list[dict]) -> None:
    """Sebaran Juni 2026 yang dapat diperiksa langsung dari sheet arsip.

    Hanya angka yang benar-benar terbaca dari arsip yang diperiksa di sini.
    Jumlah per kategori status gizi pada docs/10-prd-demo-frontend.md bagian 5.5
    sengaja tidak diperiksa: angkanya tidak dapat direproduksi dari sumber mana
    pun, dan tercatat sebagai pertanyaan terbuka di
    docs/11-catatan-tahap-demo.md. Kebenaran perhitungan dibuktikan oleh
    verifikasi_master(), bukan oleh jumlah kategori.
    """
    juni = [p for p in pengukuran if p["periodeId"] == "2026-06"]
    peta = {a["id"]: a for a in anak}
    salah = []

    def bandingkan(nama: str, dapat, harap) -> None:
        if dapat != harap:
            salah.append(f"  {nama}: dapat {dapat}, seharusnya {harap}")

    bandingkan("jumlah anak Juni", len(juni), SEBARAN_JUNI["anak"])
    bandingkan(
        "RT",
        dict(sorted(Counter(peta[p["anakId"]]["rt"] for p in juni).items())),
        SEBARAN_JUNI["rt"],
    )
    bandingkan(
        "jenis kelamin",
        dict(sorted(Counter(peta[p["anakId"]]["jk"] for p in juni).items())),
        SEBARAN_JUNI["jk"],
    )
    # Satu-satunya jumlah kategori yang disepakati arsip, master, dan
    # perhitungan ini sekaligus.
    bandingkan(
        "obesitas",
        sum(
            1
            for p in juni
            if p["penilaian"].get("BB_TB", {}).get("kategori") == "Obesitas"
        ),
        SEBARAN_JUNI["obesitas"],
    )

    if salah:
        raise AssertionError("Sebaran tidak cocok dengan arsip:\n" + "\n".join(salah))


def verifikasi_master(master: Path, sumber: Path, tabel) -> None:
    """Bandingkan z-score tiap anak dengan master Juni 2026 milik pemilik program.

    Ini pemeriksaan terkuat yang tersedia: bukan jumlah per kategori, melainkan
    angka per anak. Hanya BB/U, TB/U, dan LIKA/U yang diperiksa — ketiganya
    berkunci umur, dan docs/10-prd-demo-frontend.md bagian 5.3 memang hanya
    menjanjikan nol selisih pada ketiganya.

    Berkas master berada di luar repo, jadi langkah ini opsional.
    """
    zf = zipfile.ZipFile(master)
    rels = dict(
        re.findall(
            r'Id="([^"]+)"[^>]*Target="([^"]+)"',
            zf.read("xl/_rels/workbook.xml.rels").decode("utf8", "ignore"),
        )
    )
    sheet = {
        nama: rels[rid]
        for nama, rid in re.findall(
            r'<sheet name="([^"]+)"[^>]*r:id="([^"]+)"',
            zf.read("xl/workbook.xml").decode("utf8", "ignore"),
        )
    }

    arsip = {
        int(float(b["A"])): b
        for b in baca_baris(sumber / BERKAS[-1][0])
        if b.get("A")
    }
    salah = []

    print("\nVerifikasi terhadap master Juni 2026")

    for indeks, (nama_sheet, kolom_nilai) in KOLOM_MASTER.items():
        baris = baca_sheet(zf, sheet[nama_sheet])
        mulai = next(i for i, b in enumerate(baris) if b.get("A") == "NO")
        kolom_z = next(
            k
            for k, v in baris[mulai].items()
            if "LMS" in v.upper() and v.upper().startswith("Z")
        )
        cocok = beda = kosong = 0

        for b in baris[mulai + 1 :]:
            nomor = b.get("A", "")

            if not nomor.isdigit() or int(nomor) not in arsip:
                continue

            asli = arsip[int(nomor)]
            umur = umur_bulan(tanggal(asli.get("I")), tanggal(asli.get("O")))
            nilai = angka(asli.get(kolom_nilai))
            kami = (
                None
                if nilai is None
                else hitung_z(tabel, indeks, (asli.get("J") or "").upper(), umur, nilai)
            )
            mereka = angka(b.get(kolom_z))

            if kami is None or mereka is None:
                kosong += 1
            elif abs(kami - mereka) < 1e-6:
                cocok += 1
            elif (indeks, int(nomor)) not in OUTLIER_MASTER:
                beda += 1
                salah.append(
                    f"  {indeks} baris {nomor}: {kami:+.4f} vs master {mereka:+.4f}"
                )

        print(f"  {indeks:7s} cocok {cocok:3d}  beda {beda}  tak terhitung {kosong:3d}")

    if salah:
        raise AssertionError("Z-score berbeda dari master:\n" + "\n".join(salah))


def ringkas(anak: list[dict], pengukuran: list[dict], periode: list[dict]) -> None:
    juni = [p for p in pengukuran if p["periodeId"] == "2026-06"]
    peta = {a["id"]: a for a in anak}

    print(f"{len(anak)} anak, {len(pengukuran)} pengukuran, {len(periode)} periode")
    print("\nJuni 2026")
    print(
        "  RT           ",
        dict(sorted(Counter(peta[p["anakId"]]["rt"] for p in juni).items())),
    )
    print(
        "  Jenis kelamin",
        dict(sorted(Counter(peta[p["anakId"]]["jk"] for p in juni).items())),
    )

    for indeks in ("BB_U", "TB_U", "BB_TB"):
        hitung = Counter(
            p["penilaian"][indeks]["kategori"]
            for p in juni
            if indeks in p["penilaian"]
        )
        print(f"  {indeks:6s}       ", dict(sorted(hitung.items())))

    print("\nKehadiran per periode")

    for p in periode:
        baris = [q for q in pengukuran if q["periodeId"] == p["id"]]
        ditimbang = sum(1 for q in baris if q["statusKehadiran"] == "hadir")
        print(
            f"  {p['label']:15s} S {len(baris):3d}  "
            f"D {ditimbang:3d}  {ditimbang / len(baris):.0%}"
        )


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)

        return 1

    sumber = Path(sys.argv[1])

    if not sumber.is_dir():
        print(f"Folder arsip tidak ditemukan: {sumber}")

        return 1

    akar = Path(__file__).resolve().parents[2]
    tabel = muat_standar(akar / "database" / "data" / "who-lms.json")

    mentah, periode = baca_semua(sumber)
    anak, pengukuran = rakit(mentah, tabel)

    periksa(anak, pengukuran)

    keluaran = Path(__file__).parent / "posyandu.json"
    keluaran.write_text(
        json.dumps(
            {
                "meta": {
                    "versiStandar": VERSI_STANDAR,
                    # Jumlah baris tabel standar, ditampilkan di layar
                    # Pengaturan supaya angkanya tidak ditulis tangan.
                    "barisStandar": sum(len(b) for b in tabel.values()),
                    "posyandu": "Tulip",
                    "rw": RW,
                    "kelurahan": "Citeureup",
                    "catatan": (
                        "Nama dan NIK diganti. Tanggal lahir, RT, jenis kelamin, dan "
                        "seluruh nilai ukur tidak diubah. Lihat "
                        "docs/10-prd-demo-frontend.md bagian 5.2."
                    ),
                },
                "periode": periode,
                "anak": anak,
                "pengukuran": pengukuran,
                "garisSdBbU": garis_sd_bbu(tabel),
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf8",
    )

    ringkas(anak, pengukuran, periode)

    if len(sys.argv) > 2:
        verifikasi_master(Path(sys.argv[2]), sumber, tabel)

    print(f"\nDitulis ke {keluaran}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
