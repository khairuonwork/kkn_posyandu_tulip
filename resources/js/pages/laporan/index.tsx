/**
 * Laporan — docs/10-prd-demo-frontend.md bagian 6.6.
 *
 * Menunjukkan bahwa berkas yang selama ini disusun manual bisa keluar dari
 * sistem dalam satu klik.
 *
 * **Layar dan berkas berbeda isinya.** Tabel di layar bersifat agregat SKDN per
 * RT — bentuk yang dipakai laporan Posyandu. Berkas CSV bersifat rinci: satu
 * baris per anak dengan enam pasang kolom z-score dan status.
 */

import { Download, FileText, Printer } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { pecahan, persenSaja, tanggalPanjang } from '@/lib/format';
import type { Periode, Peran } from '@/types/posyandu';

export type BarisRekapRt = {
    rt: string;
    s: number;
    d: number;
    n: number;
    t: number;
    o: number;
    b: number;
    bgm: number;
};

export type TabPeriode = 'harian' | 'bulanan' | 'tahunan';

const TAB: { nilai: TabPeriode; label: string }[] = [
    { nilai: 'harian', label: 'Harian' },
    { nilai: 'bulanan', label: 'Bulanan' },
    { nilai: 'tahunan', label: 'Tahunan' },
];

type Props = {
    periode: Periode;
    tab: TabPeriode;
    onGantiTab: (tab: TabPeriode) => void;
    rekapPerRt: BarisRekapRt[];
    total: BarisRekapRt;
    wilayahRt: string[];
    rw: string;
    kelurahan: string;
    /** Berapa periode yang diagregasi; dipakai keterangan tab Tahunan. */
    jumlahPeriode: number;
    peran: Peran;
    onUnduhCsv: () => void;
    periodeTerisi: Periode | null;
    onPindahPeriode?: (id: string) => void;
};

