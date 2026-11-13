export type RingkasanBeranda = {
    sasaran: number;
    ditimbang: number;
    naik: number;
    tidakNaik?: number;
    tanggalUkur: string | null;
};

export type SebaranStatusGizi = {
    giziBaik: number;
    giziKurang: number;
    giziBuruk: number;
    berisikoLebih: number;
    giziLebih: number;
    obesitas: number;
    /** Ditimbang tapi BB/TB tidak dapat dihitung. */
    belumDinilai: number;
    ditimbang: number;
};

export type CakupanPeriode = {
    hadirHariH?: number | null;
    periodeId: string;
    label: string;
    sasaran: number;
    ditimbang: number;
};

/** Satu bulan pada kartu Tren status gizi. */
export type TitikTren = {
    periodeId: string;
    label: string;
    ditimbang: number;
    pendek: number;
    bbKurang?: number;
    giziKurang: number;
    /** Gizi lebih dan obesitas, tanpa yang baru berisiko. */
    giziLebih: number;
};

export type AnakPerluPerhatian = {
    anakId: number;
    nama: string | null;
    umurBulan: number | null;
    rt: string | null;
    kategori: string;
    alasan: string;
};

/**
 * Hasil penimbangan yang masih tertahan di perangkat kader.
 *
 * Dipasok Aplikasi Tablet lewat antrean kirimnya (ADR-0003). Portal hanya
 * melaporkan keberadaannya; tidak ada yang hilang selama angka ini muncul.
 */
export type AntreanKirim = { jumlah: number; sejak: string };
