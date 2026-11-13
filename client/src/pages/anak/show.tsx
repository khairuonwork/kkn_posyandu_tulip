/**
 * Detail anak — docs/10-prd-demo-frontend.md bagian 6.5.
 *
 * Layar yang paling sering membuat client mengangguk: riwayat pertumbuhan satu
 * anak sebagai satu garis.
 *
 * Urutannya sengaja vonis dulu, identitas belakangan. Kader membuka layar ini
 * untuk tahu kondisi anaknya, bukan untuk membaca ulang NIK yang barusan ia
 * klik namanya.
 */

import { CreditCard, Info, Pencil } from 'lucide-react';
import { useState } from 'react';
import DialogKirimWa from '@/components/dialog-kirim-wa';
import Halaman from '@/components/halaman';
import IkonWhatsApp from '@/components/ikon-whatsapp';
import { nadaKategori } from '@/components/status-gizi-badge';
import {
    labelIndeks,
    namaTampil,
    satuan,
    tanggalPanjang,
    umurBulanPada,
    umurPanjang,
} from '@/lib/format';
import { tandaGizi, tentukanKesimpulan } from '@/lib/kesimpulan-gizi';
import { buatTautanLembar } from '@/lib/lembar';
import { penilaianLayak, terbaruUntuk } from '@/lib/penilaian-utama';
import { kalimatKesimpulan, nomorBaku, susunPesan } from '@/lib/pesan-wa';
import type { DiskusiKiaWa } from '@/lib/pesan-wa';
import type { Pengukuran } from '@/types/posyandu';
import { DialogCetak } from './detail/dialog-cetak';
import { DialogUbah } from './detail/dialog-ubah';
import { StatusNaik } from './detail/status-naik';
import { TabGrafik } from './detail/tab-grafik';
import { TabKurva } from './detail/tab-kurva';
import { TabProfil } from './detail/tab-profil';
import { TabRiwayat } from './detail/tab-riwayat';
import { TabStatus } from './detail/tab-status';
import { TAB_DETAIL, URUT_NADA } from './detail/tipe';
import type { AmbangDetail, DetailAnakProps, TabDetail } from './detail/tipe';

export type { AmbangDetail };
export { StatusNaik };

/** Nomor uji WhatsApp dari client/.env.local; null di lingkungan sebenarnya. */
const NOMOR_UJI = nomorBaku(import.meta.env.VITE_WA_NOMOR_UJI);

