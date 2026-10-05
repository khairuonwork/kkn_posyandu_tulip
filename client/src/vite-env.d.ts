/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Nomor uji WhatsApp. Bila terisi, pesan hasil penimbangan selalu menuju
     * nomor ini, bukan nomor orang tua. Isi di `client/.env.local`.
     */
    readonly VITE_WA_NOMOR_UJI?: string;
    /**
     * Alamat portal yang dapat dijangkau ponsel orang tua, tanpa garis miring
     * di akhir, mis. `http://192.168.1.20:5173`. Dipakai untuk tautan hasil.
     */
    readonly VITE_ALAMAT_PUBLIK?: string;
}
