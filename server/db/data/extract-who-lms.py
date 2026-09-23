#!/usr/bin/env python3
"""Ekstrak tabel LMS WHO dari `ref kemenkes & who.xlsx` menjadi who-lms.json.

Berkas Excel sumber berada di luar repo dan bukan dependensi runtime; skrip ini
hanya dijalankan ulang bila standarnya berubah. Lihat docs/rujukan/antropometri.md.

Pakai:
    python database/data/extract-who-lms.py "E:/TUGAS KULIAH/KKN/ref kemenkes & who.xlsx"

Hanya memakai pustaka standar Python — tidak perlu openpyxl/pandas.
"""

import json
import re
import sys
import zipfile
from datetime import date
from pathlib import Path

# Nama tabel Excel -> (indeks, jenis kelamin). Tabel STD_* (gaya SD Permenkes) sengaja diabaikan.
TABEL = {
    "LMS_BB_PER_U_L": ("BB_U", "L"),
    "LMS_BB_PER_U_P": ("BB_U", "P"),
    "LMS_TB_PER_U_L": ("TB_U", "L"),
    "LMS_TB_PER_U_P": ("TB_U", "P"),
    "LMS_BB_PER_TB_L": ("BB_TB", "L"),
    "LMS_BB_PER_TB_P": ("BB_TB", "P"),
    "LMS_IMT_PER_U_L": ("IMT_U", "L"),
    "LMS_IMT_PER_U_P": ("IMT_U", "P"),
    "LMS_LIKA_PER_U_L": ("LIKA_U", "L"),
    "LMS_LIKA_PER_U_P": ("LIKA_U", "P"),
    "LMS_LILA_PER_U_L": ("LILA_U", "L"),
    "LMS_LILA_PER_U_P": ("LILA_U", "P"),
}

VERSI = "WHO-2006"


def kolom_ke_angka(kolom: str) -> int:
    n = 0
    for ch in kolom:
        n = n * 26 + (ord(ch) - 64)
    return n


def baca_sel(zf: zipfile.ZipFile) -> dict[str, str]:
    """Peta referensi sel -> nilai mentah. Hanya sel numerik yang diperlukan."""
    sel = {}
    xml = zf.read("xl/worksheets/sheet1.xml").decode("utf8", "ignore")
    for m in re.finditer(r'<c r="([A-Z]+\d+)"([^>]*)>(?:<v>(.*?)</v>)?', xml):
        ref, attrs, nilai = m.groups()
        if nilai is not None and 't="s"' not in attrs:
            sel[ref] = nilai
    return sel


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    sumber = Path(sys.argv[1])
    if not sumber.exists():
        print(f"Berkas tidak ditemukan: {sumber}")
        return 1

    zf = zipfile.ZipFile(sumber)
    sel = baca_sel(zf)

    baris = []
    ditemukan = set()

    for entri in zf.namelist():
        if not entri.startswith("xl/tables/"):
            continue
        xml = zf.read(entri).decode("utf8", "ignore")
        nama = re.search(r'name="([^"]+)"', xml)
        rentang = re.search(r'ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"', xml)
        if not nama or not rentang or nama.group(1) not in TABEL:
            continue

        indeks, jk = TABEL[nama.group(1)]
        ditemukan.add(nama.group(1))
        kol_awal, baris_awal, _, baris_akhir = rentang.groups()

        # Kolom berurutan: kunci, L, M, S. Baris pertama adalah header.
        kolom = [chr(64 + kolom_ke_angka(kol_awal) + i) for i in range(4)]

        for r in range(int(baris_awal) + 1, int(baris_akhir) + 1):
            nilai = [sel.get(f"{c}{r}") for c in kolom]
            if any(v is None for v in nilai):
                continue
            kunci, l, m, s = (float(v) for v in nilai)
            baris.append(
                {
                    "indeks": indeks,
                    "jk": jk,
                    "kunci": round(kunci, 1),
                    "l": round(l, 6),
                    "m": round(m, 6),
                    "s": round(s, 6),
                }
            )

    hilang = set(TABEL) - ditemukan
    if hilang:
        print(f"Tabel tidak ditemukan di berkas sumber: {sorted(hilang)}")
        return 1

    baris.sort(key=lambda b: (b["indeks"], b["jk"], b["kunci"]))

    keluaran = Path(__file__).parent / "who-lms.json"
    keluaran.write_text(
        json.dumps(
            {
                "versi": VERSI,
                "sumber": f"{sumber.name} (sheet Lembar1)",
                "diekstrak_pada": date.today().isoformat(),
                "catatan": "Nilai diambil apa adanya dari berkas sumber, tanpa koreksi. Lihat OI-05 di docs/pertanyaan-terbuka.md.",
                "baris": baris,
            },
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf8",
    )

    print(f"{len(baris)} baris ditulis ke {keluaran}")
    for indeks in sorted({b["indeks"] for b in baris}):
        for jk in ("L", "P"):
            sub = [b for b in baris if b["indeks"] == indeks and b["jk"] == jk]
            print(f"  {indeks:7s} {jk}  {len(sub):3d} baris  kunci {sub[0]['kunci']}–{sub[-1]['kunci']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
