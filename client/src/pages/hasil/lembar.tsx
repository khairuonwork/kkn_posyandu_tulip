/**
 * Lembar Hasil — halaman yang dibuka orang tua dari tautan di WhatsApp.
 *
 * Tanpa masuk: tautan bertanda tangan itulah kuncinya. Rancangannya mengikuti
 * mockup "Lembar Hasil Balita": ponsel lebih dulu, huruf besar, kesimpulan di
 * atas, lalu angka, tombol PDF, dan grafik.
 *
 * "Unduh PDF" memakai jendela cetak peramban (Simpan sebagai PDF). Dokumen A4
 * dua halaman dipasang di `body` dan hanya tampil saat mencetak, sama seperti
 * lembar kartu balita (aturan `.lembar-cetak` di app.css).
 */

import {
    Clock,
    Download,
    Loader2,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import GrafikStatis from '@/components/grafik-statis';
import StatusGiziBadge from '@/components/status-gizi-badge';
import { PENGATURAN_BAWAAN, standarLms } from '@/data/contoh/store';
import {
    angka,
    KOSONG,
    labelIndeks,
    satuan,
    tanggalPanjang,
    umurPanjang,
    zScore,
} from '@/lib/format';
import { tentukanKesimpulan } from '@/lib/kesimpulan-gizi';
import type { LembarApi } from '@/lib/lembar';
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
            <Head title="Hasil penimbangan" />
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex h-16 max-w-xl items-center gap-2.5 px-4">
                    <ShieldCheck
                        className="size-7 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <div>
                        <p className="text-base leading-tight font-extrabold">
                            SIMPATIK Posyandu
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground">
                            RW 18 Kelurahan Citeureup
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-xl px-4 pt-6 pb-10">
                {lembar.status === 'memuat' && (
                    // Susunannya sama dengan <Pesan>: ikon di kotak yang sama
                    // tingginya, supaya halaman tidak melompat saat hasil gagal.
                    <div
                        role="status"
                        className="flex flex-col items-center gap-3.5 pt-12 text-center"
                    >
                        <div className="flex size-18 items-center justify-center text-primary">
                            <Loader2
                                className="size-9 animate-spin motion-reduce:[animation-duration:3s]"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        </div>
                        <p className="text-lg text-muted-foreground">
                            Memuat hasil…
                        </p>
                    </div>
                )}
                {lembar.status === 'siap' && <Isi data={lembar.data} />}
                {lembar.status === 'kedaluwarsa' && (
                    <Pesan judul="Tautan ini sudah tidak berlaku">
                        Tautan hasil penimbangan hanya berlaku 20 hari. Untuk
                        melihat hasilnya lagi, minta tautan baru ke kader atau
                        bidan Posyandu Tulip.
                    </Pesan>
                )}
                {lembar.status === 'tidak-sah' && (
                    <Pesan judul="Tautan tidak dikenali">
                        Periksa kembali tautan yang dikirim, atau minta tautan
                        baru kepada kader atau bidan Posyandu Tulip.
                    </Pesan>
                )}
                {lembar.status === 'galat' && (
                    <Pesan judul="Hasil belum dapat dimuat" galat>
                        Terjadi gangguan saat memuat hasil. Silakan coba lagi
                        nanti.
                    </Pesan>
                )}
            </main>
        </div>
    );
}

