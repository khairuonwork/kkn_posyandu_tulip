/**
 * Lembar Hasil — halaman yang dibuka orang tua dari tautan di WhatsApp.
 *
 * Tanpa masuk: tautan bertanda tangan itulah kuncinya. Rancangannya mengikuti
 * mockup "Lembar Hasil Balita": ponsel lebih dulu, huruf besar, kesimpulan di
 * atas, lalu angka, tombol PDF, dan grafik.
 *
 * "Unduh PDF" memakai jendela cetak peramban (Simpan sebagai PDF). Dokumen A4
 * dipasang di `body`, dengan pratinjau A4 dan bagian diskusi bila tersedia,
 * lembar kartu balita (aturan `.lembar-cetak` di app.css).
 */

import { BookOpen, Clock, Download, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import GrafikStatis from '@/components/grafik-statis';
import PanduanKeluargaKia, {
    DiskusiKiaCetak,
} from '@/components/panduan-keluarga-kia';
import StatusGiziBadge from '@/components/status-gizi-badge';
import { PENGATURAN_BAWAAN, standarLms } from '@/data/contoh/store';
import {
    angka,
    labelIndeks,
    satuan,
    tanggalPanjang,
    umurPanjang,
    zScore,
} from '@/lib/format';
import { tentukanKesimpulan } from '@/lib/kesimpulan-gizi';
import type { EdukasiLembarKia, LembarApi } from '@/lib/lembar';
import { useLembar } from '@/lib/lembar';
import { Head } from '@/lib/nav';
import { penilaianLayak, terbaruUntuk } from '@/lib/penilaian-utama';
import { kalimatKesimpulan, namaDepan } from '@/lib/pesan-wa';
import type { Kesimpulan } from '@/lib/pesan-wa';
import { susunTabel } from '@/lib/z-score';
import type { Indeks, Pengukuran } from '@/types/posyandu';

const LEMBAGA = 'Posyandu Tulip · RW 18 Kelurahan Citeureup';

/** Warna kartu kesimpulan menurut tingkatnya. */
const NADA_KESIMPULAN: Record<Kesimpulan, { kartu: string; judul: string }> = {
    sesuai: {
        kartu: 'border-tone-green/30 bg-tone-green-bg',
        judul: 'text-tone-green',
    },
    dipantau: {
        kartu: 'border-tone-amber/40 bg-tone-amber-bg',
        judul: 'text-tone-amber',
    },
    diperiksa: {
        kartu: 'border-tone-red/30 bg-tone-red-bg',
        judul: 'text-tone-red',
    },
};

const tanggalBerlaku = (iso: string) => tanggalPanjang(iso.slice(0, 10));

export default function LembarHasil({ token }: { token: string }) {
    const lembar = useLembar(token);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Hasil penimbangan & rekomendasi tumbuh kembang" />
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex h-16 max-w-2xl items-center gap-2.5 px-4">
                    <ShieldCheck
                        className="size-7 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <div>
                        <p className="text-base leading-tight font-extrabold">
                            SIMPATIK Posyandu
                        </p>
                        <p className="text-[13px] font-semibold text-muted-foreground">
                            RW 18 Kelurahan Citeureup · Lembar Ringkasan &
                            Edukasi Keluarga
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 pt-6 pb-10">
                {lembar.status === 'memuat' && (
                    <p
                        role="status"
                        className="text-base text-muted-foreground"
                    >
                        Memuat hasil…
                    </p>
                )}
                {lembar.status === 'siap' && <Isi data={lembar.data} />}
                {lembar.status === 'kedaluwarsa' && (
                    <Pesan judul="Tautan ini sudah tidak berlaku">
                        Tautan hasil penimbangan hanya berlaku selama 20 hari.
                        Untuk mendapatkan hasilnya lagi, silakan minta tautan
                        baru kepada kader atau bidan Posyandu Tulip.
                    </Pesan>
                )}
                {lembar.status === 'tidak-sah' && (
                    <Pesan judul="Tautan tidak dikenali">
                        Periksa kembali tautan yang dikirim, atau minta tautan
                        baru kepada kader atau bidan Posyandu Tulip.
                    </Pesan>
                )}
                {lembar.status === 'galat' && (
                    <Pesan judul="Hasil belum dapat dimuat">
                        Terjadi gangguan saat memuat hasil. Silakan coba lagi
                        beberapa saat lagi.
                    </Pesan>
                )}
            </main>
        </div>
    );
}

