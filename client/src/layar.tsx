/**
 * Pemasok props tiap layar.
 *
 * ponytail: seluruh angka di sini masih datang dari `@/data/contoh` — berkas
 * JSON yang ikut terbundel. Endpoint data kelima layar belum ada; saat ia
 * datang, **berkas inilah satu-satunya yang berubah**, dan impor `@/data/contoh`
 * beserta JSON-nya ikut hilang dari bundel. Tidak ada pemanggil selektor lain
 * di seluruh aplikasi, dan itu disengaja.
 */

import { useState } from 'react';
import type { IsianHariH, KehadiranHariH } from '@/components/cakupan-penimbangan';
import { unduhLaporanDemo } from '@/lib/laporan-demo';
import type { Rute } from '@/app-shell';
import StateHalaman from '@/components/state-halaman';
import {
    balitaKartu,
    cakupanEnamBulan,
    cariPeriode,
    daftarAnak,
    daftarRt,
    data,
    detailAnak,
    laporanDemo,
    PENGATURAN_TERAKHIR_DIUBAH,
    periodeSasaranDemo,
    periodeTerakhirTerisi,
    perluPerhatian,
    rekapPerRt,
    RIWAYAT_PENGATURAN_CONTOH,
    ringkasan,
    RT_KADER,
    sasaranDemo,
    standarLms,
    statusGizi,
    sebaranIndeks,
    trenStatusGizi,
} from '@/data/contoh/store';
import type { DetailAnakServerState } from '@/lib/anak';
import type { useBerandaServer } from '@/lib/beranda';
import { umurBulanPada } from '@/lib/format';
import type { useLaporanServer } from '@/lib/laporan';
import DaftarAnak from '@/pages/anak/index';
import type { AnakBaru, BarisAnak, PatchAnak } from '@/pages/anak/index';
import RiwayatPenimbangan from '@/pages/anak/riwayat';
import DetailAnak from '@/pages/anak/show';
import Dashboard from '@/pages/dashboard';
import KartuSasaran from '@/pages/kartu-sasaran/index';
import type { BalitaKartu } from '@/pages/kartu-sasaran/index';
import PemeriksaanKms from '@/pages/kms';
import Laporan from '@/pages/laporan/index';
import type { TabPeriode } from '@/pages/laporan/index';
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
function terapkanIdentitas(
    anak: Anak,
    patch: PatchAnak | undefined,
    periodeId: string,
): Anak {
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
        kbIbu: patch.kbIbu === undefined ? anak.kbIbu : patch.kbIbu,
        jenisKb: patch.jenisKb === undefined ? anak.jenisKb : patch.jenisKb,
        desilKelompok:
            patch.periodeId === periodeId &&
            (patch.desil !== undefined || patch.desilKelompok !== undefined)
                ? (patch.desilKelompok ?? null)
                : anak.desilKelompok,
        desil:
            patch.desil !== undefined && patch.periodeId === periodeId
                ? patch.desil
                : anak.desil,
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
    onSimpanAnak: (anakId: number, patch: PatchAnak) => void | Promise<void>;
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
    anakServer?: BarisAnak[] | null;
    kartuServer?: BalitaKartu[] | null;
    modeDataLive?: boolean;
    statusAnakServer?: 'memuat' | 'siap' | 'galat';
    pesanGalatAnakServer?: string | null;
    onMuatUlangAnakServer?: () => void;
    detailServer?: DetailAnakServerState;
    periodeServer?: Periode[];
    berandaServer?: ReturnType<typeof useBerandaServer>;
    laporanServer?: ReturnType<typeof useLaporanServer>;
    onSesiBerakhir: () => void;
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
    anakServer,
    kartuServer,
    modeDataLive = false,
    statusAnakServer,
    pesanGalatAnakServer,
    onMuatUlangAnakServer,
    detailServer,
    periodeServer,
    berandaServer,
    laporanServer,
    onSesiBerakhir,
}: LayarProps) {
    const [rtBeranda, setRtBeranda] = useState('');
    const [kehadiranDemo, setKehadiranDemo] = useState<Record<string, IsianHariH[]>>({});
    const periode = modeDataLive
        ? (periodeServer?.find((p) => p.id === periodeId) ?? null)
        : cariPeriode(periodeId);
    // Portal live memberi semua kader cakupan lintas RT. Data contoh masih
    // mempertahankan RT binaan untuk merepresentasikan mode demonstrasi.
    const rtLingkup = modeDataLive ? null : peran === 'kader' ? RT_KADER : null;
    const wilayahRt = modeDataLive
        ? Array.from(
              new Set(
                  (anakServer ?? [])
                      .map((anak) => anak.rt)
                      .filter((rt): rt is string => rt !== null),
              ),
          ).sort()
        : daftarRt();

    if (
        modeDataLive &&
        periode === null &&
        rute.nama !== 'sasaran' &&
        rute.nama !== 'pengaturan' &&
        rute.nama !== 'kms'
    ) {
        return berandaServer?.statusPeriode === 'galat' ? (
            <GalatData
                pesan={berandaServer.pesanGalat}
                onMuatUlang={berandaServer.muatUlang}
            />
        ) : (
            <MemuatData />
        );
    }

    if (rute.nama === 'beranda' && periode !== null) {
        if (modeDataLive && berandaServer?.status === 'galat') {
            return (
                <GalatData
                    pesan={berandaServer.pesanGalat}
                    onMuatUlang={berandaServer.muatUlang}
                />
            );
        }

        const live = modeDataLive ? berandaServer?.data : null;
        const rtDashboard = rtLingkup ?? (rtBeranda || null);
        const rekapDemo = rekapPerRt([periodeId], rtLingkup).baris;
        const hariDemo: KehadiranHariH[] = rekapDemo.map((baris) => {
            const wilayahRtId = Number(baris.rt);
            const tersimpan = kehadiranDemo[periodeId]?.find((item) => item.wilayahRtId === wilayahRtId);
            return { periodeId, periodeDbId: 1, wilayahRtId, rt: baris.rt, posyandu: 'Posyandu Tulip', tanggalHariH: tersimpan?.tanggalHariH ?? periode.tanggalKegiatan, hadirHariH: tersimpan ? tersimpan.hadirHariH : baris.d, sumber: 'manual', sasaran: baris.s };
        });

        return (
            <Dashboard
                kehadiranHariH={modeDataLive ? live?.kehadiranHariH : hariDemo}
                bolehUbahHariH={modeDataLive ? live?.bolehUbahHariH : peran !== 'kader'}
                onSimpanHariH={
                    modeDataLive ? berandaServer?.simpanHariH : async (items) => setKehadiranDemo((prev) => ({ ...prev, [periodeId]: [...(prev[periodeId] ?? []).filter((lama) => !items.some((baru) => lama.wilayahRtId === baru.wilayahRtId)), ...items] }))
                }
                rtPilihan={modeDataLive ? berandaServer?.rtPilihan : rtBeranda}
                wilayahRt={live?.wilayahRt ?? wilayahRt}
                onPilihRt={
                    modeDataLive ? berandaServer?.setRtPilihan : setRtBeranda
                }
                statusBbU={
                    live?.statusBbU ??
                    (modeDataLive
                        ? []
                        : sebaranIndeks(periodeId, 'BB_U', rtDashboard))
                }
                statusTbU={
                    live?.statusTbU ??
                    (modeDataLive
                        ? []
                        : sebaranIndeks(periodeId, 'TB_U', rtDashboard))
                }
                periode={periode}
                ringkasan={
                    live?.ringkasan ??
                    (modeDataLive
                        ? {
                              sasaran: 0,
                              ditimbang: 0,
                              naik: 0,
                              tanggalUkur: null,
                          }
                        : ringkasan(periodeId, rtDashboard))
                }
                statusGizi={
                    live?.statusGizi ??
                    (modeDataLive
                        ? {
                              giziBaik: 0,
                              giziKurang: 0,
                              giziBuruk: 0,
                              berisikoLebih: 0,
                              giziLebih: 0,
                              obesitas: 0,
                              belumDinilai: 0,
                              ditimbang: 0,
                          }
                        : statusGizi(periodeId, rtDashboard))
                }
                cakupanEnamBulan={
                    live?.cakupanEnamBulan ??
                    (modeDataLive ? [] : cakupanEnamBulan(rtDashboard).map((bulan) => {
                        const entries = kehadiranDemo[bulan.periodeId];
                        if (!entries) return bulan;
                        const rtData = rekapPerRt([bulan.periodeId], rtDashboard).baris;
                        const nilai = rtData.map((r) => entries.find((e) => e.wilayahRtId === Number(r.rt))?.hadirHariH ?? r.d);
                        return { ...bulan, hadirHariH: nilai.reduce((jumlah, n) => jumlah + n, 0) };
                    }))
                }
                trenGizi={
                    live?.trenGizi ??
                    (modeDataLive ? [] : trenStatusGizi(rtDashboard))
                }
                perluPerhatian={
                    live?.perluPerhatian ??
                    (modeDataLive ? [] : perluPerhatian(periodeId, rtDashboard))
                }
                periodeTerisi={
                    modeDataLive
                        ? (berandaServer?.periodeTerisi ?? null)
                        : periodeTerakhirTerisi()
                }
                belumTerkirim={antrean}
                onCobaKirim={onCobaKirim}
                onPindahPeriode={onPindahPeriode}
                memuat={modeDataLive && berandaServer?.status !== 'siap'}
                sumberLive={modeDataLive}
                sasaranHistoris={live?.sasaranHistoris ?? false}
            />
        );
    }

    if (rute.nama === 'balita' && periode !== null) {
        // Baris arsip dulu dengan koreksinya, lalu anak yang baru ditambah.
        // Anak baru berada di bawah dengan sengaja: ia satu-satunya baris tanpa
        // status gizi, dan menaruhnya di puncak daftar terbaca seperti galat.
        const sumber = modeDataLive
            ? (anakServer ?? [])
            : daftarAnak(periodeId);
        const baris = sumber
            .map((b) => terapkanKoreksi(b, koreksi[b.anakId]))
            .concat(
                anakServer === undefined
                    ? tambahan.map((t, i) => keBaris(t, i, periode))
                    : [],
            );

        return (
            <DaftarAnak
                anak={baris}
                wilayahRt={wilayahRt}
                rw={data.meta.rw}
                peran={peran}
                rtTerkunci={rtLingkup}
                periode={periode}
                standarLms={standarLms}
                onSimpanAnak={onSimpanAnak}
                onTambahAnak={onTambahAnak}
                sumberData={modeDataLive ? 'live' : 'contoh'}
                statusMuat={statusAnakServer}
                pesanGalat={pesanGalatAnakServer}
                onMuatUlang={onMuatUlangAnakServer}
            />
        );
    }

    if (
        (rute.nama === 'detail' || rute.nama === 'riwayat') &&
        periode !== null
    ) {
        if (detailServer?.status === 'memuat') {
            return <MemuatData />;
        }

        if (detailServer?.status === 'tidak-ada') {
            return <TidakDitemukan />;
        }

        if (detailServer?.status === 'galat') {
            return (
                <GalatData
                    pesan="Detail balita belum dapat dimuat. Silakan coba lagi."
                    onMuatUlang={() => window.location.reload()}
                />
            );
        }

        const detail =
            detailServer?.status === 'siap'
                ? {
                      anak: detailServer.anak,
                      pengukuran: detailServer.pengukuran,
                      garisSd:
                          detailServer.garisSd.length > 0
                              ? detailServer.garisSd
                              : data.garisSdBbU,
                  }
                : detailAnak(rute.id);

        if (detail === null) {
            return <TidakDitemukan />;
        }

        const anak = terapkanIdentitas(
            detail.anak,
            koreksi[rute.id],
            periodeId,
        );

        if (rute.nama === 'riwayat') {
            return (
                <RiwayatPenimbangan
                    anak={anak}
                    pengukuran={detail.pengukuran}
                    periode={periode}
                    ambang={ambang}
                    sumberLive={modeDataLive}
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
                standarLms={standarLms}
                peran={peran}
                periode={periode}
                ambang={ambang}
                wilayahRt={
                    modeDataLive && detailServer?.status === 'siap'
                        ? (detailServer.wilayahRt ?? wilayahRt)
                        : wilayahRt
                }
                noWa={koreksi[rute.id]?.noWa ?? anak.noWa}
                lembaga={LEMBAGA}
                onSimpan={(patch) => onSimpanAnak(rute.id, patch)}
                sumberLive={modeDataLive}
                kembaliKe={
                    peran === 'kms' || (peran === 'admin' && rute.dariKms)
                        ? { href: '/kms', label: 'Pemeriksaan KMS' }
                        : undefined
                }
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
                laporanLive={modeDataLive ? laporanServer : {
                    data: (() => {
                        const laporan = laporanDemo(periodeId);
                        if (rtLingkup === null) return laporan;
                        const bulanan = laporan.bulanan.filter((baris) => baris.rt === rtLingkup);
                        const riwayat2T = laporan.riwayat2T.filter((baris) => baris.rt === rtLingkup);
                        return { ...laporan, bulanan, riwayat2T, ringkasan: { ...laporan.ringkasan, anakDiukur: bulanan.length, denganDuaT: riwayat2T.length } };
                    })(),
                    status: 'siap',
                    pesanGalat: null,
                    muatUlang: () => undefined,
                    unduh: (format = 'zscore') => unduhLaporanDemo(periodeId, format, rtLingkup),
                    onSesiBerakhir: () => undefined,
                }}
                demo={!modeDataLive}
                bolehUnduh={peran === 'bidan' || peran === 'admin'}
            />
        );
    }

    if (rute.nama === 'sasaran') {
        const demoSasaran = sasaranDemo(periodeId);
        const demoPeriode = periodeSasaranDemo();

        return (
            <SasaranImpor
                sasaranAwal={modeDataLive ? undefined : demoSasaran}
                periodeAwal={demoPeriode}
                wilayahRt={wilayahRt}
            />
        );
    }

    if (rute.nama === 'kms') {
        return (
            <PemeriksaanKms
                demo={!modeDataLive}
                onSesiBerakhir={onSesiBerakhir}
            />
        );
    }

    if (rute.nama === 'kartu-sasaran') {
        if (modeDataLive && statusAnakServer !== 'siap') {
            return statusAnakServer === 'galat' ? (
                <GalatData
                    pesan="Daftar kartu belum dapat dimuat."
                    onMuatUlang={
                        onMuatUlangAnakServer ??
                        (() => window.location.reload())
                    }
                />
            ) : (
                <MemuatData judul="Memuat kartu balita…" />
            );
        }

        const balitaDaftar = modeDataLive
            ? (kartuServer ?? [])
            : balitaKartu(periodeId);

        return (
            <KartuSasaran
                balita={balitaDaftar}
                wilayahRt={wilayahRt}
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
                demo={!modeDataLive}
                terakhirDiubah={
                    modeDataLive ? undefined : PENGATURAN_TERAKHIR_DIUBAH
                }
                riwayat={modeDataLive ? [] : RIWAYAT_PENGATURAN_CONTOH}
                riwayatTersedia={!modeDataLive}
            />
        );
    }

    return <TidakDitemukan />;
}

function TidakDitemukan() {
    return (
        <StateHalaman
            jenis="kosong"
            judul="Halaman tidak ditemukan"
            pesan="Pilih menu di sidebar untuk melanjutkan."
        />
    );
}

function MemuatData({ judul = 'Memuat data…' }: { judul?: string }) {
    return <StateHalaman jenis="memuat" judul={judul} />;
}

function GalatData({
    pesan,
    onMuatUlang,
}: {
    pesan: string | null;
    onMuatUlang: () => void;
}) {
    return (
        <StateHalaman
            jenis="galat"
            judul="Data belum dapat dimuat"
            pesan={pesan ?? 'Periksa koneksi, lalu coba lagi.'}
        >
            <button
                type="button"
                onClick={onMuatUlang}
                className="tombol-kedua mt-4"
            >
                Coba lagi
            </button>
        </StateHalaman>
    );
}