export default function DetailAnak({
    anak,
    pengukuran,
    standarLms,
    peran,
    periode,
    ambang,
    wilayahRt,
    noWa,
    lembaga,
    onSimpan,
    sumberLive = false,
    kembaliKe = { href: '/balita', label: 'Data Balita' },
}: DetailAnakProps) {
    const [umurDisorot, setUmurDisorot] = useState<number | null>(null);
    const [tabAktif, setTabAktif] = useState<TabDetail>(
        peran === 'kms' ? 'kurva' : 'profil',
    );
    const [arahTab, setArahTab] = useState<'maju' | 'mundur'>('maju');
    const [dialog, setDialog] = useState<'ubah' | 'cetak' | 'wa' | null>(null);
    const [infoKiaWa, setInfoKiaWa] = useState<DiskusiKiaWa | null>(null);
    const bolehUbah =
        peran !== 'kms' &&
        onSimpan !== undefined &&
        (peran !== 'kader' ||
            (anak.rt !== null && wilayahRt.includes(anak.rt)));
    const bolehCetak = peran !== 'kader' && peran !== 'kms';
    const terbaru = terbaruUntuk(pengukuran, periode);
    const nama = namaTampil(anak.nama);
    const inisial = nama
        .split(' ')
        .filter((bagian) => bagian.length > 0)
        .map((bagian) => bagian[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    // Umur dihitung terhadap periode yang dilihat, bukan diambil dari
    // pengukuran terakhir. Untuk anak yang dua bulan tidak hadir, umur lama itu
    // salah — dan ia juga yang memilih label PB/U atau TB/U serta kalimat cara
    // ukur, sehingga seluruh halaman bisa memakai protokol yang keliru.
    const umur = umurBulanPada(anak.tglLahir, periode.tanggalKegiatan);

    const hasilTerakhir = pengukuran.find(
        (p) => p.statusKehadiran === 'hadir' && p.tanggalUkur !== null,
    );
    const indeksTidakWajar =
        terbaru === null
            ? []
            : (['BB_TB', 'BB_U', 'TB_U'] as const).filter(
                  (namaIndeks) => terbaru.penilaian[namaIndeks]?.tidakWajar,
              );

    const indeks =
        terbaru === null
            ? []
            : [
                  {
                      label: labelIndeks('BB_TB', umur),
                      nilai: penilaianLayak(terbaru.penilaian.BB_TB),
                  },
                  {
                      label: 'BB/U',
                      nilai: penilaianLayak(terbaru.penilaian.BB_U),
                  },
                  {
                      label: labelIndeks('TB_U', umur),
                      nilai: penilaianLayak(terbaru.penilaian.TB_U),
                  },
              ];

    // Vonis terberat memimpin. Array.sort stabil, jadi saat semuanya sama
    // beratnya urutan aslinya bertahan dan BB/TB tetap di depan.
    const terurut = [...indeks].sort(
        (a, b) =>
            URUT_NADA[nadaKategori(a.nilai?.kategori ?? null)] -
            URUT_NADA[nadaKategori(b.nilai?.kategori ?? null)],
    );

    // Aturan yang sama dipakai pesan WhatsApp dan Lembar Hasil.
    const penilaianUtama = terbaru?.penilaian ?? {};
    const { perluRujukan, perluWaspada, perluTindakLanjut } = tandaGizi(
        penilaianUtama,
        ambang,
    );
    const kesimpulanWa = tentukanKesimpulan(penilaianUtama, ambang);
    // Anjuran yang sama dikirim lewat WhatsApp (lib/pesan-wa.ts).
    const edukasiKms =
        indeksTidakWajar.length > 0 ||
        indeks.every((i) => i.nilai === undefined)
            ? 'Data pengukuran ini perlu diperiksa atau diukur ulang bersama kader atau petugas kesehatan sebelum status gizi disimpulkan.'
            : kalimatKesimpulan(kesimpulanWa, nama).anjuran;

    // Nomor uji (client/.env.local) menggantikan nomor orang tua, sehingga
    // pengujian tidak pernah menyentuh nomor yang sebenarnya.
    const nomorTujuan = NOMOR_UJI ?? nomorBaku(noWa);

    const umurTerbaru = terbaru?.umurBulan ?? null;
    const duaBulanLalu =
        umurTerbaru === null
            ? undefined
            : pengukuran.find(
                  (p) =>
                      p.statusKehadiran === 'hadir' &&
                      p.umurBulan === umurTerbaru - 2,
              );

    const alasanTanpaDataWa =
        terbaru === null
            ? `Belum ada hasil pengukuran pada ${periode.label}, sehingga tidak ada yang dapat dikirim.${
                  hasilTerakhir === undefined
                      ? ''
                      : ` Pengukuran terakhir tercatat ${tanggalPanjang(hasilTerakhir.tanggalUkur)}; lihat tab Riwayat Ukur, lalu pilih periode bulan itu di kiri atas.`
              }`
            : indeksTidakWajar.length > 0
              ? 'Hasil periode ini ditandai tidak wajar. Verifikasi ulang sebelum dikirim ke orang tua.'
              : null;

    // Tombol kirim tidak dirender bila tak ada yang dapat dikirim; sebabnya
    // ditulis sebagai satu baris di bawah judul (docs/prd/feedback/F03).
    const alasanTanpaWa =
        alasanTanpaDataWa ??
        (nomorTujuan !== null
            ? null
            : (noWa ?? '').trim() === ''
              ? 'Nomor WhatsApp orang tua belum diisi. Isi lewat Ubah data, atau kirim dari bagian bawah tab Status Gizi.'
              : 'Nomor WhatsApp orang tua tidak sah. Periksa lewat Ubah data.');

    // Titik kurva hanya dari pengukuran yang punya umur dan berat sekaligus.
    const riwayatKurva = pengukuran
        .filter(
            (p): p is Pengukuran & { umurBulan: number; bbKg: number } =>
                p.umurBulan !== null &&
                p.umurBulan >= 0 &&
                p.umurBulan <= 60 &&
                p.bbKg !== null &&
                p.bbKg > 0 &&
                !p.penilaian.BB_U?.tidakWajar,
        )
        .map((p) => [p.umurBulan, p.bbKg] as [number, number])
        .sort((a, b) => a[0] - b[0]);

    const titikPerluVerifikasi = pengukuran.filter(
        (p) => p.bbKg !== null && p.penilaian.BB_U?.tidakWajar,
    ).length;

    /**
     * Selisih yang tidak masuk akal secara biologis terhadap bulan sebelumnya.
     */
    const janggal = (urutan: number): string | null => {
        const kini = pengukuran[urutan];
        const lalu = pengukuran[urutan + 1];

        if (lalu === undefined) {
            return null;
        }

        if (
            kini.tinggiCm !== null &&
            lalu.tinggiCm !== null &&
            lalu.tinggiCm - kini.tinggiCm > ambang.tinggiBerkurangMax
        ) {
            return `Tinggi berkurang ${satuan(lalu.tinggiCm - kini.tinggiCm, 'cm')} dari bulan sebelumnya`;
        }

        if (kini.bbKg !== null && lalu.bbKg !== null) {
            const selisih = kini.bbKg - lalu.bbKg;

            if (selisih > ambang.naikMax) {
                return `Berat naik ${satuan(selisih, 'kg', 2)} dalam sebulan`;
            }

            if (-selisih > ambang.turunMax) {
                return `Berat turun ${satuan(-selisih, 'kg', 2)} dalam sebulan`;
            }
        }

        return null;
    };

    return (
        <Halaman
            judul={nama}
            kembali={kembaliKe}
            subjudul={`${umur !== null ? `${umurPanjang(umur)}, ` : ''}${
                anak.rt === null
                    ? 'RT belum tercatat'
                    : `RT ${anak.rt.padStart(2, '0')}`
            }. ${sumberLive ? 'Database live' : 'Data contoh'}.`}
            aksi={
                <>
                    {bolehCetak && (
                        <button
                            type="button"
                            onClick={() => setDialog('cetak')}
                            className="tombol-kedua"
                        >
                            <CreditCard
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Cetak kartu
                        </button>
                    )}
                    {bolehUbah && (
                        <button
                            type="button"
                            onClick={() => setDialog('ubah')}
                            className="tombol-kedua"
                        >
                            <Pencil
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Ubah data
                        </button>
                    )}
                    {peran !== 'kms' && alasanTanpaWa === null && (
                        <button
                            type="button"
                            onClick={() => setDialog('wa')}
                            className="tombol-utama"
                        >
                            <IkonWhatsApp className="size-5" />
                            Kirim ke WhatsApp
                        </button>
                    )}
                </>
            }
        >
            {peran !== 'kms' && alasanTanpaWa !== null && (
                <p
                    role="status"
                    className="mb-5 flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                    <Info
                        className="mt-0.5 size-4 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    {alasanTanpaWa}
                </p>
            )}

            <div
                className="bilah-tab mb-7"
                role="tablist"
                aria-label="Kategori detail anak"
            >
                <div className="flex flex-wrap gap-1.5">
                    {TAB_DETAIL.map((tab, indeksTab) => {
                        const aktif = tabAktif === tab.nilai;

                        return (
                            <button
                                key={tab.nilai}
                                id={`tab-${tab.nilai}`}
                                type="button"
                                role="tab"
                                aria-selected={aktif}
                                aria-controls={`panel-${tab.nilai}`}
                                tabIndex={aktif ? 0 : -1}
                                onClick={() => {
                                    if (tab.nilai === tabAktif) {
return;
}

                                    const indeksAktif = TAB_DETAIL.findIndex(
                                        (item) => item.nilai === tabAktif,
                                    );
                                    setArahTab(indeksTab > indeksAktif ? 'maju' : 'mundur');
                                    setTabAktif(tab.nilai);
                                }}
                                onKeyDown={(event) => {
                                    const jumlah = TAB_DETAIL.length;
                                    let berikut: number;

                                    switch (event.key) {
                                        case 'ArrowRight':
                                            berikut = (indeksTab + 1) % jumlah;
                                            break;
                                        case 'ArrowLeft':
                                            berikut = (indeksTab + jumlah - 1) % jumlah;
                                            break;
                                        case 'Home':
                                            berikut = 0;
                                            break;
                                        case 'End':
                                            berikut = jumlah - 1;
                                            break;
                                        default:
                                            return;
                                    }

                                    event.preventDefault();
                                    const tujuan = event.currentTarget.parentElement
                                        ?.querySelector<HTMLButtonElement>(
                                            `#tab-${TAB_DETAIL[berikut].nilai}`,
                                        );
                                    tujuan?.focus();
                                    tujuan?.click();
                                }}
                                className="tab aria-selected:bg-primary aria-selected:text-primary-foreground"
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="detail-panel" data-arah={arahTab}>
                <TabProfil
                    anak={anak}
                    nama={nama}
                    inisial={inisial}
                    umur={umur}
                    tersembunyi={tabAktif !== 'profil'}
                />

                <TabStatus
                    anak={anak}
                    terbaru={terbaru}
                    hasilTerakhir={hasilTerakhir}
                    periode={periode}
                    peran={peran}
                    terurut={terurut}
                    indeks={indeks}
                    indeksTidakWajar={indeksTidakWajar}
                    perluRujukan={perluRujukan}
                    perluWaspada={perluWaspada}
                    perluTindakLanjut={perluTindakLanjut}
                    edukasiKms={edukasiKms}
                    ambang={ambang}
                    umur={umur}
                    sumberLive={sumberLive}
                    alasanTanpaDataWa={alasanTanpaDataWa}
                    tersembunyi={tabAktif !== 'status'}
                    onInfoKiaChange={setInfoKiaWa}
                    onBukaWa={(info) => {
                        setInfoKiaWa(info);
                        setDialog('wa');
                    }}
                />

            <TabKurva
                anak={anak}
                nama={nama}
                umur={umur}
                periode={periode}
                terbaru={terbaru}
                pengukuran={pengukuran}
                standarLms={standarLms}
                umurDisorot={umurDisorot}
                riwayatKurva={riwayatKurva}
                titikPerluVerifikasi={titikPerluVerifikasi}
                tanggalUkurTerakhir={hasilTerakhir?.tanggalUkur}
                onLihatRiwayat={() => {
                    setArahTab('maju');
                    setTabAktif('riwayat');
                    document.getElementById('tab-riwayat')?.focus();
                }}
                tersembunyi={tabAktif !== 'kurva'}
            />

                <TabGrafik
                    anak={anak}
                    nama={nama}
                    umur={umur}
                    periode={periode}
                    terbaru={terbaru}
                    pengukuran={pengukuran}
                    standarLms={standarLms}
                    tersembunyi={tabAktif !== 'grafik'}
                />

                <TabRiwayat
                    pengukuran={pengukuran}
                    umur={umur}
                    umurDisorot={umurDisorot}
                    setUmurDisorot={setUmurDisorot}
                    janggal={janggal}
                    tersembunyi={tabAktif !== 'riwayat'}
                />
            </div>

            {dialog === 'ubah' && (
                <DialogUbah
                    anak={anak}
                    periodeId={periode.id}
                    noWa={noWa}
                    wilayahRt={wilayahRt}
                    onTutup={() => setDialog(null)}
                    onSimpan={async (patch) => {
                        await onSimpan?.(patch);
                        setDialog(null);
                    }}
                />
            )}
            {dialog === 'wa' && terbaru !== null && nomorTujuan !== null && (
                <DialogKirimWa
                    animasiDetail
                    nama={nama}
                    nomor={nomorTujuan}
                    modeUji={NOMOR_UJI !== null}
                    susun={(tautan) =>
                        susunPesan({
                            nama,
                            umurBulan: umur,
                            terbaru,
                            duaBulanLalu,
                            kesimpulan: kesimpulanWa,
                            diskusiKia: infoKiaWa,
                            tautan,
                            lembaga,
                        })
                    }
                    buatTautan={
                        sumberLive
                            ? () => buatTautanLembar(anak.id, periode.id)
                            : async () => `${window.location.href.split('#')[0]}#/hasil-demo/${anak.id}/${periode.id}`
                    }
                    onTutup={() => setDialog(null)}
                />
            )}
            {dialog === 'cetak' && (
                <DialogCetak
                    anak={anak}
                    lembaga={lembaga}
                    onTutup={() => setDialog(null)}
                />
            )}
        </Halaman>
    );
}