function Pesan({ judul, children }: { judul: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-3.5 pt-12 text-center">
            <div className="flex size-18 items-center justify-center rounded-full bg-tone-amber-bg text-tone-amber">
                <Clock
                    className="size-9"
                    strokeWidth={2.2}
                    aria-hidden="true"
                />
            </div>
            <h1 className="text-2xl leading-tight font-extrabold text-balance">
                {judul}
            </h1>
            <p className="max-w-80 text-lg leading-relaxed text-pretty text-muted-foreground">
                {children}
            </p>
        </div>
    );
}

/**
 * Nama berkas PDF: peramban memakai judul halaman saat mencetak, jadi judulnya
 * diganti hanya selama dokumen dicetak. Nama depan dan bulan ukur membedakan
 * berkas tiap anak dan tiap bulan; tanda yang tidak boleh ada di nama berkas
 * (`/ \ : * ? " < > |`) dibuang.
 */
function useNamaBerkas(judul: string) {
    useEffect(() => {
        const asli = document.title;
        const pasang = () => {
            document.title = judul;
        };
        const kembalikan = () => {
            document.title = asli;
        };

        window.addEventListener('beforeprint', pasang);
        window.addEventListener('afterprint', kembalikan);

        return () => {
            window.removeEventListener('beforeprint', pasang);
            window.removeEventListener('afterprint', kembalikan);
        };
    }, [judul]);
}

