import { ShieldCheck, Syringe } from 'lucide-react';
import BarisDefinisi from '@/components/baris-definisi';
import { KOSONG, nik, satuan, tanggalPanjang, umurPanjang } from '@/lib/format';
import { labelDesil, pilihanDesil } from '@/lib/profil-keluarga';
import type { Anak } from '@/types/posyandu';

export function TabProfil({
    anak,
    nama,
    inisial,
    umur,
    tersembunyi,
}: {
    anak: Anak;
    nama: string;
    inisial: string;
    umur: number | null;
    tersembunyi: boolean;
}) {
    return (
        <section
            id="panel-profil"
            role="tabpanel"
            aria-labelledby="tab-profil"
            hidden={tersembunyi}
            className="mb-7 overflow-hidden rounded-xl border border-border bg-card"
        >
            <div className="flex flex-wrap items-center gap-4 bg-primary px-5 py-4 text-primary-foreground sm:px-6">
                <div
                    aria-hidden="true"
                    className="flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-xl font-extrabold text-primary"
                >
                    {inisial || '—'}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-extrabold">Profil anak</h2>
                    <p className="mt-0.5 text-base text-primary-foreground/80">
                        {nama}
                    </p>
                </div>
                <p className="text-base font-semibold text-primary-foreground">
                    {anak.jk === 'L'
                        ? 'Laki-laki'
                        : anak.jk === 'P'
                          ? 'Perempuan'
                          : KOSONG}
                    {umur !== null && ` · ${umurPanjang(umur)}`}
                </p>
            </div>

            <div className="p-5 sm:p-6">
                <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <BarisDefinisi label="Tanggal lahir">
                        {tanggalPanjang(anak.tglLahir)}
                    </BarisDefinisi>
                    <BarisDefinisi label="NIK">
                        {nik(anak.nik)}
                        {!anak.nikLengkap && (
                            <span className="block text-sm text-tone-amber">
                                NIK belum lengkap
                            </span>
                        )}
                    </BarisDefinisi>
                    <BarisDefinisi label="Berat lahir">
                        {satuan(anak.bbLahirKg, 'kg', 2)}
                        {anak.bbLahirMeragukan && (
                            <span className="block text-sm text-tone-amber">
                                Angka di arsip meragukan
                            </span>
                        )}
                    </BarisDefinisi>
                    <BarisDefinisi label="Ibu">
                        {anak.namaOrtu ?? KOSONG}
                    </BarisDefinisi>
                    <BarisDefinisi label="Kelompok Desil">
                        {labelDesil(pilihanDesil(anak))}
                    </BarisDefinisi>
                    <BarisDefinisi label="Jenis KB">
                        {anak.jenisKb || 'Belum tercatat'}
                    </BarisDefinisi>
                    <BarisDefinisi label="Alamat">
                        {anak.rt === null
                            ? KOSONG
                            : `RT ${anak.rt.padStart(2, '0')}`}
                        {anak.anakKe !== null && `, anak ke-${anak.anakKe}`}
                    </BarisDefinisi>
                </dl>

                <div className="mt-6 border-t border-border pt-5">
                    <h3 className="text-base font-bold">
                        Skrining saat pendaftaran
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="flex gap-3 rounded-lg bg-surface-subtle p-4">
                            <ShieldCheck
                                className={`mt-0.5 size-5 shrink-0 ${
                                    anak.bukuKia
                                        ? 'text-tone-green'
                                        : 'text-tone-amber'
                                }`}
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">Buku KIA</p>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {anak.bukuKia
                                        ? 'Tercatat pada data sasaran.'
                                        : 'Belum tercatat. Konfirmasi saat daftar.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 rounded-lg bg-surface-subtle p-4">
                            <Syringe
                                className="mt-0.5 size-5 shrink-0 text-tone-amber"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">Imunisasi</p>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Belum dipastikan dari arsip ini. Konfirmasi
                                    dan lengkapi saat daftar.
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="mt-3 max-w-[78ch] text-sm text-muted-foreground">
                        Saat kartu sasaran dipindai, item yang belum lengkap ini
                        muncul sebagai skrining awal sebelum anak dicatat hadir.
                    </p>
                </div>
            </div>
        </section>
    );
}
