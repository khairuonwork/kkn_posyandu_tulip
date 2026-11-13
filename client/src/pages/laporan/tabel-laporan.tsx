import { AlertTriangle, ArrowRight, RotateCcw, SearchX } from 'lucide-react';
import EmptyState from '@/components/empty-state';
import JenisKelaminBadge from '@/components/jenis-kelamin-badge';
import StatusGiziBadge from '@/components/status-gizi-badge';
import { angka, tanggalRingkas, zScore } from '@/lib/format';
import { kesimpulanZScore } from '@/lib/kategori';
import type { BarisLaporanLive } from '@/lib/laporan';
import { Link } from '@/lib/nav';
import type { Periode } from '@/types/posyandu';
import { umurUntukLaporan } from './format-laporan';
import type { KategoriT, TabRekap } from './tipe';
export default function TabelLaporan({
    tab,
    periode,
    rtDipilih,
    indeks,
    standar,
    kategoriT,
    daftarTersaring,
    cari,
    setCari,
    setRtDipilih,
}: {
    tab: TabRekap;
    periode: Periode;
    rtDipilih: string;
    indeks: string;
    standar: string;
    kategoriT: KategoriT;
    daftarTersaring: BarisLaporanLive[];
    cari: string;
    setCari: (value: string) => void;
    setRtDipilih: (value: string) => void;
}) {
    return (
        <div
            key={`${tab}-${periode.id}-${rtDipilih}-${tab === 'zscore' ? `${indeks}-${standar}` : kategoriT}`}
            className="laporan-ganti gulir-dalam max-h-[520px] w-full overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Tabel laporan z-score, geser ke samping untuk melihat semua kolom"
        >
            {daftarTersaring.length === 0 ? (
                <div className="p-6 sm:p-10">
                    <EmptyState
                        ikon={SearchX}
                        warnaIkon="netral"
                        judul={
                            cari.trim() !== ''
                                ? `Balita “${cari.trim()}” Tidak Ditemukan`
                                : 'Tidak Ada Data Balita yang Sesuai Saringan'
                        }
                        sebab={
                            cari.trim() !== '' ? (
                                <>
                                    <span className="mb-1 block font-semibold text-foreground/80">
                                        Pencarian pada periode {periode.label}{' '}
                                        (RT:{' '}
                                        {rtDipilih === 'semua'
                                            ? 'Semua RT'
                                            : `RT ${rtDipilih}`}
                                        )
                                    </span>
                                    Data pengukuran posyandu tetap aman di
                                    database. Coba periksa ejaan nama atau
                                    bersihkan filter untuk menampilkan seluruh
                                    balita.
                                </>
                            ) : (
                                <>
                                    <span className="mb-1 block font-semibold text-foreground/80">
                                        Filter aktif:{' '}
                                        {rtDipilih === 'semua'
                                            ? 'Semua RT'
                                            : `RT ${rtDipilih}`}
                                    </span>
                                    Tidak ada catatan balita yang sesuai dengan
                                    filter wilayah atau status gizi pada periode
                                    ini.
                                </>
                            )
                        }
                        aksiLabel="Hapus Pencarian & Reset Filter"
                        aksiIkon={RotateCcw}
                        onAksi={() => {
                            setCari('');
                            setRtDipilih('semua');
                        }}
                    />
                </div>
            ) : (
                <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border bg-surface-subtle text-muted-foreground shadow-2xs">
                        <tr>
                            {(tab === 'zscore'
                                ? [
                                      'Balita',
                                      'RT',
                                      'Umur',
                                      'Tgl Ukur',
                                      'BB (kg)',
                                      'TB/PB (cm)',
                                      'Z-Score',
                                      'Kesimpulan Status Gizi',
                                  ]
                                : [
                                      'Balita',
                                      'RT',
                                      'Periode',
                                      'Umur',
                                      'BB Aktual',
                                      'Kenaikan vs KBM',
                                      'Status KIA',
                                      'Tingkat Risiko',
                                      'Aksi / Rujukan',
                                      'Sumber Data',
                                  ]
                            ).map((h, i) => (
                                <th
                                    key={h}
                                    className={`px-4 py-3.5 font-extrabold whitespace-nowrap text-foreground ${
                                        i === 0 ? 'pl-5' : ''
                                    } ${i >= 4 && i <= 6 && tab === 'zscore' ? 'text-center' : ''}`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {daftarTersaring.map((row, index) => {
                            const assessment =
                                row.penilaian?.[standar]?.[indeks];
                            const zVal =
                                typeof assessment?.z === 'number'
                                    ? assessment.z
                                    : null;
                            const isNormal =
                                zVal !== null && zVal >= -2 && zVal <= 1;
                            const isWarning =
                                zVal !== null &&
                                ((zVal >= -3 && zVal < -2) ||
                                    (zVal > 1 && zVal <= 2));
                            const isDanger =
                                zVal !== null && (zVal < -3 || zVal > 2);

                            const isDuaT =
                                (row.jumlahTBerturut ?? 0) >= 2 ||
                                row.duaT ||
                                (row.status2T && row.status2T !== '1T');
                            const kenaikan = row.kenaikanGram ?? null;
                            const kbm = row.kbmGram ?? null;
                            const selisih =
                                kenaikan !== null && kbm !== null
                                    ? kenaikan - kbm
                                    : null;

                            return (
                                <tr
                                    key={`${row.anakId}-${row.periodeId}-${index}`}
                                    className={`transition-colors ${
                                        tab === '2t' && isDuaT
                                            ? 'bg-rose-50/25 hover:bg-rose-50/50'
                                            : 'hover:bg-surface-subtle/60'
                                    }`}
                                >
                                    <td className="px-4 py-3.5 pl-5 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/balita/${row.anakId}`}
                                                className="font-extrabold text-foreground underline-offset-4 hover:text-primary hover:underline"
                                            >
                                                {row.nama}
                                            </Link>
                                            <JenisKelaminBadge jk={row.jk} />
                                        </div>
                                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                            {row.nik ?? 'NIK belum tercatat'} ·
                                            Ibu: {row.namaOrtu ?? '—'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3.5 tabular-nums">
                                        <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs font-bold text-foreground">
                                            RT {row.rt ?? '—'}
                                        </span>
                                    </td>
                                    {tab === 'zscore' ? (
                                        <>
                                            <td className="px-4 py-3.5 text-xs font-semibold whitespace-nowrap text-foreground tabular-nums">
                                                {umurUntukLaporan(
                                                    row.umurLengkap,
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                                                {tanggalRingkas(
                                                    row.tanggalUkur ?? null,
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-bold text-foreground tabular-nums">
                                                {angka(row.bbKg ?? null, 1)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-bold text-foreground tabular-nums">
                                                {angka(row.tinggiCm ?? null, 1)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-bold tabular-nums">
                                                <span
                                                    className={`inline-flex items-center rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold shadow-2xs ${
                                                        isNormal
                                                            ? 'border border-emerald-300 bg-emerald-100 text-emerald-900'
                                                            : isWarning
                                                              ? 'border border-amber-300 bg-amber-100 text-amber-900'
                                                              : isDanger
                                                                ? 'border border-rose-300 bg-rose-100 text-rose-900'
                                                                : 'bg-surface-subtle text-muted-foreground'
                                                    }`}
                                                >
                                                    {zScore(zVal)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 pr-5 font-semibold">
                                                <StatusGiziBadge
                                                    kategori={kesimpulanZScore(
                                                        assessment?.kategori,
                                                        assessment?.z,
                                                    )}
                                                    rapat
                                                />
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3.5 text-xs font-bold text-foreground tabular-nums">
                                                {row.periodeId}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs font-semibold whitespace-nowrap text-foreground tabular-nums">
                                                {umurUntukLaporan(
                                                    row.umurLengkap,
                                                    true,
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs font-bold text-foreground tabular-nums">
                                                {angka(row.bbKg ?? null, 1)} kg
                                            </td>
                                            <td className="px-4 py-3.5 text-xs tabular-nums">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1 font-bold">
                                                        <span
                                                            className={
                                                                kenaikan !==
                                                                    null &&
                                                                kenaikan < 0
                                                                    ? 'font-extrabold text-rose-600'
                                                                    : 'text-foreground'
                                                            }
                                                        >
                                                            {kenaikan !== null
                                                                ? `${kenaikan > 0 ? '+' : ''}${kenaikan} g`
                                                                : '—'}
                                                        </span>
                                                        <span className="text-[11px] font-normal text-muted-foreground">
                                                            / KBM{' '}
                                                            {kbm !== null
                                                                ? `${kbm} g`
                                                                : '—'}
                                                        </span>
                                                    </div>
                                                    {selisih !== null && (
                                                        <span
                                                            className={`text-[10px] font-bold ${
                                                                selisih < 0
                                                                    ? 'text-rose-600'
                                                                    : 'text-emerald-700'
                                                            }`}
                                                        >
                                                            {selisih < 0
                                                                ? `Kurang ${Math.abs(selisih)} g`
                                                                : `Lebih ${selisih} g`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 font-bold">
                                                <span
                                                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-extrabold shadow-2xs ${
                                                        row.nt === 'N'
                                                            ? 'border border-emerald-300 bg-emerald-100 text-emerald-900'
                                                            : row.nt === 'T'
                                                              ? 'border border-rose-300 bg-rose-100 text-rose-900'
                                                              : 'bg-surface-subtle text-muted-foreground'
                                                    }`}
                                                >
                                                    {row.nt === 'N'
                                                        ? 'N · Naik'
                                                        : row.nt === 'T'
                                                          ? 'T · Tidak Naik'
                                                          : (row.nt ?? '—')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 font-bold">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold shadow-2xs ${
                                                        isDuaT
                                                            ? 'border border-rose-300 bg-rose-100 text-rose-950'
                                                            : 'border border-amber-300 bg-amber-100 text-amber-950'
                                                    }`}
                                                >
                                                    {isDuaT ? (
                                                        <>
                                                            <AlertTriangle
                                                                className="size-3 shrink-0 text-rose-600"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                2T+ (Kritis)
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                                            <span>
                                                                1T (Waspada)
                                                            </span>
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Link
                                                        href={`/balita/${row.anakId}`}
                                                        className="inline-flex items-center rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-surface-subtle"
                                                    >
                                                        <span>Detail</span>
                                                    </Link>
                                                    <Link
                                                        href="/kms"
                                                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                                                            isDuaT
                                                                ? 'bg-rose-600 text-white shadow-2xs hover:bg-rose-700'
                                                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                        }`}
                                                    >
                                                        <span>
                                                            {isDuaT
                                                                ? 'Rujuk Meja 4'
                                                                : 'Konseling'}
                                                        </span>
                                                        <ArrowRight
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 pr-5 text-xs whitespace-nowrap text-muted-foreground">
                                                <span className="rounded-md border border-border bg-surface-subtle px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                                    {row.sumberRiwayat ===
                                                    'arsip'
                                                        ? 'Arsip Bu Sri'
                                                        : 'Pengukuran Posyandu'}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
