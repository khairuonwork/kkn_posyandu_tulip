import { ChevronRight, Pencil, RefreshCw, Upload } from 'lucide-react';
import JenisKelaminBadge from '@/components/jenis-kelamin-badge';
import StateHalaman from '@/components/state-halaman';
import StatusGiziBadge from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeadUrut,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    angka,
    KOSONG,
    namaTampil,
    tanggalRingkas,
    umurRingkas,
} from '@/lib/format';
import { Link } from '@/lib/nav';
import type { susunTabel } from '@/lib/z-score';
import type { Periode } from '@/types/posyandu';
import { Pemicu, Risiko } from './baris-penanda';
import { EditorBaris } from './editor-baris';
import { LABEL_URUT, labelRt } from './tipe';
import type { BarisAnak, KolomUrut, PatchAnak } from './tipe';
import { useKehadiran } from './use-kehadiran';

export function TabelAnak({
    hasilTampil,
    sumberData,
    statusMuat,
    pesanGalat,
    onMuatUlang,
    anakCount,
    adaSaringan,
    tabAktif,
    setTabAktif,
    kataCari,
    setCariHariIni,
    setCariSemua,
    lingkupRt,
    rtTerkunci,
    setRt,
    setHanyaPerhatian,
    setHanyaRisiko,
    urut,
    setUrut,
    bolehUbah,
    dibuka,
    setDibuka,
    setMenambah,
    periode,
    wilayahRt,
    tabelLms,
    onSimpanAnak,
}: {
    hasilTampil: BarisAnak[];
    sumberData: 'live' | 'contoh';
    statusMuat: 'memuat' | 'siap' | 'galat';
    pesanGalat?: string | null;
    onMuatUlang?: () => void;
    anakCount: number;
    adaSaringan: boolean;
    tabAktif: 'hari-ini' | 'semua';
    setTabAktif: (t: 'hari-ini' | 'semua') => void;
    kataCari: string;
    setCariHariIni: (s: string) => void;
    setCariSemua: (s: string) => void;
    lingkupRt: string;
    rtTerkunci: string | null;
    setRt: (rt: string) => void;
    setHanyaPerhatian: (v: boolean) => void;
    setHanyaRisiko: (v: boolean) => void;
    urut: { kolom: KolomUrut; naik: boolean };
    setUrut: React.Dispatch<
        React.SetStateAction<{ kolom: KolomUrut; naik: boolean }>
    >;
    bolehUbah: boolean;
    dibuka: number | null;
    setDibuka: (id: number | null) => void;
    setMenambah: (v: boolean) => void;
    periode: Periode;
    wilayahRt: string[];
    tabelLms: ReturnType<typeof susunTabel> | null;
    onSimpanAnak?: (anakId: number, patch: PatchAnak) => void;
}) {
    const editor = useKehadiran(dibuka);

    if (statusMuat === 'memuat' && sumberData === 'live') {
        return (
            <StateHalaman
                jenis="memuat"
                judul="Memuat data balita"
                pesan="Portal sedang membaca seluruh halaman data dari database."
            />
        );
    }

    if (statusMuat === 'galat' && sumberData === 'live') {
        return (
            <div className="flex flex-1 items-center justify-center px-6 py-14 text-center">
                <div className="max-w-lg">
                    <p className="text-base font-bold">
                        Data balita tidak dapat dimuat
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">
                        {pesanGalat ??
                            'Periksa koneksi REST API, lalu coba kembali.'}
                    </p>
                    <button
                        type="button"
                        onClick={onMuatUlang}
                        className="tombol-utama mt-4"
                    >
                        <RefreshCw className="size-5" aria-hidden="true" />
                        Muat ulang data
                    </button>
                </div>
            </div>
        );
    }

    if (hasilTampil.length === 0) {
        return (
            <div className="px-6 py-10 text-center lg:flex-1">
                {sumberData === 'live' && anakCount === 0 && !adaSaringan ? (
                    <>
                        <p className="text-base font-bold">
                            Database live belum memiliki data balita
                        </p>
                        <p className="mx-auto mt-1 max-w-xl text-base text-muted-foreground">
                            Akun dan wilayah sudah tersedia, tetapi tabel anak
                            masih kosong. Impor data sasaran agar daftar dan
                            kartu QR dapat dibuat.
                        </p>
                        <Link
                            href="/sasaran"
                            className="tombol-utama mt-4 inline-flex"
                        >
                            <Upload className="size-5" aria-hidden="true" />
                            Buka Sasaran &amp; Impor
                        </Link>
                    </>
                ) : tabAktif === 'hari-ini' && !adaSaringan ? (
                    <>
                        <p className="text-base font-bold">
                            Belum ada hasil ukur hari ini
                        </p>
                        <p className="mx-auto mt-1 max-w-xl text-base text-muted-foreground">
                            Pengukuran yang tersimpan dari aplikasi Android akan
                            muncul di daftar ini setelah tersinkron ke server.
                        </p>
                        <button
                            type="button"
                            onClick={() => setTabAktif('semua')}
                            className="tombol-kedua mt-4"
                        >
                            Lihat semua balita
                        </button>
                    </>
                ) : kataCari.trim() !== '' ? (
                    <>
                        <p className="text-base">
                            Tidak ada balita bernama “{kataCari.trim()}” di{' '}
                            {lingkupRt}.
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                tabAktif === 'hari-ini'
                                    ? setCariHariIni('')
                                    : setCariSemua('')
                            }
                            className="tombol-kedua mt-4"
                        >
                            Hapus pencarian
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-base">
                            Tidak ada balita yang cocok dengan saringan di{' '}
                            {lingkupRt}.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setRt(rtTerkunci ?? '');
                                setHanyaPerhatian(false);
                                setHanyaRisiko(false);
                            }}
                            className="tombol-kedua mt-4"
                        >
                            Hapus saringan
                        </button>
                    </>
                )}
            </div>
        );
    }

    const kepalaUrut = (kolom: KolomUrut) => (
        <TableHeadUrut
            label={LABEL_URUT[kolom]}
            aktif={urut.kolom === kolom}
            naik={urut.naik}
            pertama={kolom === 'nama'}
            onUrut={() =>
                setUrut({
                    kolom,
                    naik: urut.kolom === kolom ? !urut.naik : true,
                })
            }
            className={kolom === 'tanggal' ? 'hidden lg:table-cell' : ''}
        />
    );

    return (
        <>
            <ul className="md:hidden">
                {hasilTampil.map((baris) => (
                    <li
                        key={baris.anakId}
                        className="border-b border-rule last:border-b-0"
                    >
                        <Link
                            href={`/balita/${baris.anakId}`}
                            className="flex min-h-16 items-center gap-3 px-4.5 py-3 hover:bg-surface-subtle"
                        >
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2 text-base font-bold text-primary">
                                    <span>{namaTampil(baris.nama)}</span>
                                    <JenisKelaminBadge jk={baris.jk} />
                                </span>
                                <span className="mt-0.5 block text-sm text-muted-foreground">
                                    {umurRingkas(baris.umurBulan)}
                                    {baris.rt !== null &&
                                        `, ${labelRt(baris.rt)}`}
                                    {baris.namaOrtu !== null &&
                                        `, ibu ${baris.namaOrtu}`}
                                </span>
                                <span className="mt-2 flex flex-wrap items-center gap-2">
                                    <StatusGiziBadge
                                        kategori={baris.kategoriGizi}
                                        tenang
                                    />
                                    {tabAktif === 'hari-ini' ? (
                                        <span className="text-sm font-semibold text-foreground">
                                            BB{' '}
                                            {baris.bbKg === null
                                                ? KOSONG
                                                : `${angka(baris.bbKg, 1)} kg`}
                                            {' · '}PB/TB{' '}
                                            {baris.tinggiCm === null
                                                ? KOSONG
                                                : `${angka(baris.tinggiCm, 1)} cm`}
                                        </span>
                                    ) : (
                                        baris.tanggalUkurTerakhir !== null && (
                                            <span className="text-sm text-muted-foreground">
                                                Hasil terakhir{' '}
                                                {tanggalRingkas(
                                                    baris.tanggalUkurTerakhir,
                                                )}
                                            </span>
                                        )
                                    )}
                                    {!baris.nikLengkap && (
                                        <span className="text-sm text-tone-amber">
                                            NIK belum lengkap
                                        </span>
                                    )}
                                </span>
                                <Pemicu baris={baris} />
                                <Risiko baris={baris} />
                            </span>
                            <ChevronRight
                                className="size-5 shrink-0 text-muted-foreground"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        </Link>
                    </li>
                ))}
            </ul>

            <Table
                aria-label="Daftar balita"
                containerClassName="hidden md:block lg:min-h-0 lg:flex-1"
            >
                <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                        {kepalaUrut('nama')}
                        {kepalaUrut('umur')}
                        {kepalaUrut('rt')}
                        <TableHead scope="col" className="hidden lg:table-cell">
                            {tabAktif === 'hari-ini'
                                ? 'Hasil ukur hari ini'
                                : 'Nama ibu'}
                        </TableHead>
                        {kepalaUrut('tanggal')}
                        {kepalaUrut('status')}
                        {bolehUbah && (
                            <TableHead scope="col" className="text-right">
                                Aksi
                            </TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hasilTampil.map((baris) => {
                        const terbuka = dibuka === baris.anakId;

                        return [
                            <TableRow
                                key={baris.anakId}
                                className={terbuka ? 'bg-accent' : ''}
                            >
                                <TableCell className="py-1">
                                    <Link
                                        href={`/balita/${baris.anakId}`}
                                        className="inline-flex min-h-13 items-center gap-2 font-bold text-primary"
                                    >
                                        <span>{namaTampil(baris.nama)}</span>
                                        <JenisKelaminBadge jk={baris.jk} />
                                        <ChevronRight
                                            className="size-4.5 shrink-0"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    </Link>
                                    {!baris.nikLengkap && (
                                        <span className="-mt-2 block pb-1 text-sm text-tone-amber">
                                            NIK belum lengkap
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {umurRingkas(baris.umurBulan)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {baris.rt === null
                                        ? KOSONG
                                        : labelRt(baris.rt)}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    {tabAktif === 'hari-ini' ? (
                                        <span className="font-semibold tabular-nums">
                                            BB{' '}
                                            {baris.bbKg === null
                                                ? KOSONG
                                                : `${angka(baris.bbKg, 1)} kg`}
                                            <br />
                                            PB/TB{' '}
                                            {baris.tinggiCm === null
                                                ? KOSONG
                                                : `${angka(baris.tinggiCm, 1)} cm`}
                                        </span>
                                    ) : (
                                        (baris.namaOrtu ?? KOSONG)
                                    )}
                                </TableCell>
                                <TableCell className="hidden whitespace-nowrap lg:table-cell">
                                    {tanggalRingkas(baris.tanggalUkurTerakhir)}
                                </TableCell>
                                <TableCell>
                                    <StatusGiziBadge
                                        kategori={baris.kategoriGizi}
                                        tenang
                                    />
                                    <Pemicu baris={baris} />
                                    <Risiko baris={baris} />
                                </TableCell>
                                {bolehUbah && (
                                    <TableCell className="py-1 text-right">
                                        <button
                                            type="button"
                                            aria-expanded={terbuka}
                                            aria-label={
                                                terbuka
                                                    ? `Tutup ubah data ${namaTampil(baris.nama)}`
                                                    : `Ubah data ${namaTampil(baris.nama)}`
                                            }
                                            onClick={() => {
                                                setDibuka(
                                                    terbuka
                                                        ? null
                                                        : baris.anakId,
                                                );
                                                setMenambah(false);
                                            }}
                                            className={`tombol-ubah ${
                                                terbuka
                                                    ? 'bg-primary text-primary-foreground hover:bg-primary'
                                                    : ''
                                            }`}
                                        >
                                            {!terbuka && (
                                                <Pencil
                                                    className="size-4.5"
                                                    strokeWidth={2.5}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            {terbuka ? 'Tutup' : 'Ubah'}
                                        </button>
                                    </TableCell>
                                )}
                            </TableRow>,

                            editor.tampil === baris.anakId && (
                                <TableRow
                                    key={`${baris.anakId}-ubah`}
                                    className="bg-accent"
                                >
                                    <TableCell
                                        colSpan={7}
                                        className="p-0 first:pl-0 last:pr-0"
                                    >
                                        <EditorBaris
                                            menutup={editor.menutup}
                                            baris={baris}
                                            periode={periode}
                                            wilayahRt={wilayahRt}
                                            tabelLms={tabelLms}
                                            onTutup={() => setDibuka(null)}
                                            onSimpan={(patch) => {
                                                onSimpanAnak?.(
                                                    baris.anakId,
                                                    patch,
                                                );
                                                setDibuka(null);
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ),
                        ];
                    })}
                </TableBody>
            </Table>
        </>
    );
}
