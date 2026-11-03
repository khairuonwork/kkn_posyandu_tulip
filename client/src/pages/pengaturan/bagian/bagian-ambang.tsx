import { TriangleAlert } from 'lucide-react';
import { zScore } from '@/lib/format';
import { IsiGulir, IsianAngka } from '../komponen/isian-angka';
import type { Ambang } from '../tipe';

export function BagianAmbang({
    teks,
    ambang,
    nilai,
    ubahTeks,
}: {
    teks: Record<keyof Ambang, string>;
    ambang: Ambang;
    nilai: Record<keyof Ambang, number | null>;
    ubahTeks: (k: keyof Ambang, v: string) => void;
}) {
    return (
        <IsiGulir>
            <div className="grid gap-y-5 px-7 pt-3.5 pb-4.5 min-[80rem]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="min-w-0 min-[80rem]:border-r min-[80rem]:border-border min-[80rem]:pr-7">
                    <h3 className="text-base font-extrabold">Batas z-score</h3>
                    <div className="mt-3 flex flex-col gap-4.5">
                        <div className="max-w-[560px]">
                            <IsianAngka
                                kunci="ambangWaspada"
                                teks={teks}
                                ambang={ambang}
                                onGanti={ubahTeks}
                                berlabel
                                sempit
                            />
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Jika salah satu z-score sama dengan atau di bawah
                                angka ini, arahan untuk keluarga berbunyi:
                                pertumbuhan perlu dipantau lebih dekat.
                            </p>
                        </div>
                        <div className="max-w-[560px]">
                            <IsianAngka
                                kunci="ambangRujukan"
                                teks={teks}
                                ambang={ambang}
                                onGanti={ubahTeks}
                                berlabel
                                sempit
                            />
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Jika salah satu z-score sama dengan atau di bawah
                                angka ini, keluarga dianjurkan menghubungi
                                fasilitas kesehatan atau dokter terdekat.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex min-w-0 flex-col gap-3.5 min-[80rem]:pl-7">
                    <div
                        role="note"
                        className="flex gap-2.5 rounded-lg bg-tone-amber-bg px-4 py-3.5"
                    >
                        <TriangleAlert
                            className="mt-0.5 size-5 shrink-0 text-tone-amber"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <div>
                            <p className="text-base font-bold text-tone-amber">
                                Belum disahkan Puskesmas
                            </p>
                            <p className="mt-0.5 text-sm">
                                Nilai awal mengikuti diskusi kader. Keduanya
                                harus disahkan Puskesmas sebelum dipakai untuk
                                data sungguhan.
                            </p>
                        </div>
                    </div>
                    {nilai.ambangRujukan !== null && (
                        <div className="rounded-lg bg-surface px-4 py-3.5">
                            <p className="text-base font-bold">Contoh</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Balita dengan TB/U{' '}
                                {zScore(nilai.ambangRujukan - 0.24).replace(
                                    '+',
                                    '',
                                )}{' '}
                                SD mendapat anjuran menghubungi faskes, karena{' '}
                                {zScore(nilai.ambangRujukan - 0.24).replace(
                                    '+',
                                    '',
                                )}{' '}
                                lebih rendah dari{' '}
                                {zScore(nilai.ambangRujukan).replace('+', '')}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </IsiGulir>
    );
}
