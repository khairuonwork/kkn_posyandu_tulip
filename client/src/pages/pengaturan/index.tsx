/**
 * Pengaturan — docs/rujukan/layar-demo.md bagian 6.7, tampilan Prototipe v2.
 *
 * Menunjukkan sisi tata kelola: batas ditetapkan bersama, perubahannya
 * tercatat, dan kader tidak pernah diblokir oleh sistem.
 */

import { Plus, Settings, UserRound } from 'lucide-react';
import { useState } from 'react';
import Halaman from '@/components/halaman';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { angka, tanggalPanjang } from '@/lib/format';
import type { Pengguna, Peran } from '@/types/posyandu';

export type Ambang = {
    beratMin: number;
    beratMax: number;
    tinggiMin: number;
    tinggiMax: number;
    lilaMin: number;
    lilaMax: number;
    likaMin: number;
    likaMax: number;
    naikMax: number;
    turunMax: number;
    tinggiBerkurangMax: number;
    umurMaxBulan: number;
};

type Props = {
    ambang: Ambang;
    terakhirDiubah: { tanggal: string; oleh: string };
    /** Tanpa ini tombol simpan dirender nonaktif beserta alasannya. */
    onSimpan?: (nilai: Ambang) => void;
    /** Menentukan apakah kartu Kelola pengguna dirender sama sekali. */
    peran: Peran;
    pengguna: Pengguna[];
    wilayahRt: string[];
    onSimpanPengguna: (daftar: Pengguna[]) => void;
};

