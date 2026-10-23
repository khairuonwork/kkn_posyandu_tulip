import { BookOpen, ChevronDown, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import IkonWhatsApp from '@/components/ikon-whatsapp';
import { tanggalPanjang } from '@/lib/format';
import {
    ambilPendampinganKia,
    hitungJawabanKia,
    simpanPendampinganKia,
} from '@/lib/pendampingan-kia';
import type {
    JawabanKia,
    PendampinganKia as Panduan,
    CatatanKia,
} from '@/lib/pendampingan-kia';
import type { DiskusiKiaWa } from '@/lib/pesan-wa';

export default function PendampinganKia({
    anakId,
    sumberLive,
    onKirimWa,
    onInfoKiaChange,
    alasanTanpaWa = null,
}: {
    anakId: number;
    sumberLive: boolean;
    onKirimWa?: (infoKia: DiskusiKiaWa | null) => void;
    onInfoKiaChange?: (infoKia: DiskusiKiaWa | null) => void;
    alasanTanpaWa?: string | null;
}) {
    const [data, setData] = useState<Panduan | null>(null);
    const [galat, setGalat] = useState('');
    const [ulang, setUlang] = useState(0);
    useEffect(() => {
        if (!sumberLive) {
            return;
        }

        const abort = new AbortController();
        void ambilPendampinganKia(anakId, abort.signal)
            .then(setData)
            .catch((error: unknown) => {
                if (!abort.signal.aborted) {
                    setGalat(
                        error instanceof Error
                            ? error.message
                            : 'Panduan belum dapat dimuat.',
                    );
                }
            });

        return () => abort.abort();
    }, [anakId, sumberLive, ulang]);

    return (
        <section
            className="kartu mt-6 overflow-hidden"
            aria-labelledby="judul-pendampingan-kia"
        >
            <header className="border-b border-border px-6 py-5">
                <div className="flex items-center gap-3">
                    <BookOpen
                        className="size-5 shrink-0 text-primary"
                        aria-hidden="true"
                    />
                    <h2
                        id="judul-pendampingan-kia"
                        className="text-xl font-extrabold"
                    >
                        Diskusi tumbuh kembang
                    </h2>
                </div>
                <p className="mt-2 max-w-[76ch] text-base text-muted-foreground">
                    Panduan kader bersama orang tua dari Buku KIA 2024.
                    Perkembangan dibahas terpisah dari hasil status gizi, bukan
                    sebagai diagnosis.
                </p>
            </header>
            {!sumberLive ? (
                <p className="px-6 py-5">
                    Survei tersimpan tersedia saat terhubung ke database live.
                    Mode contoh tidak menyimpan jawaban anak.
                </p>
            ) : galat ? (
                <div className="px-6 py-5" role="alert">
                    <p>{galat}</p>
                    <button
                        type="button"
                        className="tombol-kedua mt-3"
                        onClick={() => {
                            setGalat('');
                            setUlang((n) => n + 1);
                        }}
                    >
                        Coba muat lagi
                    </button>
                </div>
            ) : data ? (
                <IsiPendampingan
                    key={`${anakId}-${data.tanggal}-${data.kelompok?.id ?? 'tanpa'}`}
                    data={data}
                    anakId={anakId}
                    onTersimpan={setData}
                    onKirimWa={onKirimWa}
                    onInfoKiaChange={onInfoKiaChange}
                    alasanTanpaWa={alasanTanpaWa}
                />
            ) : (
                <div className="px-6 py-5" role="status" aria-live="polite">
                    <p>Menyiapkan panduan sesuai usia anak…</p>
                    <div className="mt-3 h-3 w-2/3 rounded bg-surface-subtle" />
                </div>
            )}
        </section>
    );
}

function IsiPendampingan({
    data,
    anakId,
    onTersimpan,
    onKirimWa,
    onInfoKiaChange,
    alasanTanpaWa,
}: {
    data: Panduan;
    anakId: number;
    onTersimpan: (data: Panduan) => void;
    onKirimWa?: (infoKia: DiskusiKiaWa | null) => void;
    onInfoKiaChange?: (infoKia: DiskusiKiaWa | null) => void;
    alasanTanpaWa?: string | null;
}) {
    const [terbuka, setTerbuka] = useState(false);
    const [jawaban, setJawaban] = useState<JawabanKia>(
        data.terkini?.jawaban ?? {},
    );
    const [catatan, setCatatan] = useState(data.terkini?.catatan ?? '');
    const [tindakLanjut, setTindakLanjut] = useState(
        data.terkini?.tindakLanjut ?? '',
    );
    const [dibahas, setDibahas] = useState(data.terkini?.dibahas ?? false);
    const [sibuk, setSibuk] = useState(false);
    const [galat, setGalat] = useState('');
    const [pesan, setPesan] = useState('');
    const [berubah, setBerubah] = useState(false);
    const kelompok = data.kelompok;
    const hitung = hitungJawabanKia(kelompok?.pertanyaan ?? [], jawaban);
    const arahanDiskusi = !kelompok
        ? ''
        : hitung.tidak > 0
          ? kelompok.jenis === 'perkembangan'
              ? 'Ada penanda perkembangan yang dijawab Tidak. Sesuai Buku KIA, segera konsultasikan ke Puskesmas atau tenaga kesehatan untuk pemeriksaan lebih lanjut.'
              : 'Ada perawatan yang perlu dibahas lebih lanjut bersama tenaga kesehatan.'
          : hitung.ya + hitung.tidak === 0
            ? 'Pantau perkembangan dan lakukan stimulasi harian di rumah sesuai panduan usia Buku KIA.'
            : hitung.belum > 0
              ? 'Sebagian penanda perkembangan masih perlu diamati bersama di rumah dan didiskusikan pada kunjungan Posyandu berikutnya.'
              : 'Seluruh penanda perkembangan pada rentang usia ini tercatat sesuai (Ya). Lanjutkan stimulasi harian dan pemantauan bulanan.';

    const infoKia = useMemo<DiskusiKiaWa | null>(() => {
        if (!kelompok) {
            return null;
        }

        return {
            kelompokLabel: kelompok.label,
            ya: hitung.ya,
            tidak: hitung.tidak,
            belum: hitung.belum,
            total: hitung.total,
            arahan: arahanDiskusi,
            catatan: catatan.trim() || undefined,
            tindakLanjut: tindakLanjut.trim() || undefined,
            makan: data.makan?.isi,
            stimulasi: kelompok.stimulasi,
        };
    }, [
        kelompok,
        hitung.ya,
        hitung.tidak,
        hitung.belum,
        hitung.total,
        arahanDiskusi,
        catatan,
        tindakLanjut,
        data.makan?.isi,
    ]);

    useEffect(() => {
        onInfoKiaChange?.(infoKia);
    }, [infoKia, onInfoKiaChange]);

    const ubah = () => {
        setPesan('');
        setGalat('');
        setBerubah(true);
    };

    async function simpanData(): Promise<boolean> {
        if (!kelompok || sibuk) {
            return false;
        }

        setGalat('');
        setPesan('');
        setSibuk(true);

        try {
            const baru = await simpanPendampinganKia(anakId, {
                tanggal: data.tanggal,
                versiBuku: data.sumber.versi,
                kelompokId: kelompok.id,
                revisi: data.terkini?.revisi ?? 0,
                jawaban,
                catatan,
                tindakLanjut,
                dibahas,
            });
            onTersimpan(baru);
            setBerubah(false);
            setPesan(
                `Catatan diskusi ${tanggalPanjang(baru.tanggal)} sudah tersimpan.`,
            );

            return true;
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Catatan belum tersimpan. Jawaban Anda tetap ada di formulir.',
            );

            return false;
        } finally {
            setSibuk(false);
        }
    }

    async function simpan(event: FormEvent) {
        event.preventDefault();
        await simpanData();
    }

    async function kirimWaSekarang() {
        if (!onKirimWa) {
            return;
        }

        const adaIsian = hitung.ya + hitung.tidak > 0 || catatan.trim() !== '';

        if (berubah && kelompok && adaIsian && !sibuk) {
            const berhasil = await simpanData();

            if (!berhasil) {
                return;
            }
        }

        onKirimWa(infoKia);
    }

    return (
        <>
            <div className="px-6 py-5">
                <p className="text-sm text-muted-foreground">
                    Usia hari ini · {tanggalPanjang(data.tanggal)}
                </p>
                <p className="mt-1 text-lg font-bold">
                    {data.umur?.label ?? 'Tanggal lahir perlu diperiksa'}
                </p>
                <p className="mt-1 max-w-[78ch] text-sm text-muted-foreground">
                    Panduan mengikuti usia hari ini, bukan bulan laporan yang
                    dipilih di sidebar.
                </p>
                {kelompok ? (
                    <>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 sm:px-5">
                            <div>
                                <h3 className="text-lg font-extrabold">
                                    {kelompok.jenis === 'perawatan'
                                        ? 'Checklist diskusi perawatan'
                                        : 'Survei penanda perkembangan'}{' '}
                                    · {kelompok.label}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <a
                                        className="inline-flex min-h-[38px] items-center text-base font-semibold text-primary underline underline-offset-4"
                                        href={`${data.sumber.url}#page=${kelompok.halamanPdf}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Buku KIA 2024, halaman{' '}
                                        {kelompok.halaman}
                                    </a>
                                    <span className="text-base text-muted-foreground">
                                        {data.terkini
                                            ? data.terkini.dibahas
                                                ? 'Diskusi hari ini sudah ditandai selesai.'
                                                : 'Catatan hari ini tersimpan; diskusi belum selesai.'
                                            : 'Belum ada catatan diskusi hari ini.'}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="tombol-kedua shrink-0 px-5 text-lg font-bold"
                                aria-expanded={terbuka}
                                aria-controls="form-survei-kia"
                                onClick={() => setTerbuka((v) => !v)}
                            >
                                {terbuka
                                    ? 'Tutup formulir'
                                    : data.terkini
                                      ? 'Lihat / perbarui survei'
                                      : 'Mulai survei'}
                                <ChevronDown
                                    className={`size-5 transition-transform ${terbuka ? 'rotate-180' : ''}`}
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                        {terbuka && (
                            <form
                                id="form-survei-kia"
                                onSubmit={simpan}
                                className="mt-5 border-t border-border pt-5"
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-3">
                                    <div>
                                        <p className="max-w-[76ch] text-lg font-medium">
                                            Tanyakan kepada orang tua dan amati
                                            bersama. Pilih “Belum diamati” jika
                                            belum dapat memastikan; jangan
                                            otomatis memilih Ya.
                                        </p>
                                        {kelompok.catatanSumber && (
                                            <p className="mt-1.5 max-w-[80ch] text-base text-muted-foreground">
                                                {kelompok.catatanSumber}
                                            </p>
                                        )}
                                    </div>
                                    <p
                                        className="rounded-lg bg-surface-subtle px-3.5 py-2 text-base font-extrabold"
                                        aria-live="polite"
                                    >
                                        {hitung.ya + hitung.tidak} dari{' '}
                                        {hitung.total} butir terjawab ·{' '}
                                        {hitung.belum} belum diamati
                                    </p>
                                </div>
                                <fieldset
                                    disabled={sibuk}
                                    className="mt-4 min-w-0"
                                >
                                    <legend className="sr-only">
                                        Jawaban {kelompok.label}
                                    </legend>
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {kelompok.pertanyaan.map((q, i) => {
                                            const nilaiSekarang =
                                                jawaban[q.id] ?? null;

                                            return (
                                                <fieldset
                                                    key={q.id}
                                                    className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs"
                                                >
                                                    <legend className="float-left mb-3.5 w-full text-lg leading-snug font-bold text-foreground">
                                                        {i + 1}. {q.teks}
                                                    </legend>
                                                    <div className="clear-both grid grid-cols-3 gap-2.5">
                                                        {(
                                                            [
                                                                ['ya', 'Ya'],
                                                                [
                                                                    'tidak',
                                                                    'Tidak',
                                                                ],
                                                                [
                                                                    'belum',
                                                                    'Belum diamati',
                                                                ],
                                                            ] as const
                                                        ).map(
                                                            ([
                                                                nilai,
                                                                label,
                                                            ]) => {
                                                                const terpilih =
                                                                    nilaiSekarang ===
                                                                    (nilai ===
                                                                    'belum'
                                                                        ? null
                                                                        : nilai);
                                                                const kelasNada =
                                                                    terpilih
                                                                        ? nilai ===
                                                                          'ya'
                                                                            ? 'border-primary bg-tone-green-bg text-tone-green font-extrabold'
                                                                            : nilai ===
                                                                                'tidak'
                                                                              ? 'border-tone-amber bg-tone-amber-bg text-tone-amber font-extrabold'
                                                                              : 'border-border-strong bg-surface-subtle text-foreground font-bold'
                                                                        : 'border-border bg-card text-foreground font-semibold hover:border-border-strong hover:bg-surface-subtle';

                                                                return (
                                                                    <label
                                                                        key={
                                                                            nilai
                                                                        }
                                                                        className={`flex min-h-13 cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-base transition-colors select-none ${kelasNada}`}
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            className="h-[20px] w-[20px] shrink-0 accent-primary"
                                                                            name={`kia-${q.id}`}
                                                                            value={
                                                                                nilai
                                                                            }
                                                                            checked={
                                                                                terpilih
                                                                            }
                                                                            onChange={() => {
                                                                                ubah();
                                                                                setDibahas(
                                                                                    false,
                                                                                );
                                                                                setJawaban(
                                                                                    (
                                                                                        v,
                                                                                    ) => ({
                                                                                        ...v,
                                                                                        [q.id]:
                                                                                            nilai ===
                                                                                            'belum'
                                                                                                ? null
                                                                                                : nilai,
                                                                                    }),
                                                                                );
                                                                            }}
                                                                        />
                                                                        <span className="leading-tight">
                                                                            {
                                                                                label
                                                                            }
                                                                        </span>
                                                                    </label>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </fieldset>
                                            );
                                        })}
                                    </div>
                                    <div
                                        className={`mt-5 rounded-r-xl border-l-4 px-4 py-3.5 ${hitung.tidak > 0 ? 'border-tone-amber bg-tone-amber-bg/50' : 'border-primary bg-surface-subtle'}`}
                                        aria-live="polite"
                                    >
                                        <h4 className="text-lg font-extrabold">
                                            Bahan tindak lanjut
                                        </h4>
                                        <p className="mt-1 max-w-[76ch] text-base">
                                            {hitung.tidak > 0
                                                ? kelompok.jenis ===
                                                  'perkembangan'
                                                    ? 'Ada penanda yang dijawab Tidak. Sesuai Buku KIA, segera bawa anak ke Puskesmas untuk pemeriksaan perkembangan. Bahas butir tersebut bersama tenaga kesehatan.'
                                                    : 'Ada perawatan yang perlu dibahas. Cocokkan dengan Buku KIA dan minta bantuan tenaga kesehatan.'
                                                : hitung.belum > 0
                                                  ? 'Diskusi belum lengkap. Jawaban yang belum diamati tidak dianggap Ya maupun Tidak.'
                                                  : 'Semua jawaban tercatat Ya. Lanjutkan pemantauan dan stimulasi sesuai usia; ini bukan diagnosis perkembangan.'}
                                        </p>
                                    </div>
                                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                                        <label className="block text-lg font-bold">
                                            Catatan orang tua / pengamatan
                                            <textarea
                                                className="isian mt-2 min-h-[110px] w-full resize-y py-3 text-base font-normal"
                                                maxLength={2000}
                                                value={catatan}
                                                onChange={(e) => {
                                                    ubah();
                                                    setCatatan(e.target.value);
                                                }}
                                                placeholder="Catat yang diceritakan atau diamati, tanpa membuat diagnosis."
                                            />
                                        </label>
                                        <label className="block text-lg font-bold">
                                            Tindak lanjut yang disepakati
                                            <textarea
                                                className="isian mt-2 min-h-[110px] w-full resize-y py-3 text-base font-normal"
                                                maxLength={2000}
                                                value={tindakLanjut}
                                                onChange={(e) => {
                                                    ubah();
                                                    setTindakLanjut(
                                                        e.target.value,
                                                    );
                                                }}
                                                placeholder="Misalnya rencana konsultasi ke Puskesmas dan hal yang akan dipantau."
                                            />
                                        </label>
                                    </div>
                                    <label
                                        className={`mt-5 flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl border-2 px-4 py-3 text-lg font-bold transition-colors select-none ${
                                            dibahas
                                                ? 'border-primary bg-tone-green-bg text-tone-green'
                                                : hitung.belum > 0
                                                  ? 'cursor-not-allowed border-border bg-surface-subtle text-muted-foreground opacity-75'
                                                  : 'border-border-strong bg-surface text-foreground hover:bg-surface-subtle'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-[22px] w-[22px] shrink-0 accent-primary"
                                            checked={dibahas}
                                            disabled={hitung.belum > 0}
                                            onChange={(e) => {
                                                ubah();
                                                setDibahas(e.target.checked);
                                            }}
                                        />
                                        Sudah dibahas bersama orang tua
                                    </label>
                                    <p className="mt-2 text-base text-muted-foreground">
                                        Catatan sebagian boleh disimpan.
                                        Konfirmasi diskusi memerlukan semua
                                        jawaban; jika ada “Tidak”, isi tindak
                                        lanjutnya.
                                    </p>
                                    {galat && (
                                        <p
                                            role="alert"
                                            className="mt-4 max-w-[76ch] text-base font-semibold text-tone-red"
                                        >
                                            {galat} Jawaban di formulir belum
                                            dibuang.
                                        </p>
                                    )}
                                    {pesan && (
                                        <p
                                            role="status"
                                            className="mt-4 text-base font-semibold text-primary"
                                        >
                                            {pesan}
                                        </p>
                                    )}
                                    <div className="mt-5 flex flex-wrap items-center gap-3">
                                        <button
                                            type="submit"
                                            className="tombol-utama px-5 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={!berubah || sibuk}
                                        >
                                            <Save
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                            {sibuk
                                                ? 'Menyimpan…'
                                                : 'Simpan catatan diskusi'}
                                        </button>
                                        {onKirimWa !== undefined &&
                                            alasanTanpaWa === null && (
                                                <button
                                                    type="button"
                                                    disabled={sibuk}
                                                    onClick={() =>
                                                        void kirimWaSekarang()
                                                    }
                                                    className="tombol-kedua px-5 text-lg font-bold disabled:opacity-50"
                                                >
                                                    <IkonWhatsApp className="size-5 text-tone-green" />
                                                    {berubah &&
                                                    (hitung.ya + hitung.tidak >
                                                        0 ||
                                                        catatan.trim() !== '')
                                                        ? 'Simpan & Kirim via WhatsApp'
                                                        : 'Kirim Hasil via WhatsApp'}
                                                </button>
                                            )}
                                        {berubah && (
                                            <span className="text-base text-muted-foreground">
                                                Ada perubahan yang belum
                                                disimpan.
                                            </span>
                                        )}
                                    </div>
                                </fieldset>
                            </form>
                        )}
                    </>
                ) : (
                    <p className="mt-4 max-w-[76ch]">
                        {data.umur
                            ? 'Usia anak sudah di luar rentang pemantauan 0–71 bulan pada bagian ini. Diskusikan panduan yang sesuai bersama tenaga kesehatan; sistem tidak memilih pertanyaan usia lain.'
                            : 'Lengkapi atau periksa tanggal lahir melalui Ubah data agar panduan usia dapat dipilih.'}
                    </p>
                )}
            </div>
            {kelompok && (
                <div className="grid border-t border-border lg:grid-cols-2">
                    <div className="px-6 py-5">
                        <h3 className="text-lg font-bold">
                            Yang dapat dilakukan di rumah
                        </h3>
                        <h4 className="mt-4 text-base font-bold">
                            Makan dan menyusu sesuai usia
                        </h4>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-base">
                            {data.makan?.isi.map((teks) => (
                                <li key={teks}>{teks}</li>
                            ))}
                        </ul>
                        {data.makan && (
                            <a
                                className="inline-flex min-h-[44px] items-center text-sm text-primary underline underline-offset-4"
                                href={`${data.sumber.url}#page=${data.makan.halamanPdf}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Panduan makan · halaman {data.makan.halaman}
                            </a>
                        )}
                        <p className="mt-3 max-w-[65ch] text-sm text-muted-foreground">
                            Ini panduan umum sesuai usia. Kebutuhan khusus atau
                            kekhawatiran dari hasil ukur perlu dibahas bersama
                            tenaga kesehatan.
                        </p>
                    </div>
                    <div className="border-t border-border px-6 py-5 lg:border-t-0 lg:border-l">
                        <h3 className="text-lg font-bold">
                            Stimulasi dan kunjungan berikutnya
                        </h3>
                        <ul className="mt-4 list-disc space-y-2 pl-5 text-base">
                            {kelompok.stimulasi.map((teks) => (
                                <li key={teks}>{teks}</li>
                            ))}
                        </ul>
                        <p className="mt-4 max-w-[65ch] text-base">
                            {data.layanan}
                        </p>
                    </div>
                </div>
            )}
            <div className="border-t border-border px-6 py-5">
                <details>
                    <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 font-bold">
                        <ChevronDown className="size-4" aria-hidden="true" />
                        Riwayat diskusi ·{' '}
                        {data.riwayat.length === 12
                            ? '12 catatan terakhir'
                            : `${data.riwayat.length} catatan`}
                    </summary>
                    {data.riwayat.length === 0 ? (
                        <p className="mt-2 text-muted-foreground">
                            Belum ada catatan survei tersimpan. Jawaban akan
                            muncul di sini setelah kader menyimpan diskusi.
                        </p>
                    ) : (
                        <div className="mt-2 divide-y divide-border">
                            {data.riwayat.map((r) => (
                                <Riwayat key={r.id} catatan={r} />
                            ))}
                        </div>
                    )}
                </details>
                <p className="mt-4 max-w-[88ch] text-sm">
                    <strong>Jangan tunggu jadwal berikutnya.</strong>{' '}
                    {data.bahaya.pesan}{' '}
                    <span className="text-muted-foreground">
                        Buku KIA, halaman {data.bahaya.halaman}.
                    </span>
                </p>
            </div>
            {onKirimWa !== undefined && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface-subtle px-6 py-5">
                    <div className="max-w-[70ch]">
                        <h3 className="text-lg font-extrabold">
                            Kirim Ringkasan Hasil & Rekomendasi ke Orang Tua
                        </h3>
                        <p className="mt-1 text-base text-muted-foreground">
                            {alasanTanpaWa ??
                                'Bagikan ringkasan status gizi, hasil diskusi tumbuh kembang, rekomendasi asupan makan & stimulasi di rumah, beserta tautan pratinjau lembar PDF dan kurva KMS.'}
                        </p>
                    </div>
                    {alasanTanpaWa === null && (
                        <button
                            type="button"
                            disabled={sibuk}
                            onClick={() => void kirimWaSekarang()}
                            className="tombol-utama shrink-0 px-5.5 text-base font-bold disabled:opacity-50"
                        >
                            <IkonWhatsApp className="size-5" />
                            Kirim Hasil & Rekomendasi via WhatsApp
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

function Riwayat({ catatan: r }: { catatan: CatatanKia }) {
    const hitung = hitungJawabanKia(r.pertanyaan, r.jawaban);

    return (
        <details className="py-3">
            <summary className="min-h-[44px] cursor-pointer py-3 font-semibold">
                {tanggalPanjang(r.tanggal)} · {r.kelompokLabel} ·{' '}
                {r.dibahas ? 'Sudah dibahas' : 'Belum selesai'}
            </summary>
            <p className="text-sm text-muted-foreground">
                Dicatat {r.petugas} · {hitung.ya} Ya, {hitung.tidak} Tidak,{' '}
                {hitung.belum} belum diamati · Buku KIA halaman {r.halaman}
            </p>
            <ul className="mt-3 space-y-2 text-base">
                {r.pertanyaan.map((q) => (
                    <li key={q.id}>
                        {q.teks}{' '}
                        <strong>
                            {r.jawaban[q.id] === 'ya'
                                ? 'Ya'
                                : r.jawaban[q.id] === 'tidak'
                                  ? 'Tidak'
                                  : 'Belum diamati'}
                        </strong>
                    </li>
                ))}
            </ul>
            <p className="mt-3 whitespace-pre-wrap">
                <strong>Catatan:</strong> {r.catatan || 'Belum diisi.'}
            </p>
            <p className="mt-2 whitespace-pre-wrap">
                <strong>Tindak lanjut:</strong>{' '}
                {r.tindakLanjut || 'Belum diisi.'}
            </p>
        </details>
    );
}
