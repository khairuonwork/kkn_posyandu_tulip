/**
 * Data Balita — docs/riwayat/layar-demo.md bagian 6.4, tampilan Prototipe v2.
 *
 * Membuktikan bahwa mencari seorang anak butuh beberapa detik, bukan membuka
 * dua belas berkas Excel — dan sejak v2, bahwa memperbaiki satu angka salah
 * tidak perlu meninggalkan daftarnya.
 */

import { Baby, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Halaman from '@/components/halaman';
import { susunTabel } from '@/lib/z-score';
import { FilterAnak } from './daftar/filter-anak';
import { FormTambah } from './daftar/form-tambah';
import { TabelAnak } from './daftar/tabel-anak';
import { bandingkan, labelRt, tanggalLokalISO } from './daftar/tipe';
import type {
    AnakBaru,
    BarisAnak,
    DaftarAnakProps,
    KolomUrut,
    PatchAnak,
} from './daftar/tipe';
import { useKehadiran } from './daftar/use-kehadiran';

export type { BarisAnak, PatchAnak, AnakBaru };

export default function DaftarAnak({
    anak,
    wilayahRt,
    rw,
    peran,
    rtTerkunci,
    periode,
    standarLms,
    onSimpanAnak,
    onTambahAnak,
    sumberData = 'contoh',
    statusMuat = 'siap',
    pesanGalat,
    onMuatUlang,
}: DaftarAnakProps) {
    const [cariSemua, setCariSemua] = useState('');
    const [cariHariIni, setCariHariIni] = useState('');
    const [tabAktif, setTabAktif] = useState<'hari-ini' | 'semua'>('semua');
    const [rt, setRt] = useState(rtTerkunci ?? '');
    const [lingkup, setLingkup] = useState('aktif');
    const [hanyaPerhatian, setHanyaPerhatian] = useState(false);
    const [hanyaRisiko, setHanyaRisiko] = useState(false);
    const [dibuka, setDibuka] = useState<number | null>(null);
    const [menambah, setMenambah] = useState(false);
    const [pesanSimpan, setPesanSimpan] = useState('');
    const form = useKehadiran(menambah ? true : null);
    const hasilRef = useRef<HTMLDivElement>(null);
    const filterAwal = useRef(true);
    const [urut, setUrut] = useState<{ kolom: KolomUrut; naik: boolean }>({
        kolom: 'nama',
        naik: true,
    });

    const bolehUbah = peran !== 'kader' && sumberData === 'contoh';
    const rtAktif = rtTerkunci ?? rt;
    useEffect(() => {
        if (filterAwal.current) {
            filterAwal.current = false;

            return;
        }

        const elemen = hasilRef.current;

        if (
            !elemen ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        elemen.getAnimations().forEach((animasi) => animasi.cancel());
        elemen.animate([{ opacity: 0.35 }, { opacity: 1 }], {
            duration: 210,
            easing: 'cubic-bezier(.16, 1, .3, 1)',
        });
    }, [tabAktif, lingkup, rtAktif, hanyaPerhatian, hanyaRisiko]);
    const kataCari = tabAktif === 'hari-ini' ? cariHariIni : cariSemua;
    const hariIni = tanggalLokalISO();
    const terlihat =
        rtTerkunci === null ? anak : anak.filter((b) => b.rt === rtTerkunci);
    const lingkupRt = rtAktif === '' ? 'seluruh RT' : labelRt(rtAktif);
    const adaSaringan =
        kataCari.trim() !== '' ||
        (rtTerkunci === null && rtAktif !== '') ||
        hanyaPerhatian ||
        hanyaRisiko;

    const tabelLms = useMemo(
        () => (standarLms === undefined ? null : susunTabel(standarLms)),
        [standarLms],
    );

    const hasil = useMemo(() => {
        const kunci = kataCari.trim().toLowerCase();

        return anak
            .filter((baris) => {
                if (
                    lingkup === 'aktif' &&
                    !(
                        baris.aktifPeriode ??
                        (baris.umurBulan !== null && baris.umurBulan < 60)
                    )
                ) {
                    return false;
                }

                if (rtAktif !== '' && baris.rt !== rtAktif) {
                    return false;
                }

                if (hanyaPerhatian && !baris.perluPerhatian) {
                    return false;
                }

                if (hanyaRisiko && baris.risikoLahir === null) {
                    return false;
                }

                const sasaran =
                    `${baris.nama ?? ''} ${baris.namaOrtu ?? ''}`.toLowerCase();

                return kunci === '' || sasaran.includes(kunci);
            })
            .sort(
                (a, b) =>
                    (urut.naik ? 1 : -1) * bandingkan(a, b, urut.kolom) ||
                    (a.nama ?? '').localeCompare(b.nama ?? ''),
            );
    }, [anak, kataCari, rtAktif, hanyaPerhatian, hanyaRisiko, urut, lingkup]);

    const anakDalamLingkup =
        rtTerkunci !== null
            ? anak.filter((baris) => baris.rt === rtTerkunci)
            : rtAktif === ''
              ? anak
              : anak.filter((baris) => baris.rt === rtAktif);
    const jumlahHariIni = anakDalamLingkup.filter(
        (baris) =>
            baris.tanggalUkurTerakhir === hariIni &&
            (lingkup !== 'aktif' ||
                (baris.aktifPeriode ??
                    (baris.umurBulan !== null && baris.umurBulan < 60))),
    ).length;
    const jumlahAktif = anakDalamLingkup.filter(
        (b) => b.aktifPeriode ?? (b.umurBulan !== null && b.umurBulan < 60),
    ).length;
    const hasilTampil =
        tabAktif === 'hari-ini'
            ? hasil.filter((baris) => baris.tanggalUkurTerakhir === hariIni)
            : hasil;

    const keteranganUrut =
        urut.kolom === 'nama'
            ? `urut nama ${urut.naik ? 'A–Z' : 'Z–A'}`
            : `urut kolom ${urut.kolom} ${urut.naik ? 'naik' : 'turun'}`;

    return (
        <Halaman
            ikon={Baby}
            penuh="lg"
            judul="Data Balita"
            subjudul={
                sumberData === 'live'
                    ? statusMuat === 'memuat'
                        ? 'Mengambil seluruh data balita dari database…'
                        : statusMuat === 'galat'
                          ? 'Data live belum berhasil dimuat.'
                          : rtTerkunci === null
                            ? `${lingkup === 'aktif' ? jumlahAktif : anak.length} balita ${lingkup === 'aktif' ? 'aktif' : 'dalam arsip'} · ${periode.label} · Database live`
                            : `${terlihat.length} balita di ${labelRt(rtTerkunci)}, wilayah binaan Anda · Database live`
                    : `${
                          rtTerkunci === null
                              ? `${anak.length} balita terdaftar di RW ${rw}`
                              : `${terlihat.length} balita di ${labelRt(rtTerkunci)}, wilayah binaan Anda`
                      }. Data contoh.`
            }
            aksi={
                bolehUbah && (
                    <button
                        type="button"
                        onClick={() => {
                            setMenambah((b) => !b);
                            setDibuka(null);
                        }}
                        aria-expanded={menambah}
                        className="tombol-utama"
                    >
                        <UserPlus
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Tambah balita
                    </button>
                )
            }
        >
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <label htmlFor="lingkup-balita" className="text-sm font-bold">
                    Daftar balita
                </label>
                <select
                    id="lingkup-balita"
                    className="isian"
                    value={lingkup}
                    onChange={(e) => setLingkup(e.target.value)}
                >
                    <option value="aktif">Balita Aktif ({jumlahAktif})</option>
                    <option value="arsip">
                        Semua data / Arsip ({anakDalamLingkup.length})
                    </option>
                </select>
            </div>

            <section className="kartu flex flex-col overflow-hidden lg:min-h-0 lg:flex-1">
                <div
                    role="tabpanel"
                    id={`panel-anak-${tabAktif}`}
                    aria-labelledby={`tab-anak-${tabAktif}`}
                    tabIndex={0}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <FilterAnak
                        tabAktif={tabAktif}
                        setTabAktif={setTabAktif}
                        jumlahHariIni={jumlahHariIni}
                        jumlahAktif={jumlahAktif}
                        anakDalamLingkupCount={anakDalamLingkup.length}
                        lingkup={lingkup}
                        kataCari={kataCari}
                        setCariHariIni={setCariHariIni}
                        setCariSemua={setCariSemua}
                        rtTerkunci={rtTerkunci}
                        rtAktif={rtAktif}
                        setRt={setRt}
                        wilayahRt={wilayahRt}
                        hanyaPerhatian={hanyaPerhatian}
                        setHanyaPerhatian={setHanyaPerhatian}
                        hanyaRisiko={hanyaRisiko}
                        setHanyaRisiko={setHanyaRisiko}
                    />

                    {form.tampil && (
                        <div
                            className={
                                form.menutup
                                    ? 'panel-balita-keluar'
                                    : 'panel-balita-masuk'
                            }
                            inert={form.menutup}
                        >
                            <FormTambah
                                wilayahRt={wilayahRt}
                                rtAwal={rtTerkunci ?? ''}
                                onBatal={() => setMenambah(false)}
                                onSimpan={(baru) => {
                                    if (!onTambahAnak) {
                                        throw new Error(
                                            'Penyimpanan tidak tersedia',
                                        );
                                    }

                                    onTambahAnak(baru);
                                    setPesanSimpan(
                                        'Data balita berhasil ditambahkan.',
                                    );
                                    setMenambah(false);
                                }}
                            />
                        </div>
                    )}

                    {pesanSimpan && (
                        <p role="status" className="pesan-balita px-5 py-3">
                            {pesanSimpan}
                        </p>
                    )}
                    <div
                        ref={hasilRef}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <TabelAnak
                            hasilTampil={hasilTampil}
                            sumberData={sumberData}
                            statusMuat={statusMuat}
                            pesanGalat={pesanGalat}
                            onMuatUlang={onMuatUlang}
                            anakCount={anak.length}
                            adaSaringan={adaSaringan}
                            tabAktif={tabAktif}
                            setTabAktif={setTabAktif}
                            kataCari={kataCari}
                            setCariHariIni={setCariHariIni}
                            setCariSemua={setCariSemua}
                            lingkupRt={lingkupRt}
                            rtTerkunci={rtTerkunci}
                            setRt={setRt}
                            setHanyaPerhatian={setHanyaPerhatian}
                            setHanyaRisiko={setHanyaRisiko}
                            urut={urut}
                            setUrut={setUrut}
                            bolehUbah={bolehUbah}
                            dibuka={dibuka}
                            setDibuka={setDibuka}
                            setMenambah={setMenambah}
                            periode={periode}
                            wilayahRt={wilayahRt}
                            tabelLms={tabelLms}
                            onSimpanAnak={(id, patch) => {
                                if (!onSimpanAnak) {
                                    throw new Error(
                                        'Penyimpanan tidak tersedia',
                                    );
                                }

                                onSimpanAnak(id, patch);
                                setPesanSimpan(
                                    'Perubahan data balita berhasil disimpan.',
                                );
                            }}
                        />
                    </div>

                    <p
                        aria-live="polite"
                        className="shrink-0 border-t border-border px-5.5 py-3 text-sm text-muted-foreground"
                    >
                        {statusMuat === 'memuat' && sumberData === 'live' ? (
                            'Menunggu data dari database…'
                        ) : statusMuat === 'galat' && sumberData === 'live' ? (
                            'Data belum tersedia karena pemuatan gagal.'
                        ) : (
                            <>
                                Menampilkan{' '}
                                <span className="font-bold text-foreground">
                                    {hasilTampil.length}
                                </span>{' '}
                                dari{' '}
                                {tabAktif === 'hari-ini'
                                    ? jumlahHariIni
                                    : lingkup === 'aktif'
                                      ? jumlahAktif
                                      : anakDalamLingkup.length}{' '}
                                balita · {keteranganUrut}
                            </>
                        )}
                    </p>
                </div>
            </section>
        </Halaman>
    );
}
