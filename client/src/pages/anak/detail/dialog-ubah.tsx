import { ChevronDown, Mars, Save, Venus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import { angka, namaTampil, nik } from '@/lib/format';
import type { Anak, JenisKelamin } from '@/types/posyandu';
import type { PatchAnak } from '@/pages/anak/index';

type IsianUbah = {
    nama: string;
    jk: JenisKelamin;
    tglLahir: string;
    anakKe: string;
    bbLahir: string;
    rt: string;
    nik: string;
    bukuKia: boolean;
    kbIbu: string;
    desil: string;
    namaOrtu: string;
    noWa: string;
};

export function DialogUbah({
    anak,
    periodeId,
    noWa,
    wilayahRt,
    onTutup,
    onSimpan,
}: {
    anak: Anak;
    periodeId: string;
    noWa: string | null;
    wilayahRt: string[];
    onTutup: () => void;
    onSimpan: (patch: PatchAnak) => void | Promise<void>;
}) {
    const [isi, setIsi] = useState<IsianUbah>({
        nama: anak.nama ?? '',
        jk: anak.jk ?? 'P',
        tglLahir: anak.tglLahir ?? '',
        anakKe: anak.anakKe === null ? '' : String(anak.anakKe),
        bbLahir: anak.bbLahirKg === null ? '' : angka(anak.bbLahirKg, 2),
        rt: anak.rt ?? wilayahRt[0] ?? '',
        nik: anak.nik === null ? '' : nik(anak.nik),
        bukuKia: anak.bukuKia,
        kbIbu: anak.kbIbu == null ? '' : anak.kbIbu ? 'iya' : 'tidak',
        desil: anak.desil == null ? '' : String(anak.desil),
        namaOrtu: anak.namaOrtu ?? '',
        noWa: noWa ?? '',
    });
    const [galat, setGalat] = useState<
        Partial<Record<keyof IsianUbah, string>>
    >({});
    const [galatSimpan, setGalatSimpan] = useState('');
    const [menyimpan, setMenyimpan] = useState(false);

    const ubah = <K extends keyof IsianUbah>(kunci: K, nilai: IsianUbah[K]) => {
        setIsi((lama) => ({ ...lama, [kunci]: nilai }));
        setGalat((lama) => ({ ...lama, [kunci]: undefined }));
    };

    const simpan = async (e: FormEvent) => {
        e.preventDefault();

        const salah: Partial<Record<keyof IsianUbah, string>> = {};
        const digit = isi.nik.replace(/\D/g, '');
        const bb =
            isi.bbLahir.trim() === ''
                ? null
                : Number(isi.bbLahir.replace(',', '.'));

        if (isi.nama.trim() === '') {
            salah.nama = 'Nama balita wajib diisi.';
        }

        if (isi.tglLahir === '') {
            salah.tglLahir = 'Tanggal lahir wajib diisi.';
        }

        if (digit !== '' && digit.length !== 16) {
            salah.nik = `NIK harus 16 angka. Sekarang ${digit.length < 16 ? 'baru ' : ''}${digit.length}.`;
        }

        if (bb !== null && !(bb >= 0.5 && bb <= 6)) {
            salah.bbLahir = `Berat lahir ${isi.bbLahir.trim()} kg di luar batas wajar (0,5–6,0 kg). Periksa kembali angkanya.`;
        }

        setGalat(salah);

        const pertama = Object.keys(salah)[0];

        if (pertama !== undefined) {
            document.getElementById(`ubah-${pertama}`)?.focus();

            return;
        }

        setMenyimpan(true);
        setGalatSimpan('');

        try {
            await onSimpan({
                nama: isi.nama.trim(),
                nik: digit,
                namaOrtu: isi.namaOrtu.trim(),
                rt: isi.rt,
                jk: isi.jk,
                tglLahir: isi.tglLahir,
                anakKe: isi.anakKe === '' ? null : Number(isi.anakKe),
                bbLahirKg: bb,
                bukuKia: isi.bukuKia,
                kbIbu: isi.kbIbu === '' ? null : isi.kbIbu === 'iya',
                noWa: isi.noWa.trim(),
                ...(isi.desil !== (anak.desil == null ? '' : String(anak.desil))
                    ? {
                          desil: isi.desil === '' ? null : Number(isi.desil),
                          periodeId,
                       }
                    : {}),
            });
        } catch (error) {
            setGalatSimpan(
                error instanceof Error
                    ? error.message
                    : 'Perubahan profil belum tersimpan. Silakan coba lagi.',
            );
        } finally {
            setMenyimpan(false);
        }
    };

    return (
        <Dialog
            judul={`Ubah data ${namaTampil(anak.nama)}`}
            keterangan="Hasil ukur tidak diubah di sini. Setiap perubahan dicatat: siapa yang mengubah dan kapan."
            lebar="w-[920px]"
            onTutup={onTutup}
        >
            <form
                noValidate
                onSubmit={simpan}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="grid min-h-0 gap-y-5 overflow-y-auto px-7 pt-4.5 pb-5.5 md:grid-cols-2">
                    <section
                        aria-labelledby="kolom-balita"
                        className="flex min-w-0 flex-col gap-4 md:pr-7"
                    >
                        <h3
                            id="kolom-balita"
                            className="text-base font-extrabold"
                        >
                            Data balita
                        </h3>
                        <Kolom
                            id="ubah-nama"
                            label="Nama balita"
                            galat={galat.nama}
                        >
                            <input
                                id="ubah-nama"
                                value={isi.nama}
                                onChange={(e) => ubah('nama', e.target.value)}
                                aria-invalid={galat.nama !== undefined}
                                className={`isian w-full ${galat.nama === undefined ? '' : 'border-tone-red'}`}
                            />
                        </Kolom>
                        <fieldset className="min-w-0">
                            <legend className="text-sm font-semibold text-muted-foreground">
                                Jenis kelamin
                            </legend>
                            <div className="mt-1.5 grid grid-cols-2 gap-4.5">
                                <Pilihan
                                    nama="ubah-jk"
                                    terpilih={isi.jk === 'L'}
                                    onPilih={() => ubah('jk', 'L')}
                                >
                                    <Mars
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Laki-laki
                                </Pilihan>
                                <Pilihan
                                    nama="ubah-jk"
                                    terpilih={isi.jk === 'P'}
                                    onPilih={() => ubah('jk', 'P')}
                                >
                                    <Venus
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Perempuan
                                </Pilihan>
                            </div>
                        </fieldset>
                        <div className="grid grid-cols-2 gap-4.5">
                            <Kolom
                                id="ubah-tglLahir"
                                label="Tanggal lahir"
                                galat={galat.tglLahir}
                            >
                                <input
                                    id="ubah-tglLahir"
                                    type="date"
                                    value={isi.tglLahir}
                                    onChange={(e) =>
                                        ubah('tglLahir', e.target.value)
                                    }
                                    aria-invalid={galat.tglLahir !== undefined}
                                    className={`isian w-full ${galat.tglLahir === undefined ? '' : 'border-tone-red'}`}
                                />
                            </Kolom>
                            <Kolom id="ubah-anakKe" label="Anak ke-">
                                <input
                                    id="ubah-anakKe"
                                    inputMode="numeric"
                                    value={isi.anakKe}
                                    onChange={(e) =>
                                        ubah(
                                            'anakKe',
                                            e.target.value.replace(/\D/g, ''),
                                        )
                                    }
                                    className="isian w-full"
                                />
                            </Kolom>
                        </div>
                        <div className="grid grid-cols-2 gap-4.5">
                            <Kolom
                                id="ubah-bbLahir"
                                label="Berat lahir"
                                keterangan="(boleh kosong)"
                                galat={galat.bbLahir}
                            >
                                <div
                                    className={`isian flex overflow-hidden p-0 ${galat.bbLahir === undefined ? '' : 'border-tone-red'}`}
                                >
                                    <input
                                        id="ubah-bbLahir"
                                        aria-invalid={
                                            galat.bbLahir !== undefined
                                        }
                                        inputMode="decimal"
                                        value={isi.bbLahir}
                                        onChange={(e) =>
                                            ubah(
                                                'bbLahir',
                                                e.target.value.replace(
                                                    /[^\d.,]/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        className="min-w-0 grow bg-transparent px-3.5 text-right outline-none"
                                    />
                                    <span className="flex items-center border-l-2 border-border bg-surface-alt px-3.5 text-sm text-muted-foreground">
                                        kg
                                    </span>
                                </div>
                            </Kolom>
                            <Kolom id="ubah-rt" label="RT">
                                <div className="relative">
                                    <select
                                        id="ubah-rt"
                                        value={isi.rt}
                                        onChange={(e) =>
                                            ubah('rt', e.target.value)
                                        }
                                        className="isian w-full cursor-pointer appearance-none pr-11"
                                    >
                                        {wilayahRt.map((w) => (
                                            <option key={w} value={w}>
                                                RT {w.padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                </div>
                            </Kolom>
                        </div>
                    </section>

                    <section
                        aria-labelledby="kolom-ortu"
                        className="flex min-w-0 flex-col gap-4 md:border-l md:border-border md:pl-7"
                    >
                        <h3
                            id="kolom-ortu"
                            className="text-base font-extrabold"
                        >
                            Dokumen dan orang tua
                        </h3>
                        <Kolom
                            id="ubah-nik"
                            label="NIK balita"
                            keterangan="(16 angka, sesuai kartu keluarga)"
                            galat={galat.nik}
                        >
                            <input
                                id="ubah-nik"
                                inputMode="numeric"
                                value={isi.nik}
                                onChange={(e) =>
                                    ubah(
                                        'nik',
                                        e.target.value.replace(/[^\d ]/g, ''),
                                    )
                                }
                                aria-invalid={galat.nik !== undefined}
                                className={`isian w-full ${galat.nik === undefined ? '' : 'border-tone-red'}`}
                            />
                        </Kolom>
                        <fieldset className="min-w-0">
                            <legend className="text-sm font-semibold text-muted-foreground">
                                Buku KIA
                            </legend>
                            <div className="mt-1.5 grid grid-cols-2 gap-4.5">
                                <Pilihan
                                    nama="ubah-kia"
                                    terpilih={isi.bukuKia}
                                    onPilih={() => ubah('bukuKia', true)}
                                >
                                    Ada
                                </Pilihan>
                                <Pilihan
                                    nama="ubah-kia"
                                    terpilih={!isi.bukuKia}
                                    onPilih={() => ubah('bukuKia', false)}
                                >
                                    Belum ada
                                </Pilihan>
                            </div>
                        </fieldset>
                        <Kolom
                            id="ubah-desil"
                            label="Kelompok Desil"
                            keterangan="Desil 1–4: Gakin; Desil 5–10: Non Gakin. Berlaku mulai periode yang dipilih untuk laporan F1."
                        >
                            <select
                                id="ubah-desil"
                                className="isian w-full"
                                value={isi.desil}
                                onChange={(e) => ubah('desil', e.target.value)}
                            >
                                <option value="">Belum tercatat</option>
                                {Array.from(
                                    { length: 10 },
                                    (_, i) => i + 1,
                                ).map((d) => (
                                    <option key={d} value={d}>
                                        Desil {d} ·{' '}
                                        {d <= 4
                                            ? 'G (Gakin)'
                                            : 'NG (Non Gakin)'}
                                    </option>
                                ))}
                            </select>
                        </Kolom>
                        <Kolom id="ubah-kbIbu" label="Data KB Ibu">
                            <select
                                id="ubah-kbIbu"
                                className="isian w-full"
                                value={isi.kbIbu}
                                onChange={(e) => ubah('kbIbu', e.target.value)}
                            >
                                <option value="">Belum tercatat</option>
                                <option value="iya">Iya</option>
                                <option value="tidak">Tidak</option>
                            </select>
                        </Kolom>
                        <Kolom id="ubah-namaOrtu" label="Nama ibu">
                            <input
                                id="ubah-namaOrtu"
                                value={isi.namaOrtu}
                                onChange={(e) =>
                                    ubah('namaOrtu', e.target.value)
                                }
                                className="isian w-full"
                            />
                        </Kolom>
                        <Kolom
                            id="ubah-noWa"
                            label="Nomor WhatsApp orang tua"
                            keterangan="(boleh kosong)"
                        >
                            <input
                                id="ubah-noWa"
                                type="tel"
                                inputMode="tel"
                                value={isi.noWa}
                                onChange={(e) =>
                                    ubah(
                                        'noWa',
                                        e.target.value.replace(/[^\d +-]/g, ''),
                                    )
                                }
                                className="isian w-full"
                            />
                        </Kolom>
                    </section>
                </div>

                {galatSimpan !== '' && (
                    <p
                        role="alert"
                        className="mx-7 mb-3 rounded-lg bg-tone-red-bg px-4 py-3 text-sm font-semibold text-tone-red"
                    >
                        {galatSimpan}
                    </p>
                )}
                <KakiDialog>
                    <button
                        type="button"
                        onClick={onTutup}
                        disabled={menyimpan}
                        className="tombol-kedua px-5.5"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={menyimpan}
                        className="tombol-utama px-5.5"
                    >
                        {menyimpan ? (
                            <span
                                className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent"
                                aria-hidden="true"
                            />
                        ) : (
                            <Save
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        )}
                        {menyimpan ? 'Menyimpan…' : 'Simpan perubahan'}
                    </button>
                </KakiDialog>
            </form>
        </Dialog>
    );
}

/** Satu isian berlabel dengan pesan galat di bawahnya. */
function Kolom({
    id,
    label,
    keterangan,
    galat,
    children,
}: {
    id: string;
    label: string;
    keterangan?: string;
    galat?: string;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
                {keterangan !== undefined && (
                    <span className="font-medium"> {keterangan}</span>
                )}
            </label>
            <div className="mt-1.5">{children}</div>
            {galat !== undefined && (
                <p className="mt-1.5 text-sm font-semibold text-tone-red">
                    {galat}
                </p>
            )}
        </div>
    );
}

/** Kartu radio: seluruh kotak bisa disentuh, yang terpilih hijau lembut. */
function Pilihan({
    nama,
    terpilih,
    onPilih,
    children,
}: {
    nama: string;
    terpilih: boolean;
    onPilih: () => void;
    children: ReactNode;
}) {
    return (
        <label
            className={`flex h-14 cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3.5 text-base ${
                terpilih
                    ? 'border-primary bg-accent font-bold text-primary'
                    : 'border-border bg-surface font-semibold'
            }`}
        >
            <input
                type="radio"
                name={nama}
                checked={terpilih}
                onChange={onPilih}
                className="size-5 shrink-0 accent-primary"
            />
            {children}
        </label>
    );
}
