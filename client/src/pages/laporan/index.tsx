/** Pemilih layar laporan; state dan komponen tiap tab berada di modul terpisah. */
import { useAlamat } from '@/lib/nav';
import LaporanDataLive from './laporan-live';
import TabSkdn from './tab-skdn';
import TabTumbuhKembang from './tab-tumbuh-kembang';
import type { PropsLaporan } from './tipe';
export type { BarisRekapRt, TabPeriode } from './tipe';
export default function Laporan(props: PropsLaporan) {
    const alamat = useAlamat();

    if (
        new URLSearchParams(alamat.split('?')[1]).get('tab') ===
        'tumbuh-kembang'
    ) {
        return (
            <TabTumbuhKembang
                periode={props.periode}
                modeLive={!props.demo && props.laporanLive !== undefined}
                onSesiBerakhir={props.laporanLive?.onSesiBerakhir}
            />
        );
    }

    if (props.laporanLive !== undefined) {
        return (
            <LaporanDataLive
                periode={props.periode}
                laporan={props.laporanLive}
                bolehUnduh={props.bolehUnduh ?? false}
                wilayahRt={props.wilayahRt}
                alamat={alamat}
                demo={props.demo ?? false}
            />
        );
    }

    return <TabSkdn {...props} />;
}
