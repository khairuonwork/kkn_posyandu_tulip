import { AlertTriangle, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Halaman from '@/components/halaman';
import { sasaranDemo } from '@/data/contoh/store';
import {
    ambilPeriodeSasaran,
    ambilSasaran,
    cariCalonSasaran,
    gantiSasaran,
    perbaruiSasaran,
    periksaFileSasaran,
    pratinjauResetHariIni,
    resetPengukuranHariIni,
    tambahAnakKeSasaran,
} from '@/lib/sasaran';
import type {
    CalonSasaran,
    HasilImpor,
    PeriodeSasaran,
    RingkasanResetHariIni,
    SasaranAktif,
    SheetSasaran,
    StatusSasaran,
} from '@/lib/sasaran';
import { DialogEditSasaran } from './komponen/dialog-edit-sasaran';
import { DialogResetSasaran } from './komponen/dialog-reset-sasaran';
import { DialogTambahSasaran } from './komponen/dialog-tambah-sasaran';
import { PanelImpor } from './komponen/panel-impor';
import { TabelSasaran } from './komponen/tabel-sasaran';
import { formatPeriode, periodeJakartaSekarang } from './komponen/tipe';
import type { Tahap } from './komponen/tipe';

export default function SasaranImpor({
    sasaranAwal,
    periodeAwal = [],
}: {
    sasaranAwal?: SasaranAktif;
    periodeAwal?: PeriodeSasaran[];
    wilayahRt?: string[];
} = {}) {
    const [sasaran, setSasaran] = useState<SasaranAktif | null>(
        sasaranAwal ?? null,
    );
    const [statusMuat, setStatusMuat] = useState<'memuat' | 'siap' | 'galat'>(
        sasaranAwal ? 'siap' : 'memuat',
    );
    const [file, setFile] = useState<File | null>(null);
    const [isiBase64, setIsiBase64] = useState('');
    const [sheets, setSheets] = useState<SheetSasaran[]>([]);
    const [sheetDipilih, setSheetDipilih] = useState('');
    const [tahap, setTahap] = useState<Tahap>('kosong');
    const [galat, setGalat] = useState('');
    const [hasil, setHasil] = useState<HasilImpor | null>(null);
    const [cari, setCari] = useState('');
    const [pesanMutasi, setPesanMutasi] = useState('');
    const [tambahTerbuka, setTambahTerbuka] = useState(false);
    const [cariCalon, setCariCalon] = useState('');
    const [calon, setCalon] = useState<CalonSasaran[]>([]);
    const [memuatCalon, setMemuatCalon] = useState(false);
    const [sudahCariCalon, setSudahCariCalon] = useState(false);
    const [anakDitambahkan, setAnakDitambahkan] = useState<number | null>(null);
    const [editId, setEditId] = useState<number | null>(null);
    const [editStatus, setEditStatus] = useState<StatusSasaran>('menunggu');
    const [editCatatan, setEditCatatan] = useState('');
    const [menyimpanEdit, setMenyimpanEdit] = useState(false);
    const [periodeDitampilkan, setPeriodeDitampilkan] = useState(
        sasaranAwal?.periode?.periode ?? '',
    );
    const [pilihanPeriode, setPilihanPeriode] =
        useState<PeriodeSasaran[]>(periodeAwal);
    const [pratinjauReset, setPratinjauReset] =
        useState<RingkasanResetHariIni | null>(null);
    const [memuatPratinjauReset, setMemuatPratinjauReset] = useState(false);
    const [konfirmasiReset, setKonfirmasiReset] = useState('');
    const [menjalankanReset, setMenjalankanReset] = useState(false);
    const [resetSelesai, setResetSelesai] = useState(false);
    const pemicuReset = useRef<HTMLElement | null>(null);
    const [tambahMenutup, setTambahMenutup] = useState(false);
    const [editMenutup, setEditMenutup] = useState(false);
    const timerPanel = useRef<ReturnType<typeof setTimeout>[]>([]);
    useEffect(() => () => timerPanel.current.forEach(clearTimeout), []);
    const tutupPanel = (
        selesai: () => void,
        animasi: (nilai: boolean) => void,
    ) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            selesai();

            return;
        }

        animasi(true);
        timerPanel.current.push(
            setTimeout(() => {
                selesai();
                animasi(false);
            }, 180),
        );
    };

    const muat = useCallback(
        async (periode?: string) => {
            if (sasaranAwal) {
                const data = sasaranDemo(
                    periode ?? sasaranAwal.periode?.periode,
                );
                setSasaran(data);
                setPeriodeDitampilkan(data.periode?.periode ?? '');
                setStatusMuat('siap');

                return;
            }

            try {
                setStatusMuat('memuat');
                setGalat('');
                const data = await ambilSasaran(periode || undefined);
                const periodeTersedia = await ambilPeriodeSasaran().catch(() =>
                    data.periode === null ? [] : [data.periode],
                );
                setSasaran(data);
                setPilihanPeriode(periodeTersedia);
                setPeriodeDitampilkan(data.periode?.periode ?? '');
                setStatusMuat('siap');
            } catch (error) {
                setGalat(
                    error instanceof Error
                        ? error.message
                        : 'Daftar sasaran tidak dapat dimuat.',
                );
                setStatusMuat('galat');
            }
        },
        [sasaranAwal],
    );

    useEffect(() => {
        if (!sasaranAwal) {
            void Promise.resolve().then(() => muat());
        }
    }, [muat, sasaranAwal]);

    const sheetAktif = sheets.find((item) => item.sheet === sheetDipilih);
    const daftarTersaring = useMemo(() => {
        const q = cari.trim().toLocaleLowerCase('id-ID');

        if (q === '') {
            return sasaran?.items ?? [];
        }

        return (sasaran?.items ?? []).filter(
            (item) =>
                item.nama.toLocaleLowerCase('id-ID').includes(q) ||
                (item.nik ?? '').includes(q) ||
                (item.namaOrtu ?? '').toLocaleLowerCase('id-ID').includes(q),
        );
    }, [cari, sasaran]);

    const periksa = async () => {
        if (file === null) {
            return;
        }

        try {
            setGalat('');
            setHasil(null);
            setSheets([]);
            setIsiBase64('');
            setTahap('memeriksa');
            const data = await periksaFileSasaran(file);
            setIsiBase64(data.isiBase64);
            setSheets(data.sheets);
            const terbaru = [...data.sheets].sort((a, b) =>
                b.periode.localeCompare(a.periode),
            )[0];
            setSheetDipilih(terbaru?.sheet ?? '');
            setTahap('siap');
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'File Excel tidak dapat diperiksa.',
            );
            setTahap('kosong');
        }
    };

    const terbitkan = async () => {
        if (file === null || sheetAktif === undefined || isiBase64 === '') {
            return;
        }

        const lama =
            sasaran?.periode?.periode === sheetAktif.periode
                ? sasaran.ringkasan.total
                : 0;
        const jumlahDiterbitkan =
            sheetAktif.jumlahBaris - sheetAktif.jumlahDitahan;
        const catatanDuplikat =
            sheetAktif.jumlahDitahan > 0
                ? ` ${sheetAktif.jumlahDitahan} baris dengan NIK duplikat akan ditahan dan tidak diterbitkan.`
                : '';
        const pesan =
            lama > 0
                ? `Ganti ${lama} sasaran ${formatPeriode(sheetAktif.periode)} dengan maksimal ${jumlahDiterbitkan} baris dari ${file.name}?${catatanDuplikat} Master anak dan riwayat pengukuran tidak akan dihapus.`
                : `Terbitkan maksimal ${jumlahDiterbitkan} sasaran ${formatPeriode(sheetAktif.periode)} ke perangkat Android?${catatanDuplikat}`;

        if (
            !window.confirm(
                `${pesan} Hasil ukur valid pada periode sheet ikut disimpan; hasil ukur yang sudah ada dilewati.`,
            )
        ) {
            return;
        }

        try {
            setGalat('');
            setTahap('mengimpor');
            const selesai = await gantiSasaran(
                file.name,
                isiBase64,
                sheetAktif.sheet,
            );
            setHasil(selesai);
            setTahap('selesai');
            setPeriodeDitampilkan(selesai.periode);
            await muat(selesai.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Sasaran tidak dapat diganti.',
            );
            setTahap('siap');
        }
    };

    const cariAnakMaster = async () => {
        if (!sasaran?.periode || cariCalon.trim().length < 2) {
            return;
        }

        try {
            setGalat('');
            setMemuatCalon(true);
            setCalon(
                await cariCalonSasaran(sasaran.periode.id, cariCalon.trim()),
            );
            setSudahCariCalon(true);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Anak tidak dapat dicari.',
            );
        } finally {
            setMemuatCalon(false);
        }
    };

    const tambahAnak = async (item: CalonSasaran) => {
        if (!sasaran?.periode) {
            return;
        }

        try {
            setGalat('');
            setPesanMutasi('');
            setAnakDitambahkan(item.anakId);
            const hasilTambah = await tambahAnakKeSasaran(
                sasaran.periode.id,
                item.anakId,
            );
            setPesanMutasi(
                `${item.nama} ditambahkan ke sasaran${hasilTambah.sudahDiukur ? ' dan sudah memiliki pengukuran pada periode ini' : ''}.`,
            );
            setCalon((daftar) =>
                daftar.filter((anak) => anak.anakId !== item.anakId),
            );
            await muat(sasaran.periode.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Anak tidak dapat ditambahkan.',
            );
        } finally {
            setAnakDitambahkan(null);
        }
    };

    const mulaiEdit = (item: SasaranAktif['items'][number]) => {
        if (editMenutup) {
            return;
        }

        setEditId(item.id);
        setEditStatus(item.status);
        setEditCatatan(item.catatan ?? '');
        setGalat('');
        setPesanMutasi('');
    };

    const simpanEdit = async () => {
        if (editId === null) {
            return;
        }

        try {
            setGalat('');
            setMenyimpanEdit(true);
            await perbaruiSasaran(editId, editStatus, editCatatan);
            setPesanMutasi('Status dan catatan sasaran berhasil diperbarui.');
            tutupPanel(() => setEditId(null), setEditMenutup);
            await muat(sasaran?.periode?.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Perubahan tidak dapat disimpan.',
            );
        } finally {
            setMenyimpanEdit(false);
        }
    };

    const bukaPratinjauReset = async () => {
        if (!sasaran?.periode) {
            return;
        }

        pemicuReset.current = document.activeElement as HTMLElement | null;

        try {
            setGalat('');
            setMemuatPratinjauReset(true);
            setResetSelesai(false);
            setKonfirmasiReset('');
            setPratinjauReset(await pratinjauResetHariIni(sasaran.periode.id));
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Pratinjau reset tidak dapat dimuat.',
            );
        } finally {
            setMemuatPratinjauReset(false);
        }
    };

    const jalankanResetHariIni = async () => {
        if (
            !sasaran?.periode ||
            !pratinjauReset ||
            konfirmasiReset !== 'RESET HARI INI'
        ) {
            return;
        }

        try {
            setGalat('');
            setMenjalankanReset(true);
            const hasilReset = await resetPengukuranHariIni(
                sasaran.periode.id,
                pratinjauReset.jumlahPengukuran,
                pratinjauReset.jumlahAntrean,
            );
            setResetSelesai(true);

            if (
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ) {
                await new Promise<void>((resolve) => setTimeout(resolve, 210));
            }

            setPratinjauReset(null);
            setKonfirmasiReset('');
            setPesanMutasi(
                `${hasilReset.jumlahPengukuran} hasil ukur dihapus dan ${hasilReset.jumlahAntrean} antrean hari ini dihapus. Nomor antrean berikutnya kembali ke 1. ${hasilReset.jumlahAnak} sasaran tanpa riwayat lain kembali ke status belum dilayani.`,
            );
            await muat(sasaran.periode.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Hasil ukur hari ini tidak dapat direset.',
            );
        } finally {
            setMenjalankanReset(false);
        }
    };

    return (
        <Halaman
            ikon={Upload}
            judul="Sasaran & impor"
            subjudul="Kelola daftar layanan bulanan tanpa menghapus master Data Balita atau riwayat pengukuran."
        >
            <div className="w-full space-y-6">
                {galat !== '' &&
                    statusMuat !== 'galat' &&
                    pratinjauReset === null && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-xl bg-tone-red-bg p-4 text-tone-red"
                        >
                            <AlertTriangle
                                className="mt-0.5 size-5 shrink-0"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <div className="min-w-0">
                                <p className="font-bold">
                                    Proses belum berhasil
                                </p>
                                <p className="mt-0.5 text-sm">{galat}</p>
                            </div>
                        </div>
                    )}
                {pesanMutasi !== '' && (
                    <p
                        role="status"
                        className="rounded-lg bg-tone-green-bg px-4 py-3 text-sm font-semibold text-tone-green"
                    >
                        {pesanMutasi}
                    </p>
                )}

                <PanelImpor
                    file={file}
                    setFile={setFile}
                    tahap={tahap}
                    periksa={periksa}
                    sheets={sheets}
                    sheetDipilih={sheetDipilih}
                    setSheetDipilih={setSheetDipilih}
                    sheetAktif={sheetAktif}
                    terbitkan={terbitkan}
                    hasil={hasil}
                    onResetFile={() => {
                        setIsiBase64('');
                        setSheets([]);
                        setSheetDipilih('');
                        setTahap('kosong');
                        setHasil(null);
                        setGalat('');
                    }}
                />

                <TabelSasaran
                    statusMuat={statusMuat}
                    galat={galat}
                    sasaran={sasaran}
                    periodeDitampilkan={periodeDitampilkan}
                    pilihanPeriode={pilihanPeriode}
                    muat={muat}
                    memuatPratinjauReset={memuatPratinjauReset}
                    bukaPratinjauReset={bukaPratinjauReset}
                    setTambahTerbuka={(value) => {
                        const next =
                            typeof value === 'function'
                                ? value(tambahTerbuka)
                                : value;

                        if (tambahMenutup) {
                            return;
                        }

                        if (next) {
                            setTambahTerbuka(true);
                        } else if (!tambahMenutup) {
                            tutupPanel(
                                () => setTambahTerbuka(false),
                                setTambahMenutup,
                            );
                        }
                    }}
                    setCalon={(items) => {
                        setCalon(items);
                        setSudahCariCalon(false);
                    }}
                    setGalat={setGalat}
                    cari={cari}
                    setCari={setCari}
                    daftarTersaring={daftarTersaring}
                    mulaiEdit={mulaiEdit}
                    periodeAktifSekarang={periodeJakartaSekarang()}
                />

                {tambahTerbuka && (
                    <div
                        className={
                            tambahMenutup
                                ? 'sasaran-panel-keluar'
                                : 'sasaran-panel-masuk'
                        }
                    >
                        <DialogTambahSasaran
                            tambahTerbuka={tambahTerbuka}
                            setTambahTerbuka={(terbuka) =>
                                terbuka
                                    ? setTambahTerbuka(true)
                                    : !tambahMenutup &&
                                      tutupPanel(
                                          () => setTambahTerbuka(false),
                                          setTambahMenutup,
                                      )
                            }
                            cariCalon={cariCalon}
                            setCariCalon={(nilai) => {
                                setCariCalon(nilai);
                                setSudahCariCalon(false);
                                setCalon([]);
                            }}
                            cariAnakMaster={cariAnakMaster}
                            memuatCalon={memuatCalon}
                            calon={calon}
                            tambahAnak={tambahAnak}
                            anakDitambahkan={anakDitambahkan}
                            sudahCariCalon={sudahCariCalon}
                        />
                    </div>
                )}

                {editId !== null && (
                    <div
                        className={
                            editMenutup
                                ? 'sasaran-panel-keluar'
                                : 'sasaran-panel-masuk'
                        }
                    >
                        <DialogEditSasaran
                            editId={editId}
                            setEditId={(id) =>
                                id === null
                                    ? !editMenutup &&
                                      tutupPanel(
                                          () => setEditId(null),
                                          setEditMenutup,
                                      )
                                    : setEditId(id)
                            }
                            editStatus={editStatus}
                            setEditStatus={setEditStatus}
                            editCatatan={editCatatan}
                            setEditCatatan={setEditCatatan}
                            simpanEdit={simpanEdit}
                            menyimpanEdit={menyimpanEdit}
                        />
                    </div>
                )}
            </div>

            {pratinjauReset && (
                <DialogResetSasaran
                    pratinjauReset={pratinjauReset}
                    setPratinjauReset={setPratinjauReset}
                    menjalankanReset={menjalankanReset}
                    konfirmasiReset={konfirmasiReset}
                    setKonfirmasiReset={setKonfirmasiReset}
                    jalankanResetHariIni={jalankanResetHariIni}
                    pemicuReset={pemicuReset}
                    galat={galat}
                    resetSelesai={resetSelesai}
                />
            )}
        </Halaman>
    );
}