function Isi({ data }: { data: LembarApi }) {
    const [pratinjau, setPratinjau] = useState(false);
    const tabel = useMemo(() => susunTabel(standarLms), []);
    const pengukuran: Pengukuran[] = data.pengukuran.map((p) => ({
        ...p,
        anakId: 0,
        ntob: null,
        catatanUkur: null,
    }));
    const terbaru = terbaruUntuk(pengukuran, {
        id: data.periodeId,
        label: data.periodeId,
        tanggalKegiatan: null,
    });

    useNamaBerkas(
        terbaru === null
            ? 'Laporan Pertumbuhan'
            : `Laporan Pertumbuhan ${namaDepan(data.anak.namaDepan)} - ${tanggalPanjang(terbaru.tanggalUkur).replace(/^\d+\s/, '')} - Posyandu Tulip`.replace(
                  /[\\/:*?"<>|]/g,
                  '',
              ),
    );

    if (terbaru === null) {
        return (
            <Pesan judul="Hasil tidak ditemukan">
                Hasil penimbangan untuk tautan ini tidak ditemukan. Silakan
                tanyakan kepada kader atau bidan Posyandu Tulip.
            </Pesan>
        );
    }

    const nama = namaDepan(data.anak.namaDepan);
    const umur = terbaru.umurBulan;
    const dinilai = (['BB_TB', 'BB_U', 'TB_U'] as const).some(
        (i) => penilaianLayak(terbaru.penilaian[i]) !== undefined,
    );
    const kesimpulan = tentukanKesimpulan(terbaru.penilaian, PENGATURAN_BAWAAN);
    const kalimat = kalimatKesimpulan(kesimpulan, nama);
    const nada = NADA_KESIMPULAN[kesimpulan];
    const kategori = (i: Indeks) =>
        penilaianLayak(terbaru.penilaian[i])?.kategori ?? null;
    const duaBulanLalu =
        umur === null
            ? undefined
            : pengukuran.find(
                  (p) =>
                      p.statusKehadiran === 'hadir' &&
                      p.umurBulan === umur - 2 &&
                      p.bbKg !== null,
              );
    const selisih =
        terbaru.bbKg !== null && duaBulanLalu?.bbKg != null
            ? terbaru.bbKg - duaBulanLalu.bbKg
            : null;
    const panel = Math.min(48, Math.floor((umur ?? 0) / 12) * 12);
    const berbaring = umur !== null && umur < 24;
    const kodeTb = labelIndeks('TB_U', umur);
    const edukasiKia = data.edukasiKia;

    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-sm font-bold text-muted-foreground">
                    Ringkasan Hasil Penimbangan & Edukasi Keluarga
                </p>
                <h1 className="mt-0.5 text-3xl leading-tight font-extrabold">
                    {nama}
                </h1>
                <p className="mt-1.5 text-base text-muted-foreground">
                    {tanggalPanjang(terbaru.tanggalUkur)} · umur{' '}
                    {umurPanjang(umur)}
                </p>
            </div>

            {dinilai ? (
                <section
                    className={`rounded-2xl border p-4 ${nada.kartu}`}
                    aria-labelledby="judul-kesimpulan"
                >
                    <h2
                        id="judul-kesimpulan"
                        className={`text-xl leading-snug font-extrabold text-balance ${nada.judul}`}
                    >
                        {kalimat.judul}
                    </h2>
                    <p className="mt-2.5 text-base leading-relaxed text-pretty">
                        {kalimat.anjuran}
                    </p>
                </section>
            ) : (
                <p className="rounded-2xl bg-surface-subtle p-4 text-base">
                    Hasil ini belum dapat dinilai. Silakan tanyakan kepada kader
                    atau bidan Posyandu Tulip.
                </p>
            )}

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <h2 className="px-4 pt-3.5 pb-2.5 text-lg font-extrabold">
                    Hasil ukur & status gizi
                </h2>
                {terbaru.bbKg !== null && (
                    <Baris
                        label="Berat badan"
                        nilai={satuan(terbaru.bbKg, 'kg')}
                        kategori={kategori('BB_U')}
                    />
                )}
                {terbaru.tinggiCm !== null && (
                    <Baris
                        label={berbaring ? 'Panjang badan' : 'Tinggi badan'}
                        nilai={satuan(terbaru.tinggiCm, 'cm')}
                        kategori={kategori('TB_U')}
                    />
                )}
                {kategori('BB_TB') !== null && (
                    <Baris
                        label={`Status gizi (${labelIndeks('BB_TB', umur)})`}
                        nilai={null}
                        kategori={kategori('BB_TB')}
                    />
                )}
                {terbaru.likaCm !== null && (
                    <Baris
                        label="Lingkar kepala"
                        nilai={satuan(terbaru.likaCm, 'cm')}
                        kategori={kategori('LIKA_U')}
                    />
                )}
                {terbaru.lilaCm !== null && (
                    <Baris
                        label="Lingkar lengan atas"
                        nilai={satuan(terbaru.lilaCm, 'cm')}
                        kategori={null}
                    />
                )}
                {selisih !== null && duaBulanLalu !== undefined && (
                    <p className="border-t border-border px-4 py-3.5 text-[15px] text-muted-foreground">
                        Berat badan{' '}
                        <b className="text-foreground">
                            {Math.abs(selisih) < 0.05
                                ? 'tetap'
                                : `${selisih > 0 ? 'naik' : 'turun'} ${satuan(Math.abs(selisih), 'kg')}`}
                        </b>{' '}
                        dibanding 2 bulan lalu (umur {duaBulanLalu.umurBulan}{' '}
                        bulan: {satuan(duaBulanLalu.bbKg, 'kg')}).
                    </p>
                )}
            </section>

            {edukasiKia && <KartuEdukasiKia nama={nama} edukasi={edukasiKia} />}

            <section>
                <button
                    type="button"
                    className="tombol-kedua mb-3 w-full"
                    onClick={() => setPratinjau(true)}
                >
                    <BookOpen className="size-5" aria-hidden="true" />
                    Lihat tata letak cetak
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="tombol-utama !min-h-15 w-full !text-lg"
                >
                    <Download
                        className="size-6"
                        strokeWidth={2.6}
                        aria-hidden="true"
                    />
                    Unduh ringkasan lengkap & kurva KMS (PDF)
                </button>
                <p className="mt-2.5 text-center text-sm text-muted-foreground">
                    Berkas berisi ringkasan gizi, hasil diskusi & rekomendasi
                    Buku KIA, serta seluruh grafik pertumbuhan. Pada jendela
                    yang terbuka, pilih{' '}
                    <b className="text-foreground">Simpan sebagai PDF</b>.
                </p>
            </section>

            {terbaru.bbKg !== null && (
                <section className="rounded-2xl border border-border bg-card p-3.5">
                    <h2 className="text-lg font-extrabold">
                        Grafik berat badan (KMS)
                    </h2>
                    <p className="mt-0.5 mb-2 text-sm text-muted-foreground">
                        Titik hitam adalah berat badan {nama} tiap bulan.
                    </p>
                    <div className="mx-auto max-w-[420px]">
                        <GrafikStatis
                            indeks="BB_U"
                            kelamin={data.anak.jk}
                            pengukuran={pengukuran}
                            tabel={tabel}
                            panel={panel}
                            lebar={330}
                            tinggi={250}
                            teks={10.5}
                        />
                    </div>
                    <Legenda />
                </section>
            )}

            <section className="flex items-start gap-2.5 rounded-2xl bg-tone-green-bg p-4 text-[15px] leading-relaxed">
                <Clock
                    className="mt-0.5 size-5 shrink-0 text-tone-green"
                    strokeWidth={2.4}
                    aria-hidden="true"
                />
                <p>
                    Tautan ini berlaku sampai{' '}
                    <b>{tanggalBerlaku(data.kedaluwarsa)}</b>. Unduh dan simpan
                    PDF-nya agar tetap bisa dibuka kapan saja.
                </p>
            </section>

            <footer className="px-1 text-sm leading-relaxed text-muted-foreground">
                <p>
                    Pertanyaan tentang hasil ini? Silakan tanyakan kepada kader
                    atau bidan Posyandu Tulip pada penimbangan berikutnya.
                </p>
                <p className="mt-2.5 text-[13px]">
                    Dihitung dengan Standar Pertumbuhan WHO 2006 dan panduan
                    Buku KIA 2024. Hasil ini bukan pengganti pemeriksaan oleh
                    tenaga kesehatan.
                </p>
            </footer>

            {createPortal(
                <Dokumen
                    pratinjau={pratinjau}
                    onTutup={() => setPratinjau(false)}
                    data={data}
                    pengukuran={pengukuran}
                    terbaru={terbaru}
                    tabel={tabel}
                    panel={panel}
                    kesimpulan={kesimpulan}
                    selisih={selisih}
                    duaBulanLalu={duaBulanLalu}
                    kodeTb={kodeTb}
                />,
                document.body,
            )}
        </div>
    );
}

