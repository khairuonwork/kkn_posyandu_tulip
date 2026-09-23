/**
 * Pemasok props tiap layar.
 *
 * ponytail: seluruh angka di sini masih datang dari `@/data/contoh` — berkas
 * JSON yang ikut terbundel. Endpoint data kelima layar belum ada; saat ia
 * datang, **berkas inilah satu-satunya yang berubah**, dan impor `@/data/contoh`
 * beserta JSON-nya ikut hilang dari bundel. Tidak ada pemanggil selektor lain
 * di seluruh aplikasi, dan itu disengaja.
 */

import type { Rute } from '@/app-shell';
import {
    cakupanEnamBulan,
    cariPeriode,
    daftarAnak,
    daftarRt,
    data,
    detailAnak,
    PENGATURAN_TERAKHIR_DIUBAH,
    periodeTerakhirTerisi,
    perluPerhatian,
    rekapPerRt,
    ringkasan,
    RT_KADER,
    standarLms,
    statusGizi,
    trenDsPerRt,
    trenStatusGizi,
} from '@/data/contoh/store';
import { umurBulanPada } from '@/lib/format';
import DaftarAnak from '@/pages/anak/index';
import type { AnakBaru, BarisAnak, PatchAnak } from '@/pages/anak/index';
import DetailAnak from '@/pages/anak/show';
import Dashboard from '@/pages/dashboard';
import Laporan from '@/pages/laporan/index';
import type { TabPeriode } from '@/pages/laporan/index';
import Pengaturan from '@/pages/pengaturan/index';
import type { Ambang } from '@/pages/pengaturan/index';
import type { Pengguna, Peran, Periode } from '@/types/posyandu';

/**
 * Anak baru menjadi satu baris daftar.
 *
 * Id-nya negatif supaya tidak pernah bentrok dengan id dari arsip, dan
 * seketika terbaca sebagai "belum ada di basis data" saat menelusuri.
 */
function keBaris(
    baru: AnakBaru,
    urutan: number,
    periode: Periode | null,
): BarisAnak {
    return {
        anakId: -1 - urutan,
        nama: baru.nama,
        nik: null,
        nikLengkap: false,
        jk: baru.jk,
        umurBulan: umurBulanPada(
            baru.tglLahir,
            periode?.tanggalKegiatan ?? null,
        ),
        rt: baru.rt,
        namaOrtu: baru.namaOrtu === '' ? null : baru.namaOrtu,
        tanggalUkurTerakhir: null,
        kategoriGizi: null,
        perluPerhatian: false,
        risikoLahir: null,
        indeksPemicu: null,
        kategoriPemicu: null,
        // Belum pernah ditimbang: null, bukan nol (DR-04).
        bbKg: null,
        tinggiCm: null,
    };
}

/** Koreksi editor baris ditempelkan di atas baris arsipnya. */
function terapkanKoreksi(
    baris: BarisAnak,
    patch: PatchAnak | undefined,
): BarisAnak {
    if (patch === undefined) {
        return baris;
    }

    return {
        ...baris,
        nama: patch.nama === '' ? null : patch.nama,
        nik: patch.nik === '' ? null : patch.nik,
        nikLengkap: patch.nik.replace(/\D/g, '').length === 16,
        namaOrtu: patch.namaOrtu === '' ? null : patch.namaOrtu,
        rt: patch.rt === '' ? null : patch.rt,
        bbKg: patch.bbKg,
        tinggiCm: patch.tinggiCm,
    };
}

export type LayarProps = {
    rute: Rute;
    peran: Peran;
    periodeId: string;
    onPindahPeriode: (id: string) => void;
    koreksi: Record<number, PatchAnak>;
    tambahan: AnakBaru[];
    antrean?: { jumlah: number; sejak: string };
    onCobaKirim: () => void;
    onSimpanAnak: (anakId: number, patch: PatchAnak) => void;
    onTambahAnak: (baru: AnakBaru) => void;
    ambang: Ambang;
    onSimpanAmbang: (nilai: Ambang) => void;
    pengguna: Pengguna[];
    onSimpanPengguna: (daftar: Pengguna[]) => void;
    tabLaporan: TabPeriode;
    onGantiTabLaporan: (tab: TabPeriode) => void;
};

