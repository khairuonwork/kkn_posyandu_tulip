import { Eye, EyeOff, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import type { Pengguna, Peran } from '@/types/posyandu';
import {
    ATURAN_USERNAME,
    labelRt,
    NAMA_PERAN,
    POLA_USERNAME,
    SANDI_MINIMAL,
    URUTAN_PERAN,
} from '../tipe';
import type { IsianPengguna, PosyanduAkun, WilayahRtAkun } from '../tipe';

/**
 * Tambah atau ubah satu akun. Admin memberi kata sandi awal sendiri: Posyandu
 * tidak punya layanan surel untuk tautan undangan.
 */
export function DialogPengguna({
    pengguna,
    terkunci,
    wilayahRt,
    posyandu,
    usernameTerpakai,
    onTutup,
    onSimpan,
}: {
    /** null berarti akun baru. */
    pengguna: Pengguna | null;
    /** Admin aktif terakhir: peran dan statusnya tidak bisa diubah. */
    terkunci: boolean;
    wilayahRt: WilayahRtAkun[];
    posyandu: PosyanduAkun[];
    usernameTerpakai: string[];
    onTutup: () => void;
    /** Hasilnya null bila tersimpan, atau alasan penolakan dari server. */
    onSimpan: (isian: IsianPengguna) => Promise<string | null>;
}) {
    const [nama, setNama] = useState(pengguna?.nama ?? '');
    const [username, setUsername] = useState(pengguna?.username ?? '');
    const [peran, setPeran] = useState<Peran>(pengguna?.peran ?? 'kader');
    const [mejaKms, setMejaKms] = useState(pengguna?.mejaKms?.toString() ?? '');
    const [posyanduId, setPosyanduId] = useState<number | null>(
        pengguna?.posyanduId ?? posyandu[0]?.id ?? null,
    );
    const rtUntukPosyandu = wilayahRt.filter(
        (w) => w.posyanduId === posyanduId,
    );
    const [rt, setRt] = useState(pengguna?.rt ?? rtUntukPosyandu[0]?.rt ?? '');
    const [aktif, setAktif] = useState(pengguna?.aktif ?? true);
    const [bolehLihatData, setBolehLihatData] = useState(
        pengguna?.bolehLihatData ?? false,
    );
    const [kataSandi, setKataSandi] = useState('');
    const [dicoba, setDicoba] = useState(false);
    const [menyimpan, setMenyimpan] = useState(false);
    const [galatServer, setGalatServer] = useState<string | null>(null);
    const [berhasil, setBerhasil] = useState(false);
    const tutupSetelahSimpan = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (berhasil) {
            tutupSetelahSimpan.current?.click();
        }
    }, [berhasil]);
    const fokusIsian = useRef<HTMLElement | null>(null);
    const sandiRef = useRef<HTMLInputElement>(null);
    const [sandiTerbaca, setSandiTerbaca] = useState(false);
    const berubah =
        nama !== (pengguna?.nama ?? '') ||
        username !== (pengguna?.username ?? '') ||
        peran !== (pengguna?.peran ?? 'kader') ||
        posyanduId !== (pengguna?.posyanduId ?? posyandu[0]?.id ?? null) ||
        rt !== (pengguna?.rt ?? rtUntukPosyandu[0]?.rt ?? '') ||
        aktif !== (pengguna?.aktif ?? true) ||
        bolehLihatData !== (pengguna?.bolehLihatData ?? false) ||
        mejaKms !== (pengguna?.mejaKms?.toString() ?? '') ||
        kataSandi !== '';
    const mejaTidakSah =
        peran === 'kms' && mejaKms !== '' && !/^[1-9]\d?$/.test(mejaKms);

    // Huruf kecil dipaksakan, sama seperti di server: "Kader01" tetap kader01.
    const usernameBersih = username.trim().toLowerCase();
    const bentrok = usernameTerpakai.includes(usernameBersih);
    const cakupanKosong = pengguna?.superAdmin !== true && posyanduId === null;
    const kosong = nama.trim() === '' || usernameBersih === '';
    const salahBentuk =
        usernameBersih !== '' && !POLA_USERNAME.test(usernameBersih);
    const galatUsername = bentrok
        ? 'Nama pengguna ini sudah dipakai akun lain.'
        : dicoba && salahBentuk
          ? ATURAN_USERNAME
          : null;
    const galatSandi =
        pengguna === null && kataSandi === ''
            ? 'Kata sandi awal wajib diisi.'
            : kataSandi !== '' && kataSandi.length < SANDI_MINIMAL
              ? `Kata sandi minimal ${SANDI_MINIMAL} karakter.`
              : null;
    // ponytail: penolakan sandi dari server (sandi umum, memuat nama) dikenali
    // dari awal pesannya. Ganti dengan penanda kolom dari server bila pesan
    // sandi suatu saat tidak lagi diawali "Kata sandi".
    const galatSandiServer = galatServer?.startsWith('Kata sandi')
        ? galatServer
        : null;
    const sandiSalah =
        (dicoba && galatSandi !== null) || galatSandiServer !== null;

    return (
        <Dialog
            judul={
                pengguna === null ? 'Tambah pengguna' : `Ubah ${pengguna.nama}`
            }
            keterangan="Setiap perubahan dicatat: siapa yang mengubah dan kapan."
            lebar="w-[640px]"
            onTutup={onTutup}
            animasiDetail
            berubah={berubah && !berhasil}
            menyimpan={menyimpan}
        >
            <button
                ref={tutupSetelahSimpan}
                type="button"
                data-tutup-dialog
                hidden
            />
            <form
                noValidate
                onFocusCapture={(e) => {
                    if (e.target.matches('input, select')) {
                        fokusIsian.current = e.target;
                    }
                }}
                onSubmit={(e) => {
                    e.preventDefault();
                    setDicoba(true);

                    if (
                        kosong ||
                        bentrok ||
                        salahBentuk ||
                        galatSandi !== null ||
                        mejaTidakSah ||
                        cakupanKosong ||
                        menyimpan
                    ) {
                        return;
                    }

                    setMenyimpan(true);
                    setGalatServer(null);
                    // Bila tersimpan, BagianPengguna menutup dialog ini.
                    void onSimpan({
                        nama: nama.trim(),
                        username: usernameBersih,
                        peran,
                        rt: peran === 'kader' ? rt : null,
                        posyanduId,
                        mejaKms:
                            peran === 'kms' && mejaKms !== ''
                                ? Number(mejaKms)
                                : null,
                        aktif,
                        bolehLihatData:
                            (peran === 'kader' || peran === 'kms') &&
                            bolehLihatData,
                        kataSandi,
                    })
                        .catch(
                            () =>
                                'Perubahan tidak dapat disimpan. Silakan ulangi.',
                        )
                        .then((galat) => {
                            setGalatServer(galat ?? null);
                            setMenyimpan(false);

                            if (galat === null) {
                                setBerhasil(true);
                            }

                            if (galat) {
                                requestAnimationFrame(() =>
                                    (galat.startsWith('Kata sandi')
                                        ? sandiRef.current
                                        : fokusIsian.current
                                    )?.focus(),
                                );
                            }
                        });
                }}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="grid min-h-0 gap-4 overflow-y-auto px-7 pt-4.5 pb-5.5 sm:grid-cols-2">
                    <KolomPengguna id="pengguna-nama" label="Nama lengkap">
                        <input
                            id="pengguna-nama"
                            value={nama}
                            maxLength={120}
                            onChange={(e) => setNama(e.target.value)}
                            className="isian w-full"
                        />
                    </KolomPengguna>
                    <KolomPengguna
                        id="pengguna-username"
                        label="Nama pengguna"
                        galat={galatUsername}
                    >
                        <input
                            id="pengguna-username"
                            type="text"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            maxLength={32}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            aria-invalid={galatUsername !== null}
                            aria-describedby="pengguna-username-ket"
                            className={`isian w-full ${galatUsername !== null ? 'border-tone-red' : ''}`}
                        />
                        {galatUsername === null && (
                            <p
                                id="pengguna-username-ket"
                                className="mt-1.5 text-sm text-muted-foreground"
                            >
                                Dipakai untuk masuk. Contoh: kader01.
                            </p>
                        )}
                    </KolomPengguna>
                    <KolomPengguna id="pengguna-peran" label="Peran">
                        <select
                            id="pengguna-peran"
                            value={peran}
                            disabled={terkunci}
                            onChange={(e) => setPeran(e.target.value as Peran)}
                            className="isian w-full cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {URUTAN_PERAN.map((x) => (
                                <option key={x} value={x}>
                                    {NAMA_PERAN[x]}
                                </option>
                            ))}
                        </select>
                    </KolomPengguna>
                    <KolomPengguna
                        id="pengguna-posyandu"
                        label="Posyandu / RW"
                        galat={
                            dicoba && cakupanKosong
                                ? 'Pilih Posyandu/RW untuk akun ini.'
                                : null
                        }
                    >
                        {pengguna?.superAdmin ? (
                            <p className="flex min-h-14 items-center font-semibold text-primary">
                                Superadmin · semua Posyandu/RW
                            </p>
                        ) : (
                            <select
                                id="pengguna-posyandu"
                                value={posyanduId ?? ''}
                                onChange={(e) => {
                                    const id = Number(e.target.value) || null;
                                    setPosyanduId(id);
                                    setMejaKms('');
                                    setRt(
                                        wilayahRt.find(
                                            (w) => w.posyanduId === id,
                                        )?.rt ?? '',
                                    );
                                }}
                                className="isian w-full cursor-pointer font-semibold"
                            >
                                <option value="" disabled>
                                    Pilih Posyandu/RW
                                </option>
                                {posyandu.map((x) => (
                                    <option key={x.id} value={x.id}>
                                        {x.nama} · RW {x.rw}
                                    </option>
                                ))}
                            </select>
                        )}
                    </KolomPengguna>
                    {peran === 'kms' && (
                        <KolomPengguna
                            id="pengguna-meja-kms"
                            label="Nomor meja KMS"
                            galat={
                                dicoba && mejaTidakSah
                                    ? 'Masukkan nomor meja 1 sampai 99.'
                                    : null
                            }
                        >
                            <input
                                id="pengguna-meja-kms"
                                inputMode="numeric"
                                value={mejaKms}
                                aria-invalid={dicoba && mejaTidakSah}
                                aria-describedby="pengguna-meja-kms-ket"
                                onChange={(e) => setMejaKms(e.target.value)}
                                className="isian w-full"
                            />
                            <p
                                id="pengguna-meja-kms-ket"
                                className="mt-1.5 text-sm text-muted-foreground"
                            >
                                Kosongkan jika petugas belum mendapat meja.
                            </p>
                        </KolomPengguna>
                    )}
                    <KolomPengguna
                        id="pengguna-rt"
                        label={
                            peran === 'kader'
                                ? 'RT asal kader'
                                : 'Hak dalam Posyandu'
                        }
                    >
                        {peran === 'kader' ? (
                            <select
                                id="pengguna-rt"
                                value={rt}
                                onChange={(e) => setRt(e.target.value)}
                                disabled={rtUntukPosyandu.length === 0}
                                className="isian w-full cursor-pointer font-semibold disabled:opacity-60"
                            >
                                {rtUntukPosyandu.map((w) => (
                                    <option key={w.rt} value={w.rt}>
                                        {labelRt(w.rt)}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="flex min-h-14 items-center text-base text-muted-foreground">
                                {peran === 'admin'
                                    ? 'Admin Posyandu · kelola akun dan wilayah cluster'
                                    : peran === 'bidan'
                                      ? 'Bidan · KMS, pengukuran, dan verifikasi'
                                      : 'Petugas KMS · pemeriksaan dan edukasi'}
                            </p>
                        )}
                    </KolomPengguna>
                    {peran === 'kader' && (
                        <p className="-mt-3 text-sm text-muted-foreground sm:col-span-2">
                            Kader dapat melihat sasaran semua RT dalam Posyandu
                            terpilih. RT asal hanya penugasan.
                        </p>
                    )}
                    {(peran === 'kader' || peran === 'kms') && (
                        <fieldset className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3.5 sm:col-span-2">
                            <legend className="px-1 text-sm font-semibold text-muted-foreground">
                                Akses data balita
                            </legend>
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={bolehLihatData}
                                    onChange={(e) =>
                                        setBolehLihatData(e.target.checked)
                                    }
                                    aria-describedby="pengguna-lihat-ket"
                                    className="mt-0.5 size-5 shrink-0 accent-primary"
                                />
                                <span className="flex flex-col gap-0.5">
                                    <span className="text-base font-semibold">
                                        Boleh melihat Beranda dan Data Balita
                                    </span>
                                    <span
                                        id="pengguna-lihat-ket"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Termasuk Detail Balita. Hanya untuk
                                        dilihat; akun ini tidak dapat mengubah,
                                        menambah, atau menghapus data.
                                    </span>
                                </span>
                            </label>
                        </fieldset>
                    )}
                    <KolomPengguna
                        id="pengguna-sandi"
                        label={
                            pengguna === null
                                ? 'Kata sandi awal'
                                : 'Kata sandi baru'
                        }
                        galat={
                            galatSandiServer ?? (sandiSalah ? galatSandi : null)
                        }
                    >
                        <div className="relative">
                            <input
                                ref={sandiRef}
                                id="pengguna-sandi"
                                type={sandiTerbaca ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={kataSandi}
                                onChange={(e) => {
                                    setKataSandi(e.target.value);

                                    if (galatSandiServer !== null) {
                                        setGalatServer(null);
                                    }
                                }}
                                aria-invalid={sandiSalah}
                                aria-describedby={`pengguna-sandi-ket${sandiSalah ? ' pengguna-sandi-galat' : ''}`}
                                className={`isian w-full pr-14 ${sandiSalah ? 'border-tone-red' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => setSandiTerbaca(!sandiTerbaca)}
                                aria-pressed={sandiTerbaca}
                                aria-label={
                                    sandiTerbaca
                                        ? 'Sembunyikan kata sandi'
                                        : 'Tampilkan kata sandi'
                                }
                                className="absolute top-1/2 right-0.5 grid size-[44px] -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
                            >
                                {sandiTerbaca ? (
                                    <EyeOff
                                        className="size-[19px]"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Eye
                                        className="size-[19px]"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        </div>
                        <p
                            id="pengguna-sandi-ket"
                            className="mt-1.5 text-sm text-muted-foreground"
                        >
                            {pengguna === null
                                ? `Minimal ${SANDI_MINIMAL} karakter, boleh memakai spasi. Gabungan 2–3 kata yang mudah diingat lebih aman, misalnya kopi manis pagi. Hindari nama posyandu, nama RW, dan nama pengguna.`
                                : 'Kosongkan jika tidak diganti. Jika diganti, akun ini keluar dari semua perangkat.'}
                        </p>
                    </KolomPengguna>
                    {pengguna !== null && (
                        <label className="flex min-h-13 cursor-pointer items-center gap-3 sm:col-span-2">
                            <input
                                type="checkbox"
                                checked={aktif}
                                disabled={terkunci}
                                onChange={(e) => setAktif(e.target.checked)}
                                className="size-5 accent-primary"
                            />
                            <span className="text-base font-semibold">
                                Akun aktif
                            </span>
                        </label>
                    )}
                    {terkunci && (
                        <p className="text-sm text-muted-foreground sm:col-span-2">
                            {pengguna?.superAdmin
                                ? 'Akun superadmin global harus tetap aktif dengan peran Admin Posyandu.'
                                : 'Admin aktif terakhir di Posyandu ini tidak bisa diturunkan perannya maupun dinonaktifkan.'}
                        </p>
                    )}
                    {dicoba && kosong && (
                        <p className="text-sm font-semibold text-tone-red sm:col-span-2">
                            Nama lengkap dan nama pengguna harus diisi.
                        </p>
                    )}
                    {galatServer !== null && galatSandiServer === null && (
                        <p
                            role="alert"
                            className="text-sm font-semibold text-tone-red sm:col-span-2"
                        >
                            {galatServer}
                        </p>
                    )}
                </div>
                <KakiDialog>
                    <button
                        type="button"
                        data-tutup-dialog
                        className="tombol-kedua px-5.5"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={menyimpan}
                        className="tombol-utama px-5.5 disabled:cursor-wait disabled:opacity-60"
                    >
                        <Save
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        {menyimpan
                            ? 'Menyimpan…'
                            : pengguna === null
                              ? 'Simpan pengguna'
                              : 'Simpan perubahan'}
                    </button>
                </KakiDialog>
            </form>
        </Dialog>
    );
}

export function KolomPengguna({
    id,
    label,
    galat = null,
    children,
}: {
    id: string;
    label: string;
    galat?: string | null;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
            </label>
            <div className="mt-1.5">{children}</div>
            {galat !== null && (
                <p
                    id={`${id}-galat`}
                    className="mt-1.5 text-sm font-semibold text-tone-red"
                >
                    {galat}
                </p>
            )}
        </div>
    );
}
