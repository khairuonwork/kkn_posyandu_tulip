import { useState } from 'react';
import type { JenisKelamin } from '@/types/posyandu';
import { Isian } from './editor-baris';
import { labelRt } from './tipe';
import type { AnakBaru } from './tipe';

/** Form balita baru. Hanya kolom yang wajib; sisanya diisi lewat penimbangan. */
export function FormTambah({
    wilayahRt,
    rtAwal,
    onBatal,
    onSimpan,
}: {
    wilayahRt: string[];
    rtAwal: string;
    onBatal: () => void;
    onSimpan: (baru: AnakBaru) => void;
}) {
    const [nama, setNama] = useState('');
    const [galat, setGalat] = useState(false);
    const [tglLahir, setTglLahir] = useState('');
    const [jk, setJk] = useState<JenisKelamin>('P');
    const [namaOrtu, setNamaOrtu] = useState('');
    const [rt, setRt] = useState(rtAwal === '' ? (wilayahRt[0] ?? '') : rtAwal);

    const lengkap = nama.trim() !== '' && tglLahir !== '';

    return (
        <section className="shrink-0 border-b border-border bg-accent px-4.5 py-5">
            <div className="kartu p-5 sm:p-6">
                <h2 className="text-xl font-extrabold">Tambah balita baru</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Isian
                        label="Nama balita"
                        nilai={nama}
                        onGanti={setNama}
                        petunjuk="Nama lengkap"
                    />
                    <Isian
                        label="Tanggal lahir"
                        nilai={tglLahir}
                        onGanti={setTglLahir}
                        tipe="date"
                    />
                    <label
                        htmlFor="tambah-jk"
                        className="flex flex-col gap-1.5"
                    >
                        <span className="text-sm font-semibold text-muted-foreground">
                            Jenis kelamin
                        </span>
                        <select
                            id="tambah-jk"
                            value={jk}
                            onChange={(e) =>
                                setJk(e.target.value as JenisKelamin)
                            }
                            className="isian w-full"
                        >
                            <option value="P">Perempuan</option>
                            <option value="L">Laki-laki</option>
                        </select>
                    </label>
                    <Isian
                        label="Nama ibu"
                        nilai={namaOrtu}
                        onGanti={setNamaOrtu}
                        petunjuk="Nama lengkap ibu"
                    />
                    <label
                        htmlFor="tambah-rt"
                        className="flex flex-col gap-1.5"
                    >
                        <span className="text-sm font-semibold text-muted-foreground">
                            RT
                        </span>
                        <select
                            id="tambah-rt"
                            value={rt}
                            onChange={(e) => setRt(e.target.value)}
                            className="isian w-full"
                        >
                            {wilayahRt.map((w) => (
                                <option key={w} value={w}>
                                    {labelRt(w)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <p className="mt-4 max-w-[75ch] text-sm text-pretty text-muted-foreground">
                    Anak baru belum punya pengukuran, jadi statusnya Belum
                    dinilai sampai ditimbang. Sasaran S ikut bertambah.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                    <button
                        type="button"
                        disabled={!lengkap}
                        onClick={() => {
                            try {
                                onSimpan({
                                    nama: nama.trim(),
                                    tglLahir,
                                    jk,
                                    namaOrtu: namaOrtu.trim(),
                                    rt,
                                });
                            } catch {
                                setGalat(true);
                            }
                        }}
                        className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                        Simpan balita baru
                    </button>
                    {galat && (
                        <p role="alert" className="pesan-balita">
                            Gagal menyimpan data. Coba lagi.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={onBatal}
                        className="tombol-kedua"
                    >
                        Batal
                    </button>
                    {!lengkap && (
                        <p className="text-sm text-muted-foreground">
                            Nama balita dan tanggal lahir harus diisi — umurnya
                            dihitung dari tanggal itu.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