export function Layar({
    rute,
    peran,
    periodeId,
    onPindahPeriode,
    tabLaporan,
    onGantiTabLaporan,
    koreksi,
    tambahan,
    antrean,
    onCobaKirim,
    onSimpanAnak,
    onTambahAnak,
    ambang,
    onSimpanAmbang,
    pengguna,
    onSimpanPengguna,
}: LayarProps) {
    const periode = cariPeriode(periodeId);
    // Satu sumber untuk lingkup data kader, dipakai Beranda, Data Balita, dan
    // Laporan sekaligus.
    const rtLingkup = peran === 'kader' ? RT_KADER : null;

    if (rute.nama === 'beranda' && periode !== null) {
        return (
            <Dashboard
                periode={periode}
                ringkasan={ringkasan(periodeId, rtLingkup)}
                statusGizi={statusGizi(periodeId, rtLingkup)}
                cakupanEnamBulan={cakupanEnamBulan(rtLingkup)}
                trenGizi={trenStatusGizi(rtLingkup)}
                perluPerhatian={perluPerhatian(periodeId, rtLingkup)}
                periodeTerisi={periodeTerakhirTerisi()}
                belumTerkirim={antrean}
                onCobaKirim={onCobaKirim}
                onPindahPeriode={onPindahPeriode}
            />
        );
    }

    if (rute.nama === 'balita' && periode !== null) {
        // Baris arsip dulu dengan koreksinya, lalu anak yang baru ditambah.
        // Anak baru berada di bawah dengan sengaja: ia satu-satunya baris tanpa
        // status gizi, dan menaruhnya di puncak daftar terbaca seperti galat.
        const baris = daftarAnak(periodeId)
            .map((b) => terapkanKoreksi(b, koreksi[b.anakId]))
            .concat(tambahan.map((t, i) => keBaris(t, i, periode)));

        return (
            <DaftarAnak
                anak={baris}
                wilayahRt={daftarRt()}
                rw={data.meta.rw}
                peran={peran}
                rtTerkunci={rtLingkup}
                periode={periode}
                standarLms={standarLms}
                onSimpanAnak={onSimpanAnak}
                onTambahAnak={onTambahAnak}
            />
        );
    }

    if (rute.nama === 'detail' && periode !== null) {
        const detail = detailAnak(rute.id);

        if (detail === null) {
            return <TidakDitemukan />;
        }

        return (
            // Di-key menurut anak: tanpa ini React memakai ulang instance yang
            // sama saat berpindah anak, sehingga panel umur kurva KMS dan baris
            // riwayat yang tersorot masih milik anak sebelumnya.
            <DetailAnak
                key={detail.anak.id}
                anak={detail.anak}
                pengukuran={detail.pengukuran}
                garisSd={detail.garisSd}
                peran={peran}
                periode={periode}
                ambang={ambang}
            />
        );
    }

    if (rute.nama === 'laporan' && periode !== null) {
        // Tab Tahunan menjumlahkan seluruh periode; Harian dan Bulanan memakai
        // periode terpilih saja, karena data impor hanya punya satu tanggal
        // ukur per periode.
        const periodeDipakai =
            tabLaporan === 'tahunan'
                ? data.periode.map((p) => p.id)
                : [periodeId];
        const rekap = rekapPerRt(periodeDipakai, rtLingkup);

        return (
            <Laporan
                periode={periode}
                tab={tabLaporan}
                onGantiTab={onGantiTabLaporan}
                rekapPerRt={rekap.baris}
                total={rekap.total}
                wilayahRt={rtLingkup === null ? daftarRt() : [rtLingkup]}
                rw={data.meta.rw}
                kelurahan={data.meta.kelurahan}
                trenRt={trenDsPerRt(rtLingkup)}
                semuaPeriode={data.periode.map((p) => ({
                    periodeId: p.id,
                    label: p.label,
                }))}
                periodeTerisi={periodeTerakhirTerisi()}
                onPindahPeriode={onPindahPeriode}
            />
        );
    }

    if (rute.nama === 'pengaturan') {
        return (
            <Pengaturan
                ambang={ambang}
                onSimpan={onSimpanAmbang}
                peran={peran}
                pengguna={pengguna}
                wilayahRt={daftarRt()}
                onSimpanPengguna={onSimpanPengguna}
                terakhirDiubah={PENGATURAN_TERAKHIR_DIUBAH}
            />
        );
    }

    return <TidakDitemukan />;
}

function TidakDitemukan() {
    return (
        <div className="p-6">
            <div className="rounded-lg border border-border bg-surface-subtle p-6">
                <p className="text-base font-bold">Halaman tidak ditemukan</p>
                <p className="mt-1 text-base text-muted-foreground">
                    Alamat yang dibuka tidak dikenali. Pilih salah satu menu di
                    samping.
                </p>
            </div>
        </div>
    );
}