export default function Laporan({
    periode,
    tab,
    onGantiTab,
    rekapPerRt,
    total,
    wilayahRt,
    rw,
    kelurahan,
    jumlahPeriode,
    peran,
    onUnduhCsv,
    periodeTerisi,
    onPindahPeriode,
}: Props) {
    const [rt, setRt] = useState('');
    const bolehUnduh = peran !== 'kader';
    const tampil =
        rt === '' ? rekapPerRt : rekapPerRt.filter((r) => r.rt === rt);

    return (
        <Halaman
            ikon={FileText}
            judul="Laporan"
            subjudul={`${tab === 'tahunan' ? 'Tahun 2026' : periode.label}. RW ${rw} Kelurahan ${kelurahan}. Data contoh.`}
            aksi={
                <>
                    {bolehUnduh && (
                        <button
                            type="button"
                            onClick={onUnduhCsv}
                            className="tombol-kedua"
                        >
                            <Download className="size-5" strokeWidth={2.5} />
                            Unduh CSV
                        </button>
                    )}
                    {/* Cetak memanggil dialog cetak peramban, bukan
                        window.alert("Belum tersedia"). Tata letaknya sudah
                        hitam-putih dan setiap chip memuat ikon serta teks, jadi
                        halaman ini memang siap dicetak apa adanya. Ia yang
                        menjadi aksi utama, seperti pada artboard. */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="tombol-utama"
                    >
                        <Printer className="size-5" strokeWidth={2.5} />
                        Cetak A4
                    </button>
                </>
            }
        >
            <div className="flex flex-wrap gap-2" role="tablist">
                {TAB.map((t) => (
                    <button
                        key={t.nilai}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.nilai}
                        onClick={() => onGantiTab(t.nilai)}
                        className={`min-h-13 rounded-lg px-4.5 text-base font-semibold ${
                            tab === t.nilai
                                ? 'bg-primary font-bold text-primary-foreground'
                                : 'border border-border-strong bg-card'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'harian' && (
                <p className="mt-3 text-sm text-muted-foreground">
                    Satu sesi penimbangan,{' '}
                    {tanggalPanjang(periode.tanggalKegiatan)}. Data impor hanya
                    memuat satu tanggal ukur per periode.
                </p>
            )}

            {tab === 'tahunan' && (
                <p className="mt-3 text-sm text-muted-foreground">
                    Agregat {jumlahPeriode} periode Januari–Juni 2026. 2026
                    masih berjalan, angka belum final. Arsip 2025 tidak diimpor
                    ke demo.
                </p>
            )}

            {total.s === 0 ? (
                <div className="mt-6">
                    <EmptyState
                        sebab={`Belum ada pengukuran pada ${periode.label}.`}
                    >
                        {periodeTerisi !== null && (
                            <button
                                type="button"
                                onClick={() =>
                                    onPindahPeriode?.(periodeTerisi.id)
                                }
                                className="tombol-utama"
                            >
                                Lihat {periodeTerisi.label}
                            </button>
                        )}
                    </EmptyState>
                </div>
            ) : (
                <>
                    {/* Pita rambut artboard: angka besar dan labelnya berdiri
                        sebaris pada garis dasar yang sama, bukan lima kartu
                        identik berjejer. */}
                    <div className="kartu mt-6 grid grid-cols-1 gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <Angka nilai={total.s} label="S sasaran" />
                        <Angka
                            nilai={total.d}
                            label="D ditimbang"
                            warna="text-tone-green"
                        />
                        <Angka
                            nilai={`${persenSaja(total.d, total.s)}%`}
                            label="D/S cakupan"
                            warna="text-tone-green"
                            bawah={`${pecahan(total.d, total.s)} sasaran`}
                        />
                        <Angka
                            nilai={`${persenSaja(total.n, total.d)}%`}
                            label="N/D naik"
                            bawah={`${pecahan(total.n, total.d)} ditimbang`}
                        />
                        <Angka
                            nilai={total.bgm}
                            label="BGM"
                            warna={total.bgm > 0 ? 'text-tone-red' : undefined}
                            bawah="di bawah garis merah"
                        />
                    </div>

                    <div className="kartu mt-6 flex flex-wrap items-end gap-4 p-5">
                        <div>
                            <label
                                htmlFor="rekap-rt"
                                className="block text-sm font-semibold text-muted-foreground"
                            >
                                RT
                            </label>
                            <select
                                id="rekap-rt"
                                value={rt}
                                onChange={(e) => setRt(e.target.value)}
                                className="isian mt-1.5 font-semibold"
                            >
                                <option value="">Semua RT</option>
                                {wilayahRt.map((w) => (
                                    <option key={w} value={w}>
                                        RT {w.padStart(2, '0')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="kartu mt-6 overflow-hidden">
                        {/* Judul dan legenda menyatu di strip kepala kartu,
                            seperti pada artboard. Legenda wajib dan tempatnya
                            di atas: delapan kolom berjudul satu huruf tidak
                            bisa dibaca lebih dulu lalu diterjemahkan
                            sesudahnya. */}
                        <div className="strip-kepala">
                            <h2 className="text-xl font-extrabold">
                                Rekap per RT
                            </h2>
                            <p className="mt-0.5 max-w-[100ch] text-sm text-pretty text-muted-foreground">
                                S sasaran, D ditimbang, N naik, T tidak naik, O
                                tidak ditimbang bulan lalu, B baru pertama kali,
                                BGM di bawah garis merah pada KMS. BGM dihitung
                                dari BB/U, jadi jumlahnya bisa berbeda dari
                                status gizi BB/PB atau BB/TB.
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground md:hidden">
                                Tabel ini lebih lebar daripada layar. Geser ke
                                samping untuk melihat kolom N, T, O, B, dan BGM.
                            </p>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead scope="col">RT</TableHead>
                                    <TableHead scope="col">S</TableHead>
                                    <TableHead scope="col">D</TableHead>
                                    <TableHead scope="col">D/S</TableHead>
                                    <TableHead scope="col">N</TableHead>
                                    <TableHead scope="col">T</TableHead>
                                    <TableHead scope="col">O</TableHead>
                                    <TableHead scope="col">B</TableHead>
                                    <TableHead scope="col">BGM</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tampil.map((r) => (
                                    <TableRow key={r.rt}>
                                        <TableCell className="font-semibold">
                                            RT {r.rt.padStart(2, '0')}
                                        </TableCell>
                                        <TableCell>{r.s}</TableCell>
                                        <TableCell>{r.d}</TableCell>
                                        <TableCell>
                                            {persenSaja(r.d, r.s)}%
                                        </TableCell>
                                        <TableCell>{r.n}</TableCell>
                                        <TableCell>{r.t}</TableCell>
                                        <TableCell>{r.o}</TableCell>
                                        <TableCell>{r.b}</TableCell>
                                        <TableCell>{r.bgm}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell>Total</TableCell>
                                    <TableCell>{total.s}</TableCell>
                                    <TableCell>{total.d}</TableCell>
                                    <TableCell>
                                        {persenSaja(total.d, total.s)}%
                                    </TableCell>
                                    <TableCell>{total.n}</TableCell>
                                    <TableCell>{total.t}</TableCell>
                                    <TableCell>{total.o}</TableCell>
                                    <TableCell>{total.b}</TableCell>
                                    <TableCell>{total.bgm}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>

                    {/* Dulu empat kartu berjejer yang semuanya berbunyi
                        `0 dari 97`: Vitamin A, obat cacing, imunisasi, KPSP.
                        Empat kotak untuk mengatakan "tidak ada datanya" -
                        satu kalimat mengatakannya lebih jujur dan lebih cepat. */}
                    <p className="mt-8 max-w-[100ch] text-base text-muted-foreground">
                        Cakupan vitamin A, obat cacing, imunisasi, dan KPSP
                        belum dapat dilaporkan: kolomnya tidak ada di berkas
                        sumber. Vitamin A dan obat cacing sendiri diberikan
                        setiap Februari dan Agustus.
                    </p>
                </>
            )}
        </Halaman>
    );
}

/** Satu sel pita ringkasan. Latarnya kartu; garis pemisahnya celah 1px grid. */
function Angka({
    nilai,
    label,
    bawah,
    warna,
}: {
    nilai: number | string;
    label: string;
    bawah?: string;
    warna?: string;
}) {
    return (
        <div className="bg-card px-5 py-4.5">
            {/* Angka dan labelnya sebaris pada garis dasar yang sama — bentuk
                pita pada artboard Laporan. */}
            <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className={`text-2xl font-extrabold ${warna ?? ''}`}>
                    {nilai}
                </span>
                <span className="text-sm text-muted-foreground">{label}</span>
            </p>
            {bawah !== undefined && (
                <p className="mt-1 text-sm text-muted-foreground">{bawah}</p>
            )}
        </div>
    );
}
