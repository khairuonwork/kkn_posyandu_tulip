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
    balitaKartu,
    balitaPenimbangan,
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
    RIWAYAT_PENGATURAN_CONTOH,
    ringkasan,
    RT_KADER,
    standarLms,
    statusGizi,
    trenStatusGizi,
} from '@/data/contoh/store';
import { umurBulanPada } from '@/lib/format';
import DaftarAnak from '@/pages/anak/index';
import type { AnakBaru, BarisAnak, PatchAnak } from '@/pages/anak/index';
import RiwayatPenimbangan from '@/pages/anak/riwayat';
import DetailAnak from '@/pages/anak/show';
import Dashboard from '@/pages/dashboard';
import KartuSasaran from '@/pages/kartu-sasaran/index';
import Laporan from '@/pages/laporan/index';
import type { TabPeriode } from '@/pages/laporan/index';
import LayananPosyandu from '@/pages/layanan/index';
import Pengaturan from '@/pages/pengaturan/index';
import type {
    Ambang,
    DaftarPengguna,
    IsianPengguna,
    StandarisasiAntropometri,
} from '@/pages/pengaturan/index';
import SasaranImpor from '@/pages/sasaran/index';
import type { Anak, Peran, Periode } from '@/types/posyandu';

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
        jk: patch.jk ?? baris.jk,
        bbKg: patch.bbKg === undefined ? baris.bbKg : patch.bbKg,
        tinggiCm:
            patch.tinggiCm === undefined ? baris.tinggiCm : patch.tinggiCm,
    };
}

/** Koreksi yang sama, ditempelkan pada identitas di Detail Balita. */
function terapkanIdentitas(anak: Anak, patch: PatchAnak | undefined): Anak {
    if (patch === undefined) {
        return anak;
    }

    const nikBaru = patch.nik.replace(/\D/g, '');

    return {
        ...anak,
        nama: patch.nama === '' ? null : patch.nama,
        nik: nikBaru === '' ? null : nikBaru,
        nikLengkap: nikBaru.length === 16,
        namaOrtu: patch.namaOrtu === '' ? null : patch.namaOrtu,
        rt: patch.rt === '' ? null : patch.rt,
        jk: patch.jk ?? anak.jk,
        tglLahir: patch.tglLahir ?? anak.tglLahir,
        anakKe: patch.anakKe === undefined ? anak.anakKe : patch.anakKe,
        bbLahirKg:
            patch.bbLahirKg === undefined ? anak.bbLahirKg : patch.bbLahirKg,
        bbLahirMeragukan:
            patch.bbLahirKg === undefined ? anak.bbLahirMeragukan : false,
        bukuKia: patch.bukuKia ?? anak.bukuKia,
    };
}

/** Nama Posyandu di kepala kartu balita. */
const LEMBAGA = `Posyandu ${data.meta.posyandu} · RW ${data.meta.rw} ${data.meta.kelurahan}`;

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
    standarisasi: StandarisasiAntropometri;
    onSimpanStandarisasi: (nilai: StandarisasiAntropometri) => void;
    pengguna: DaftarPengguna;
    onSimpanPengguna: (
        id: number | null,
        isian: IsianPengguna,
    ) => Promise<string | null>;
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
    standarisasi,
    onSimpanStandarisasi,
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

    if (rute.nama === 'layanan') {
        // Kader hanya mencari di RT binaannya.
        return (
            <LayananPosyandu
                balita={balitaPenimbangan(periodeId).filter(
                    (b) => rtLingkup === null || b.rt === rtLingkup,
                )}
                ambang={ambang}
                standarLms={standarLms}
            />
        );
    }

    if (
        (rute.nama === 'detail' || rute.nama === 'riwayat') &&
        periode !== null
    ) {
        const detail = detailAnak(rute.id);

        if (detail === null) {
            return <TidakDitemukan />;
        }

        const anak = terapkanIdentitas(detail.anak, koreksi[rute.id]);

        if (rute.nama === 'riwayat') {
            return (
                <RiwayatPenimbangan
                    anak={anak}
                    pengukuran={detail.pengukuran}
                    periode={periode}
                    ambang={ambang}
                />
            );
        }

        return (
            // Di-key menurut anak: tanpa ini React memakai ulang instance yang
            // sama saat berpindah anak, sehingga panel umur kurva KMS dan
            // titik yang tersorot masih milik anak sebelumnya.
            <DetailAnak
                key={detail.anak.id}
                anak={anak}
                pengukuran={detail.pengukuran}
                garisSd={detail.garisSd}
                peran={peran}
                periode={periode}
                ambang={ambang}
                wilayahRt={daftarRt()}
                noWa={koreksi[rute.id]?.noWa ?? null}
                lembaga={LEMBAGA}
                onSimpan={(patch) => onSimpanAnak(rute.id, patch)}
            />
        );
    }

    if (rute.nama === 'laporan' && periode !== null) {
        // Tab Tahunan menjumlahkan seluruh periode, sedangkan Bulanan memakai
        // periode yang dipilih.
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
                periodeTerisi={periodeTerakhirTerisi()}
                onPindahPeriode={onPindahPeriode}
            />
        );
    }

    if (rute.nama === 'sasaran') {
        return <SasaranImpor />;
    }

    if (rute.nama === 'kartu-sasaran') {
        return (
            <KartuSasaran
                balita={balitaKartu(periodeId)}
                wilayahRt={daftarRt()}
                terpilihAwal={rute.id}
                lembaga={LEMBAGA}
            />
        );
    }

    if (rute.nama === 'pengaturan') {
        return (
            <Pengaturan
                ambang={ambang}
                standarisasi={standarisasi}
                onSimpan={onSimpanAmbang}
                onSimpanStandarisasi={onSimpanStandarisasi}
                standarVersi={data.meta.versiStandar}
                barisStandar={data.meta.barisStandar}
                peran={peran}
                pengguna={pengguna}
                onSimpanPengguna={onSimpanPengguna}
                terakhirDiubah={PENGATURAN_TERAKHIR_DIUBAH}
                riwayat={RIWAYAT_PENGATURAN_CONTOH}
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
