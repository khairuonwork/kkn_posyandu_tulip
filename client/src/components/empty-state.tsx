/**
 * Keadaan kosong yang dirancang, bukan kebetulan.
 *
 * Butir K5 pada docs/rujukan/layar-demo.md bagian 3 adalah kriteria yang
 * paling sering gagal saat demo: layar kosong tanpa penjelasan. Karena itu
 * komponen ini **mewajibkan** sebuah sebab, dan menawarkan jalan keluar bila
 * ada — bukan sekadar menulis "tidak ada data"
 * (docs/rujukan/ui-ux.md bagian 9).
 */

import type { ReactNode } from 'react';

type Props = {
    /** Menjelaskan sebabnya, mis. `Belum ada pengukuran pada periode ini.` */
    sebab: string;
    /** Tombol atau tautan yang membawa pengguna keluar dari keadaan ini. */
    children?: ReactNode;
};

export default function EmptyState({ sebab, children }: Props) {
    return (
        // Kartu putih, bukan blok abu. Sejak dasar halaman menjadi #EDEFEA,
        // latar #F1F3EF hanya berbeda 1,04:1 daripadanya - keadaan kosong yang
        // sendirinya tidak terlihat.
        <div className="kartu px-6 py-10 text-center">
            <p className="text-base text-foreground">{sebab}</p>
            {children !== undefined && (
                <div className="mt-4 flex justify-center">{children}</div>
            )}
        </div>
    );
}