function KartuEdukasiKia({
    nama,
    edukasi,
}: {
    nama: string;
    edukasi: EdukasiLembarKia;
}) {
    const { diskusi, kelompok } = edukasi;

    return (
        <>
            {diskusi && (
                <section
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                    aria-labelledby="judul-diskusi-kia"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-subtle px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                            <BookOpen
                                className="size-5 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            <div>
                                <h2
                                    id="judul-diskusi-kia"
                                    className="text-lg leading-tight font-extrabold"
                                >
                                    Hasil Diskusi Tumbuh Kembang
                                </h2>
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {diskusi.kelompokLabel} · Dicatat{' '}
                                    {tanggalPanjang(diskusi.tanggal)} · Buku KIA
                                    hal. {diskusi.halaman}
                                </p>
                            </div>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                diskusi.dibahas
                                    ? 'bg-tone-green-bg text-tone-green'
                                    : 'bg-tone-amber-bg text-tone-amber'
                            }`}
                        >
                            {diskusi.dibahas
                                ? 'Sudah dibahas bersama orang tua'
                                : 'Catatan pemantauan'}
                        </span>
                    </div>

                    <div className="space-y-4 p-4">
                        <div
                            className={`rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${
                                diskusi.ringkasan.tidak > 0
                                    ? 'border-tone-amber bg-tone-amber-bg/60'
                                    : 'border-primary bg-surface-subtle'
                            }`}
                        >
                            <p className="font-extrabold">
                                Ringkasan pemantauan: {diskusi.ringkasan.ya}{' '}
                                sesuai (Ya) · {diskusi.ringkasan.tidak} perlu
                                perhatian (Tidak)
                                {diskusi.ringkasan.belum > 0
                                    ? ` · ${diskusi.ringkasan.belum} belum diamati`
                                    : ''}
                            </p>
                            <p className="mt-1">{diskusi.ringkasan.arahan}</p>
                        </div>

                        {(diskusi.catatan.trim() !== '' ||
                            diskusi.tindakLanjut.trim() !== '') && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {diskusi.catatan.trim() !== '' && (
                                    <div className="rounded-xl border border-border bg-surface p-3.5">
                                        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                                            Catatan pengamatan & cerita orang
                                            tua
                                        </p>
                                        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                                            {diskusi.catatan}
                                        </p>
                                    </div>
                                )}
                                {diskusi.tindakLanjut.trim() !== '' && (
                                    <div className="rounded-xl border border-border bg-surface p-3.5">
                                        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                                            Tindak lanjut yang disepakati
                                        </p>
                                        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                                            {diskusi.tindakLanjut}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <p className="mb-2 text-sm font-extrabold">
                                Rincian penanda yang dipantau bersama orang tua:
                            </p>
                            <ul className="divide-y divide-border rounded-xl border border-border">
                                {diskusi.butir.map((b, idx) => (
                                    <li
                                        key={b.id}
                                        className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm"
                                    >
                                        <span className="leading-snug">
                                            {idx + 1}. {b.teks}
                                        </span>
                                        <span
                                            className={`shrink-0 rounded-md px-2.5 py-0.5 text-xs font-extrabold ${
                                                b.jawaban === 'ya'
                                                    ? 'bg-tone-green-bg text-tone-green'
                                                    : b.jawaban === 'tidak'
                                                      ? 'bg-tone-amber-bg text-tone-amber'
                                                      : 'bg-surface-subtle text-muted-foreground'
                                            }`}
                                        >
                                            {b.jawaban === 'ya'
                                                ? 'Ya'
                                                : b.jawaban === 'tidak'
                                                  ? 'Perlu perhatian'
                                                  : 'Belum diamati'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            )}

            {kelompok && <PanduanKeluargaKia nama={nama} edukasi={edukasi} />}
        </>
    );
}

function Baris({
    label,
    nilai,
    kategori,
}: {
    label: string;
    nilai: string | null;
    kategori: string | null;
}) {
    return (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3.5">
            <div>
                <p className="text-[15px] font-semibold text-muted-foreground">
                    {label}
                </p>
                {nilai !== null && (
                    <p className="mt-0.5 text-xl font-extrabold">{nilai}</p>
                )}
            </div>
            {kategori !== null && <StatusGiziBadge kategori={kategori} />}
        </div>
    );
}

function Legenda() {
    const butir: [string, string][] = [
        ['#1E8C34', '−1 sampai +1 SD'],
        ['#6FB63C', '−2 s.d. −1 / +1 s.d. +2 SD'],
        ['#F2C300', '−3 s.d. −2 / +2 s.d. +3 SD'],
        ['#D92B0C', 'Garis −3 SD'],
    ];

    return (
        <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px]">
            {butir.map(([warna, teks]) => (
                <li key={teks} className="flex items-center gap-1.5">
                    <span
                        aria-hidden="true"
                        className="inline-block size-3 rounded-xs"
                        style={{ backgroundColor: warna }}
                    />
                    {teks}
                </li>
            ))}
        </ul>
    );
}

/** Dokumen A4 yang hanya tampil saat mencetak (Simpan sebagai PDF). */
function Dokumen({
    pratinjau,
    onTutup,
    data,
    pengukuran,
    terbaru,
    tabel,
    panel,
    kesimpulan,
    selisih,
    duaBulanLalu,
    kodeTb,
}: {
    pratinjau: boolean;
    onTutup: () => void;
    data: LembarApi;
    pengukuran: Pengukuran[];
    terbaru: Pengukuran;
    tabel: ReturnType<typeof susunTabel>;
    panel: number;
    kesimpulan: Kesimpulan;
    selisih: number | null;
    duaBulanLalu: Pengukuran | undefined;
    kodeTb: string;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const node = dialog.current;
        if (pratinjau && node && !node.open) node.showModal();
        if (!pratinjau && node?.open) node.close();
    }, [pratinjau]);
    const nama = data.anak.namaDepan;
    const umur = terbaru.umurBulan;
    const berbaring = umur !== null && umur < 24;
    const kalimat = kalimatKesimpulan(kesimpulan, nama);
    const nada = NADA_KESIMPULAN[kesimpulan];
    const edukasiKia = data.edukasiKia;

    const baris: {
        nama: string;
        kode: string;
        hasil: string;
        indeks: Indeks;
    }[] = [
        {
            nama: 'Berat badan',
            kode: 'BB/U',
            hasil: satuan(terbaru.bbKg, 'kg'),
            indeks: 'BB_U',
        },
        {
            nama: berbaring ? 'Panjang badan' : 'Tinggi badan',
            kode: kodeTb,
            hasil: satuan(terbaru.tinggiCm, 'cm'),
            indeks: 'TB_U',
        },
        {
            nama: 'Status gizi',
            kode: labelIndeks('BB_TB', umur),
            hasil: '',
            indeks: 'BB_TB',
        },
        {
            nama: 'Indeks massa tubuh',
            kode: 'IMT/U',
            hasil: '',
            indeks: 'IMT_U',
        },
        {
            nama: 'Lingkar lengan atas',
            kode: 'LILA/U',
            hasil: satuan(terbaru.lilaCm, 'cm'),
            indeks: 'LILA_U',
        },
        {
            nama: 'Lingkar kepala',
            kode: 'LIKA/U',
            hasil: satuan(terbaru.likaCm, 'cm'),
            indeks: 'LIKA_U',
        },
    ];
    const imt =
        terbaru.bbKg !== null &&
        terbaru.tinggiCm !== null &&
        terbaru.tinggiCm > 0
            ? terbaru.bbKg / (terbaru.tinggiCm / 100) ** 2
            : null;
    const tampil = baris
        .map((b) => ({
            ...b,
            hasil:
                b.indeks === 'IMT_U'
                    ? imt === null
                        ? ''
                        : `${angka(imt, 1)} kg/m²`
                    : b.hasil,
            nilai: penilaianLayak(terbaru.penilaian[b.indeks]),
        }))
        .filter(
            (b) => b.nilai !== undefined || (b.hasil !== '' && b.hasil !== '—'),
        );

    const kepala = (bagian: string) => (
        <div className="flex items-center justify-between gap-4 border-b-[3px] border-primary pb-3.5">
            <div className="flex items-center gap-3">
                <ShieldCheck
                    className="size-9 text-primary"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                <div>
                    <p className="text-[22px] leading-tight font-extrabold">
                        Ringkasan Pertumbuhan & Edukasi Balita
                    </p>
                    <p className="text-sm font-semibold text-muted-foreground">
                        {LEMBAGA}
                    </p>
                </div>
            </div>
            <p className="text-right text-[13px] leading-normal text-muted-foreground">
                {bagian}
            </p>
        </div>
    );
    const kaki = (
        <p className="mt-auto border-t border-border pt-2.5 text-[13px] leading-normal text-muted-foreground">
            Dihitung dengan Standar Pertumbuhan WHO 2006 (Permenkes No. 2 Tahun
            2020) dan panduan Buku KIA 2024. Hasil ini bukan pengganti
            pemeriksaan oleh tenaga kesehatan. Tautan sumber berlaku sampai{' '}
            {tanggalBerlaku(data.kedaluwarsa)}.
        </p>
    );

    return (
        <dialog
            ref={dialog}
            className={`lembar-cetak lembar-hasil-edukatif ${pratinjau ? 'pratinjau-hasil' : ''}`}
            aria-label="Pratinjau tata letak cetak"
            onCancel={(event) => {
                event.preventDefault();
                onTutup();
            }}
        >
            {pratinjau && (
                <div className="pratinjau-hasil__toolbar">
                    <div>
                        <strong>Pratinjau lembar cetak</strong>
                        <p>Ukuran A4 · isi dan gambar mengikuti hasil anak</p>
                    </div>
                    <select
                        className="isian"
                        aria-label="Bagian pratinjau"
                        onChange={(event) =>
                            dialog.current
                                ?.querySelectorAll(':scope > .halaman-hasil')
                                [Number(event.target.value)]?.scrollIntoView({
                                    block: 'start',
                                })
                        }
                    >
                        {[
                            'Hasil pengukuran',
                            ...(edukasiKia?.kelompok
                                ? ['Panduan keluarga']
                                : []),
                            ...(edukasiKia?.diskusi ? ['Catatan diskusi'] : []),
                            'Kurva pertumbuhan',
                        ].map((label, i) => (
                            <option key={label} value={i}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="tombol-kedua"
                        autoFocus
                        onClick={onTutup}
                    >
                        Tutup pratinjau
                    </button>
                    <button
                        type="button"
                        className="tombol-utama"
                        onClick={() => window.print()}
                    >
                        Cetak / Simpan PDF
                    </button>
                </div>
            )}
            <section className="halaman-hasil flex flex-col gap-3.5 text-base">
                {kepala('Hasil pengukuran')}
                <dl className="grid grid-cols-4 gap-3 text-sm">
                    {[
                        ['Nama balita', nama],
                        [
                            'Jenis kelamin',
                            data.anak.jk === 'P' ? 'Perempuan' : 'Laki-laki',
                        ],
                        ['Umur', umurPanjang(umur)],
                        ['Tanggal ukur', tanggalPanjang(terbaru.tanggalUkur)],
                    ].map(([k, v]) => (
                        <div key={k}>
                            <dt className="font-semibold text-muted-foreground">
                                {k}
                            </dt>
                            <dd className="text-[17px] font-extrabold">{v}</dd>
                        </div>
                    ))}
                </dl>

                <div className={`rounded-xl border px-4 py-3.5 ${nada.kartu}`}>
                    <p
                        className={`text-xl leading-snug font-extrabold ${nada.judul}`}
                    >
                        {kalimat.judul}
                    </p>
                    <p className="mt-1.5 text-base leading-relaxed">
                        {kalimat.anjuran}
                    </p>
                </div>

                <div>
                    <p className="mb-2 text-lg font-extrabold">
                        Hasil ukur dan status gizi
                    </p>
                    <table className="w-full border-collapse text-[15px]">
                        <thead>
                            <tr className="bg-surface-subtle text-left text-[13px]">
                                <th className="px-3 py-2">Pengukuran</th>
                                <th className="px-3 py-2">Hasil</th>
                                <th className="px-3 py-2 text-right">
                                    Z-score (SD)
                                </th>
                                <th className="px-3 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tampil.map((b) => (
                                <tr
                                    key={b.indeks}
                                    className="border-t border-border"
                                >
                                    <td className="px-3 py-2">
                                        <b>{b.nama}</b>
                                        <span className="block text-[13px] text-muted-foreground">
                                            {b.kode}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 font-extrabold whitespace-nowrap">
                                        {b.hasil === ''
                                            ? (b.nilai?.kategori ?? '')
                                            : b.hasil}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {b.nilai === undefined
                                            ? ''
                                            : zScore(b.nilai.z)}
                                    </td>
                                    <td className="px-3 py-2 font-bold">
                                        {b.nilai?.kategori ??
                                            (b.nilai === undefined
                                                ? ''
                                                : 'Tanpa kategori')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {selisih !== null && duaBulanLalu !== undefined && (
                        <p className="mt-2.5 text-[15px]">
                            Berat badan{' '}
                            <b>
                                {Math.abs(selisih) < 0.05
                                    ? 'tetap'
                                    : `${selisih > 0 ? 'naik' : 'turun'} ${satuan(Math.abs(selisih), 'kg')}`}
                            </b>{' '}
                            dibanding 2 bulan lalu (umur{' '}
                            {duaBulanLalu.umurBulan} bulan:{' '}
                            {satuan(duaBulanLalu.bbKg, 'kg')}).
                        </p>
                    )}
                </div>

                <div>
                    <p className="text-lg font-extrabold">
                        Grafik berat badan menurut umur (KMS)
                    </p>
                    <p className="mb-1.5 text-sm text-muted-foreground">
                        Rentang {panel}–{panel + 12} bulan. Titik hitam adalah
                        berat badan {nama} tiap bulan; angka di atasnya adalah
                        z-score (SD).
                    </p>
                    <GrafikStatis
                        indeks="BB_U"
                        kelamin={data.anak.jk}
                        pengukuran={pengukuran}
                        tabel={tabel}
                        panel={panel}
                        lebar={698}
                        tinggi={226}
                        teks={12}
                        labelZ
                    />
                </div>
                {kaki}
            </section>

            {edukasiKia?.kelompok && (
                <section className="halaman-hasil flex flex-col gap-3.5 text-base">
                    {kepala('Panduan keluarga')}
                    <PanduanKeluargaKia nama={nama} edukasi={edukasiKia} />
                    {kaki}
                </section>
            )}
            {edukasiKia?.diskusi && (
                <section className="halaman-hasil flex flex-col gap-3.5 text-base">
                    {kepala('Catatan diskusi')}
                    <DiskusiKiaCetak edukasi={edukasiKia} />
                    {kaki}
                </section>
            )}

            <section className="halaman-hasil flex flex-col gap-4 text-base">
                {kepala('Kurva pertumbuhan')}
                <div>
                    <p className="text-lg font-extrabold">
                        Grafik pertumbuhan lainnya
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Rentang {panel}–{panel + 12} bulan. Titik hitam adalah
                        hasil ukur {nama}; garis terputus berarti ada bulan
                        tanpa pengukuran.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    {(['TB_U', 'IMT_U', 'LILA_U', 'LIKA_U'] as const).map(
                        (i) => (
                            <div key={i}>
                                <p className="mb-0.5 text-[15px] font-extrabold">
                                    {i === 'TB_U'
                                        ? berbaring
                                            ? 'Panjang badan menurut umur'
                                            : 'Tinggi badan menurut umur'
                                        : i === 'IMT_U'
                                          ? 'Indeks massa tubuh menurut umur'
                                          : i === 'LILA_U'
                                            ? 'Lingkar lengan atas menurut umur'
                                            : 'Lingkar kepala menurut umur'}
                                </p>
                                <GrafikStatis
                                    indeks={i}
                                    kelamin={data.anak.jk}
                                    pengukuran={pengukuran}
                                    tabel={tabel}
                                    panel={panel}
                                    lebar={335}
                                    tinggi={235}
                                    teks={10.5}
                                    berbaring={berbaring}
                                />
                            </div>
                        ),
                    )}
                </div>
                <div className="rounded-xl border border-border px-4 py-3.5">
                    <p className="mb-2 text-base font-extrabold">
                        Cara membaca grafik
                    </p>
                    <Legenda />
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        Titik menunjukkan hasil ukur anak pada usia tersebut.
                        Sumbu bawah menunjukkan umur; sumbu samping menunjukkan
                        hasil ukur. Bahas posisi titik dan arah perubahannya
                        bersama kader atau bidan. Warna pita saja bukan
                        diagnosis.
                    </p>
                </div>
                {kaki}
            </section>
        </dialog>
    );
}