function Pesan({
    judul,
    galat = false,
    children,
}: {
    judul: string;
    galat?: boolean;
    children: ReactNode;
}) {
    const Ikon = galat ? TriangleAlert : Clock;

    return (
        <div className="flex flex-col items-center gap-3.5 pt-12 text-center">
            <div
                className={`flex size-18 items-center justify-center rounded-full ${galat ? 'bg-tone-red-bg text-tone-red' : 'bg-tone-amber-bg text-tone-amber'}`}
            >
                <Ikon className="size-9" strokeWidth={2.2} aria-hidden="true" />
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

    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-sm font-bold text-muted-foreground">
                    Hasil penimbangan
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
                    className={`rounded-xl border p-4 ${nada.kartu}`}
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
                <p className="rounded-xl bg-surface-subtle p-4 text-base">
                    Hasil ini belum dapat dinilai. Silakan tanyakan kepada kader
                    atau bidan Posyandu Tulip.
                </p>
            )}

            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <h2 className="px-4 pt-3.5 pb-3.5 text-lg font-extrabold">
                    Hasil ukur
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
                        label="Status gizi"
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
                    <p className="border-t border-border px-4 py-3.5 text-lg text-muted-foreground">
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

            <section>
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
                    Unduh hasil lengkap (PDF)
                </button>
                <p className="mt-2.5 text-center text-sm text-balance text-muted-foreground">
                    PDF 2 halaman berisi semua grafik pertumbuhan. Di jendela
                    cetak yang terbuka, pilih{' '}
                    <b className="text-foreground">Simpan sebagai PDF</b>.
                </p>
            </section>

            {terbaru.bbKg !== null && (
                <section className="rounded-xl border border-border bg-card p-4">
                    <h2 className="text-lg font-extrabold">
                        Grafik berat badan
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
                    <Legenda className="mx-auto max-w-[420px] text-base" />
                </section>
            )}

            <section className="flex items-start gap-2.5 rounded-xl bg-tone-green-bg p-4 text-lg leading-relaxed">
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

            <footer className="text-sm leading-relaxed text-muted-foreground">
                <p>
                    Pertanyaan tentang hasil ini? Silakan tanyakan kepada kader
                    atau bidan Posyandu Tulip pada penimbangan berikutnya.
                </p>
                <p className="mt-2.5">
                    Dihitung dengan Standar Pertumbuhan WHO 2006. Hasil ini
                    bukan pengganti pemeriksaan oleh tenaga kesehatan.
                </p>
            </footer>

            {createPortal(
                <Dokumen
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
                <p className="text-lg font-semibold text-muted-foreground">
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

function Legenda({ className = 'text-[13px]' }: { className?: string }) {
    const butir: [string, string][] = [
        ['#1E8C34', 'Baik'],
        ['#6FB63C', 'Cukup'],
        ['#F2C300', 'Perlu diperhatikan'],
        ['#D92B0C', 'Batas bawah'],
    ];

    return (
        <ul
            className={`mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5 ${className}`}
        >
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

/** Dua halaman A4 yang hanya tampil saat mencetak. */
function Dokumen({
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
    const nama = data.anak.namaDepan;
    const umur = terbaru.umurBulan;
    const berbaring = umur !== null && umur < 24;
    const kalimat = kalimatKesimpulan(kesimpulan, nama);
    const nada = NADA_KESIMPULAN[kesimpulan];
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

    const kepala = (hal: number) => (
        <div className="flex items-center justify-between gap-4 border-b-[3px] border-primary pb-3.5">
            <div className="flex items-center gap-3">
                <ShieldCheck
                    className="size-9 text-primary"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                <div>
                    <p className="text-[22px] leading-tight font-extrabold">
                        Hasil Penimbangan Balita
                    </p>
                    <p className="text-sm font-semibold text-muted-foreground">
                        {LEMBAGA}
                    </p>
                </div>
            </div>
            <p className="text-right text-[13px] leading-normal text-muted-foreground">
                Halaman {hal} dari 2
            </p>
        </div>
    );
    const kaki = (
        <p className="mt-auto border-t border-border pt-2.5 text-[13px] leading-normal text-muted-foreground">
            Dihitung dengan Standar Pertumbuhan WHO 2006 (Permenkes No. 2 Tahun
            2020). Hasil ini bukan pengganti pemeriksaan oleh tenaga kesehatan.
            Tautan sumber berlaku sampai {tanggalBerlaku(data.kedaluwarsa)}.
        </p>
    );

    return (
        <div className="lembar-cetak" aria-hidden="true">
            <section className="halaman-hasil flex flex-col gap-3 text-base">
                {kepala(1)}
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
                        Hasil ukur dan status
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
                                    <td className="px-3 py-1">
                                        <b>{b.nama}</b>
                                        <span className="block text-[13px] text-muted-foreground">
                                            {b.kode}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1 font-extrabold whitespace-nowrap">
                                        {/* Status gizi dan IMT tanpa angka tidak
                                            punya hasil ukur sendiri; kategorinya
                                            sudah di kolom Status. */}
                                        {b.hasil === '' ? KOSONG : b.hasil}
                                    </td>
                                    <td className="px-3 py-1 text-right tabular-nums">
                                        {b.nilai === undefined
                                            ? ''
                                            : zScore(b.nilai.z)}
                                    </td>
                                    <td className="px-3 py-1 font-bold">
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
                        Grafik berat badan menurut umur
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

            <section className="halaman-hasil flex flex-col gap-4 text-base">
                {kepala(2)}
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
                        Semakin dekat titik ke tengah pita hijau, semakin sesuai
                        ukuran balita dengan anak seusianya. Bila titik berada
                        di pita kuning atau di bawah garis merah, bicarakan
                        dengan kader atau bidan Posyandu.
                    </p>
                </div>
                {kaki}
            </section>
        </div>
    );
}