export default function Pengaturan({
    ambang,
    terakhirDiubah,
    onSimpan,
    peran,
    pengguna,
    wilayahRt,
    onSimpanPengguna,
}: Props) {
    // Nilai dapat diubah selama sesi; tidak ada yang tersimpan (bagian 11).
    const [nilai, setNilai] = useState(ambang);
    const ubah = (kunci: keyof Ambang, isi: string) =>
        setNilai({ ...nilai, [kunci]: Number(isi.replace(',', '.')) });
    // Dua belas angka bisa diubah dan tombol simpannya dulu berada di kaki
    // gulir panjang, tanpa satu tanda pun bahwa ada yang belum tersimpan.
    const belumTersimpan = (Object.keys(ambang) as (keyof Ambang)[]).some(
        (k) => nilai[k] !== ambang[k],
    );

    return (
        <Halaman
            ikon={Settings}
            judul="Pengaturan"
            subjudul={`Batas kewajaran pengukuran. Terakhir diubah ${tanggalPanjang(terakhirDiubah.tanggal)} oleh ${terakhirDiubah.oleh}. Data contoh.`}
        >
            <div className="flex flex-col gap-4">
                {/* Dua kolom dari 1024 px ke atas supaya keempat kartu muat satu
                layar tanpa menggulir. Kolom kiri memegang dua kartu yang bisa
                diubah, kanan dua kartu yang hanya dibaca — bukan pembagian
                setengah-setengah, tapi pembagian menurut apa yang bisa
                disentuh. `max-w-[100ch]` dibuang: ia menahan isinya di 530 px
                dan membuat dua kolom mustahil. */}
                {/* min-w-0 pada kedua kolom wajib: item grid bawaannya
                    min-width:auto, sehingga lebar min-content tabel pengguna
                    (680 px) menaikkan lebar track grid dan menyeret KEDUA kolom
                    ikut melar sampai 689 px di layar 375 px. Dengan min-w-0
                    kolomnya boleh menyusut, dan tabelnya yang menggulir mendatar
                    di dalam wadahnya sendiri. */}
                <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                    <div className="flex min-w-0 flex-col gap-4">
                        <section className="kartu overflow-hidden">
                            <div className="strip-kepala">
                                <h2 className="text-xl font-extrabold">
                                    Rentang wajar pengukuran
                                </h2>{' '}
                            </div>

                            {/* Dua kolom, bukan empat. Tiap blok di sini memuat DUA kotak
                            isian; pada grid empat kolom keduanya menyusut ke 65 px -
                            lebih sempit daripada kotak `2,0` di bagian berikutnya yang
                            mendapat 224 px. Kotak terlebar justru memuat nilai terpendek.
                            Lebar sekarang mengikuti isinya. */}
                            {/* Satu kolom, bukan dua. Tiap blok di sini sudah
                                memuat DUA kotak isian, dan kartunya sendiri
                                sudah berada di kolom kiri dari pembagian dua
                                kolom halaman — pada grid dua kolom lagi, tiap
                                kotak jatuh ke 59 px dan `130,0` terpotong jadi
                                `130,(`. Lebar mengikuti isinya. */}
                            <div className="grid gap-5 p-5 sm:p-6">
                                <Rentang
                                    label="Berat badan"
                                    satuan="kg"
                                    min={nilai.beratMin}
                                    max={nilai.beratMax}
                                    onMin={(v) => ubah('beratMin', v)}
                                    onMax={(v) => ubah('beratMax', v)}
                                />
                                <Rentang
                                    label="Panjang atau tinggi"
                                    satuan="cm"
                                    min={nilai.tinggiMin}
                                    max={nilai.tinggiMax}
                                    onMin={(v) => ubah('tinggiMin', v)}
                                    onMax={(v) => ubah('tinggiMax', v)}
                                />
                                <Rentang
                                    label="LILA"
                                    satuan="cm"
                                    min={nilai.lilaMin}
                                    max={nilai.lilaMax}
                                    onMin={(v) => ubah('lilaMin', v)}
                                    onMax={(v) => ubah('lilaMax', v)}
                                />
                                <Rentang
                                    label="Lingkar kepala"
                                    satuan="cm"
                                    min={nilai.likaMin}
                                    max={nilai.likaMax}
                                    onMin={(v) => ubah('likaMin', v)}
                                    onMax={(v) => ubah('likaMax', v)}
                                />
                            </div>
                        </section>

                        <section className="kartu overflow-hidden">
                            <div className="strip-kepala">
                                <h2 className="text-xl font-extrabold">
                                    Batas selisih antar bulan
                                </h2>{' '}
                            </div>

                            {/* `xl:grid-cols-4` dicabut: empat kotak angka
                                berdampingan di kolom separuh halaman menyisakan
                                42 px per kotak. */}
                            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                                <Isian
                                    id="naik-max"
                                    label="Berat naik maksimal"
                                    satuan="kg"
                                    nilai={nilai.naikMax}
                                    onGanti={(v) => ubah('naikMax', v)}
                                />
                                <Isian
                                    id="turun-max"
                                    label="Berat turun maksimal"
                                    satuan="kg"
                                    nilai={nilai.turunMax}
                                    onGanti={(v) => ubah('turunMax', v)}
                                />
                                <Isian
                                    id="tinggi-berkurang"
                                    label="Tinggi berkurang"
                                    satuan="cm"
                                    nilai={nilai.tinggiBerkurangMax}
                                    onGanti={(v) =>
                                        ubah('tinggiBerkurangMax', v)
                                    }
                                />
                                <Isian
                                    id="umur-max"
                                    label="Umur maksimal balita"
                                    satuan="bulan"
                                    desimal={0}
                                    nilai={nilai.umurMaxBulan}
                                    onGanti={(v) => ubah('umurMaxBulan', v)}
                                />
                            </div>
                        </section>
                    </div>

                    <div className="flex min-w-0 flex-col gap-4">
                        {/* Satu-satunya layar yang membedakan Admin dari Bidan.
                            Matriks peran di docs/10 bagian 7 hanya punya satu
                            baris pembeda, dan baris itu menu Periode yang sudah
                            dicabut.

                            Duduk di kolom kanan, bukan melintang di bawah grid.
                            Terukur pada 1920x1080: kolom kanan hanya 420 px di
                            dalam grid 832 px — 412 px menganggur — sementara
                            kartu ini setinggi 890 px kalau ditumpuk di bawah,
                            yang membuat Pengaturan jadi 1.937 px alias 1,8
                            layar. Di sini ia mengisi ruang yang memang sudah
                            kosong, dan tabelnya menggulir di dalam kartu seperti
                            daftar Perlu perhatian di Beranda. */}
                        {peran === 'admin' && (
                            <KelolaPengguna
                                pengguna={pengguna}
                                wilayahRt={wilayahRt}
                                onSimpan={onSimpanPengguna}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Bilah simpan menempel di kaki layar dan menyebutkan berapa
                yang belum tersimpan. */}
            <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-border bg-background px-4 py-3 sm:-mx-7 sm:px-7">
                <button
                    type="button"
                    disabled={onSimpan === undefined || !belumTersimpan}
                    onClick={() => onSimpan?.(nilai)}
                    className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                    Simpan pengaturan
                </button>
                <button
                    type="button"
                    disabled={!belumTersimpan}
                    onClick={() => setNilai(ambang)}
                    className="tombol-kedua disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Kembalikan ke semula
                </button>
                <p
                    aria-live="polite"
                    className="text-base text-pretty text-muted-foreground"
                >
                    {onSimpan === undefined
                        ? 'Belum ada tempat menyimpannya: tabel pengaturan_ambang belum ada di basis data.'
                        : belumTersimpan
                          ? 'Ada perubahan yang belum disimpan.'
                          : 'Semua perubahan tersimpan.'}
                </p>
            </div>
        </Halaman>
    );
}

const NAMA_PERAN: Record<Peran, string> = {
    kader: 'Kader',
    bidan: 'Bidan',
    admin: 'Admin',
};

const URUTAN_PERAN: Peran[] = ['kader', 'bidan', 'admin'];

/** Label RT dua digit, sama seperti Data Balita dan Laporan. */
function labelRt(rt: string): string {
    return `RT ${rt.padStart(2, '0')}`;
}

/**
 * Admin aktif terakhir tidak boleh diturunkan perannya maupun dinonaktifkan.
 *
 * Tanpa penjaga ini satu klik bisa mengunci semua orang keluar dari layar yang
 * memuat penjaganya sendiri — dan tidak ada seorang pun yang tersisa untuk
 * mengembalikannya selain lewat basis data.
 */
function adminAktifTerakhir(daftar: Pengguna[], id: number): boolean {
    const admin = daftar.filter((p) => p.peran === 'admin' && p.aktif);

    return admin.length === 1 && admin[0].id === id;
}

/**
 * Kelola pengguna — hanya dirender untuk Admin.
 *
 * Akun dinonaktifkan, tidak dihapus: setiap perubahan batas tercatat dengan
 * nama pelakunya, dan baris audit yang menunjuk akun yang sudah lenyap tidak
 * bisa dibaca siapa pun. Perubahan hanya di memori, sama seperti sisa demo.
 */
function KelolaPengguna({
    pengguna,
    wilayahRt,
    onSimpan,
}: {
    pengguna: Pengguna[];
    wilayahRt: string[];
    onSimpan: (daftar: Pengguna[]) => void;
}) {
    const [menambah, setMenambah] = useState(false);
    const aktif = pengguna.filter((p) => p.aktif).length;

    const ubah = (id: number, patch: Partial<Pengguna>) =>
        onSimpan(pengguna.map((p) => (p.id === id ? { ...p, ...patch } : p)));

    return (
        <section className="kartu flex flex-col overflow-hidden">
            <div className="strip-kepala flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3">
                <UserRound
                    className="size-5 shrink-0 text-muted-foreground"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                <h2 className="text-xl font-extrabold">Kelola pengguna</h2>
                <span className="text-sm text-muted-foreground">
                    {aktif} aktif dari {pengguna.length} akun
                </span>
                <button
                    type="button"
                    onClick={() => setMenambah(!menambah)}
                    aria-expanded={menambah}
                    className="tombol-utama ml-auto"
                >
                    <Plus className="size-5" strokeWidth={2.5} />
                    Tambah pengguna
                </button>

                {/* Terukur, bukan diasumsikan: pada 375 px tabelnya 680 px di
                    dalam wadah 346 px, dan pada 768 px sudah muat — jadi
                    petunjuk ini benar tepat selama ia tampil, dan hilang
                    tepat saat tidak lagi benar. */}
                <p className="w-full text-sm text-muted-foreground md:hidden">
                    Tabel ini lebih lebar daripada layar. Geser ke samping untuk
                    melihat kolom Status dan Aksi.
                </p>
            </div>

            {menambah && (
                <FormPengguna
                    wilayahRt={wilayahRt}
                    emailTerpakai={pengguna.map((p) => p.email.toLowerCase())}
                    onBatal={() => setMenambah(false)}
                    onTambah={(baru) => {
                        onSimpan([
                            ...pengguna,
                            {
                                ...baru,
                                id:
                                    Math.max(0, ...pengguna.map((p) => p.id)) +
                                    1,
                                aktif: true,
                            },
                        ]);
                        setMenambah(false);
                    }}
                />
            )}

            {/* Batas tinggi disetel ke tinggi alami kolom kiri (832 px pada
                1920x1080), bukan angka karangan: tanpa batas, sepuluh akun
                membuat kartu ini 907 px dan menyeret seluruh halaman 28 px
                melewati satu layar. Pada 43rem kolomnya berimbang, halaman muat
                pas, dan sembilan dari sepuluh baris tetap terlihat sekaligus. */}
            <Table containerClassName="lg:max-h-[43rem]">
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col">Nama dan email</TableHead>
                        <TableHead scope="col">Peran</TableHead>
                        <TableHead scope="col">RT binaan</TableHead>
                        <TableHead scope="col">Status</TableHead>
                        <TableHead scope="col" className="text-right">
                            Aksi
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pengguna.map((p) => {
                        const terkunci = adminAktifTerakhir(pengguna, p.id);

                        return (
                            <TableRow key={p.id}>
                                <TableCell>
                                    <span
                                        className={`block font-semibold ${p.aktif ? '' : 'text-muted-foreground'}`}
                                    >
                                        {p.nama}
                                    </span>
                                    <span className="block text-sm text-muted-foreground">
                                        {p.email}
                                    </span>
                                </TableCell>

                                <TableCell>
                                    <label
                                        htmlFor={`peran-${p.id}`}
                                        className="sr-only"
                                    >
                                        Peran {p.nama}
                                    </label>
                                    <select
                                        id={`peran-${p.id}`}
                                        value={p.peran}
                                        disabled={terkunci}
                                        onChange={(e) => {
                                            const baru = e.target
                                                .value as Peran;

                                            ubah(p.id, {
                                                peran: baru,
                                                // Bidan dan admin melihat
                                                // seluruh RW, jadi RT binaan
                                                // tidak punya arti bagi keduanya.
                                                rt:
                                                    baru === 'kader'
                                                        ? (p.rt ??
                                                          wilayahRt[0] ??
                                                          null)
                                                        : null,
                                            });
                                        }}
                                        className="isian font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {URUTAN_PERAN.map((x) => (
                                            <option key={x} value={x}>
                                                {NAMA_PERAN[x]}
                                            </option>
                                        ))}
                                    </select>
                                </TableCell>

                                <TableCell>
                                    {p.peran === 'kader' ? (
                                        <>
                                            <label
                                                htmlFor={`rt-${p.id}`}
                                                className="sr-only"
                                            >
                                                RT binaan {p.nama}
                                            </label>
                                            <select
                                                id={`rt-${p.id}`}
                                                value={p.rt ?? ''}
                                                onChange={(e) =>
                                                    ubah(p.id, {
                                                        rt: e.target.value,
                                                    })
                                                }
                                                className="isian font-semibold"
                                            >
                                                {wilayahRt.map((w) => (
                                                    <option key={w} value={w}>
                                                        {labelRt(w)}
                                                    </option>
                                                ))}
                                            </select>
                                        </>
                                    ) : (
                                        /* Bukan sel kosong: bidan dan admin
                                           memang melihat semua RT, dan itu
                                           keterangan, bukan data yang hilang. */
                                        <span className="text-muted-foreground">
                                            Semua RT
                                        </span>
                                    )}
                                </TableCell>

                                <TableCell>
                                    <span
                                        className={`inline-block rounded-md px-3 py-1.5 text-sm font-bold ${
                                            p.aktif
                                                ? 'bg-tone-green-bg text-tone-green'
                                                : 'bg-surface-alt text-muted-foreground'
                                        }`}
                                    >
                                        {p.aktif ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </TableCell>

                                <TableCell className="text-right">
                                    <button
                                        type="button"
                                        disabled={terkunci}
                                        onClick={() =>
                                            ubah(p.id, { aktif: !p.aktif })
                                        }
                                        className="tombol-kedua disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <p className="shrink-0 border-t border-border px-5 py-4 text-sm text-pretty text-muted-foreground sm:px-6">
                Akun dinonaktifkan, bukan dihapus — riwayat perubahan menyebut
                nama pelakunya. Admin aktif terakhir tidak bisa diturunkan
                perannya maupun dinonaktifkan.
            </p>
        </section>
    );
}

/** Form akun baru. Hanya kolom yang wajib; kata sandi diatur lewat surel undangan. */
function FormPengguna({
    wilayahRt,
    emailTerpakai,
    onTambah,
    onBatal,
}: {
    wilayahRt: string[];
    emailTerpakai: string[];
    onTambah: (baru: Omit<Pengguna, 'id' | 'aktif'>) => void;
    onBatal: () => void;
}) {
    const [nama, setNama] = useState('');
    const [email, setEmail] = useState('');
    const [peran, setPeran] = useState<Peran>('kader');
    const [rt, setRt] = useState(wilayahRt[0] ?? '');

    const bentrok = emailTerpakai.includes(email.trim().toLowerCase());
    const lengkap = nama.trim() !== '' && email.trim() !== '' && !bentrok;

    return (
        <div className="shrink-0 border-b-2 border-border bg-accent px-5 py-5 sm:px-6">
            <h3 className="text-base font-bold">Tambah pengguna baru</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <IsianTeks
                    id="pengguna-nama"
                    label="Nama"
                    nilai={nama}
                    onGanti={setNama}
                />
                <IsianTeks
                    id="pengguna-email"
                    label="Email"
                    tipe="email"
                    nilai={email}
                    onGanti={setEmail}
                    galat={
                        bentrok ? 'Email ini sudah dipakai akun lain.' : null
                    }
                />

                <div>
                    <label
                        htmlFor="pengguna-peran"
                        className="block text-sm font-semibold text-muted-foreground"
                    >
                        Peran
                    </label>
                    <select
                        id="pengguna-peran"
                        value={peran}
                        onChange={(e) => setPeran(e.target.value as Peran)}
                        className="isian mt-1.5 w-full font-semibold"
                    >
                        {URUTAN_PERAN.map((x) => (
                            <option key={x} value={x}>
                                {NAMA_PERAN[x]}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="pengguna-rt"
                        className="block text-sm font-semibold text-muted-foreground"
                    >
                        RT binaan
                    </label>
                    {peran === 'kader' ? (
                        <select
                            id="pengguna-rt"
                            value={rt}
                            onChange={(e) => setRt(e.target.value)}
                            className="isian mt-1.5 w-full font-semibold"
                        >
                            {wilayahRt.map((w) => (
                                <option key={w} value={w}>
                                    {labelRt(w)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        /* Kotak pilih yang dinonaktifkan tetap berbentuk kontrol
                           dan mengundang klik yang tidak melakukan apa-apa;
                           kalimat ini menjawab pertanyaannya langsung. */
                        <p className="mt-1.5 flex h-14 items-center text-base text-muted-foreground">
                            Semua RT
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    disabled={!lengkap}
                    onClick={() =>
                        onTambah({
                            nama: nama.trim(),
                            email: email.trim(),
                            peran,
                            rt: peran === 'kader' ? rt : null,
                        })
                    }
                    className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                    Simpan pengguna
                </button>
                <button
                    type="button"
                    onClick={onBatal}
                    className="tombol-kedua"
                >
                    Batal
                </button>
                {!lengkap && !bentrok && (
                    <p className="text-sm text-muted-foreground">
                        Nama dan email harus diisi.
                    </p>
                )}
            </div>
        </div>
    );
}

function IsianTeks({
    id,
    label,
    nilai,
    tipe = 'text',
    galat = null,
    onGanti,
}: {
    id: string;
    label: string;
    nilai: string;
    tipe?: string;
    galat?: string | null;
    onGanti: (v: string) => void;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
            </label>
            <input
                id={id}
                type={tipe}
                value={nilai}
                onChange={(e) => onGanti(e.target.value)}
                aria-invalid={galat !== null}
                className={`isian mt-1.5 w-full ${galat === null ? '' : 'border-tone-red'}`}
            />
            {galat !== null && (
                <p className="mt-1 text-sm font-semibold text-tone-red">
                    {galat}
                </p>
            )}
        </div>
    );
}

function Rentang({
    label,
    satuan,
    min,
    max,
    onMin,
    onMax,
}: {
    label: string;
    satuan: string;
    min: number;
    max: number;
    onMin: (v: string) => void;
    onMax: (v: string) => void;
}) {
    const id = label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div>
            <p className="text-base font-semibold">{label}</p>
            <div className="mt-2 flex items-end gap-3">
                <Isian
                    id={`${id}-min`}
                    label="Minimal"
                    satuan={satuan}
                    nilai={min}
                    onGanti={onMin}
                />
                <Isian
                    id={`${id}-max`}
                    label="Maksimal"
                    satuan={satuan}
                    nilai={max}
                    onGanti={onMax}
                />
            </div>
        </div>
    );
}

function Isian({
    id,
    label,
    satuan,
    nilai,
    desimal = 1,
    onGanti,
}: {
    id: string;
    label: string;
    satuan: string;
    nilai: number;
    desimal?: number;
    onGanti: (v: string) => void;
}) {
    return (
        <div className="min-w-0 flex-1">
            {/* Semua label di atas kotaknya, tidak pernah di dalamnya. */}
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
            </label>
            {/* Satuan berada di segmen dalam kotak, bukan tombol terpisah. */}
            <div className="isian mt-1.5 flex items-stretch overflow-hidden p-0">
                <input
                    id={id}
                    inputMode="decimal"
                    value={angka(nilai, desimal)}
                    onChange={(e) => onGanti(e.target.value)}
                    className="w-full min-w-0 bg-transparent px-3.5 text-right text-lg font-bold outline-none"
                />
                <span className="flex shrink-0 items-center border-l-2 border-border bg-surface-subtle px-3 text-sm text-muted-foreground">
                    {satuan}
                </span>
            </div>
        </div>
    );
}
