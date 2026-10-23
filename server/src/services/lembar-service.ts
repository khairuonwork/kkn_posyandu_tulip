/**
 * Lembar Hasil: tautan hasil penimbangan yang dibuka orang tua tanpa masuk.
 *
 * Yang keluar dari sini sengaja minimal: nama depan, jenis kelamin, dan
 * riwayat ukur beserta penilaiannya. Tidak ada NIK, alamat, nama orang tua,
 * maupun tanggal lahir — umur sudah dihitung di sini.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

import { umurBulanPada } from '../antropometri/penilaian-gizi.ts';
import type { PenggunaAktif } from '../auth/peran.ts';
import { panduanMakanKia, SUMBER_KIA } from '../edukasi/kia-2024.ts';
import * as anakRepo from '../repositories/anak-repository.ts';
import { riwayatSurveiKia } from '../repositories/survei-kia-repository.ts';
import { bacaToken, buatToken, UMUR_LEMBAR_DETIK } from './lembar-token.ts';
import {
    hariIniJakarta,
    kelompokUntukUmur,
    umurKia,
} from './survei-kia-domain.ts';

export class GalatLembar extends Error {
    readonly status: 400 | 404 | 410 | 503;

    constructor(status: 400 | 404 | 410 | 503, pesan: string) {
        super(pesan);
        this.status = status;
    }
}

/**
 * Pembaca atas nama pemegang tautan. Bukan akun: ia hanya dipakai untuk dua
 * query baca milik satu anak yang sudah ditetapkan oleh token bertanda tangan.
 */
const PEMEGANG_TAUTAN: PenggunaAktif = {
    id: 0,
    peran: 'bidan',
    rt: null,
    aktif: true,
    // Tautan ditandatangani dan menunjuk satu anak secara eksplisit; ini bukan
    // sesi pengguna yang dapat dipakai untuk membaca daftar cluster.
    superAdmin: true,
};

function rahasia(): string {
    let nilai = process.env.LEMBAR_RAHASIA ?? '';

    if (nilai.length < 32) {
        try {
            const envPath = path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                '../../.env',
            );
            const isiEnv = fs.readFileSync(envPath, 'utf8');
            const cocok = isiEnv.match(/^\s*LEMBAR_RAHASIA\s*=\s*(.+)\s*$/m);

            if (cocok) {
                nilai = cocok[1].trim().replace(/^['"]|['"]$/g, '');
                process.env.LEMBAR_RAHASIA = nilai;
            }
        } catch {
            // Abaikan bila berkas .env tidak ditemukan.
        }
    }

    if (nilai.length < 32) {
        throw new GalatLembar(
            503,
            'Tautan hasil belum dapat dibuat: LEMBAR_RAHASIA belum diisi di server.',
        );
    }

    return nilai;
}

export async function buatTautan(
    pool: Pool,
    pengguna: PenggunaAktif,
    anakId: unknown,
    periodeId: unknown,
) {
    if (
        typeof anakId !== 'number' ||
        !Number.isSafeInteger(anakId) ||
        typeof periodeId !== 'string' ||
        !/^\d{4}-\d{2}$/.test(periodeId)
    ) {
        throw new GalatLembar(400, 'anakId dan periodeId tidak sah.');
    }

    const kunci = rahasia();

    // Batas RT kader tetap berlaku: tautan hanya untuk balita yang memang
    // boleh dilihat pembuatnya.
    if ((await anakRepo.ambil(pool, pengguna, anakId)) === null) {
        throw new GalatLembar(404, 'Anak tidak ditemukan.');
    }

    const kedaluwarsa = Math.floor(Date.now() / 1000) + UMUR_LEMBAR_DETIK;

    return {
        token: buatToken({ anakId, periodeId, kedaluwarsa }, kunci),
        kedaluwarsa: new Date(kedaluwarsa * 1000).toISOString(),
    };
}

export async function bacaLembar(pool: Pool, token: string) {
    const isi = bacaToken(token, rahasia());

    if (isi === null) {
        throw new GalatLembar(404, 'Tautan tidak sah.');
    }

    if (isi === 'kedaluwarsa') {
        throw new GalatLembar(410, 'Tautan sudah tidak berlaku.');
    }

    const anak = await anakRepo.ambil(pool, PEMEGANG_TAUTAN, isi.anakId);
    const riwayat = await anakRepo.daftarPengukuran(
        pool,
        PEMEGANG_TAUTAN,
        isi.anakId,
    );

    if (anak === null || riwayat === null) {
        throw new GalatLembar(404, 'Tautan tidak sah.');
    }

    const tanggalKia = hariIniJakarta();
    const umur = umurKia(anak.tglLahir, tanggalKia);
    const kelompok = kelompokUntukUmur(umur);
    const riwayatKia = await riwayatSurveiKia(pool, isi.anakId);
    const surveiTerbaru = riwayatKia[0] ?? null;

    const diskusi = surveiTerbaru
        ? (() => {
              const butir = surveiTerbaru.pertanyaan.map((q) => ({
                  id: q.id,
                  teks: q.teks,
                  jawaban: surveiTerbaru.jawaban[q.id] ?? null,
              }));
              const ya = butir.filter((b) => b.jawaban === 'ya').length;
              const tidak = butir.filter((b) => b.jawaban === 'tidak').length;
              const belum = butir.length - ya - tidak;
              const arahan =
                  tidak > 0
                      ? 'Ada penanda perkembangan atau perawatan yang dijawab Tidak. Sesuai Buku KIA, segera konsultasikan ke Puskesmas atau tenaga kesehatan untuk pemeriksaan lebih lanjut.'
                      : belum > 0
                        ? 'Sebagian penanda perkembangan masih perlu diamati bersama di rumah dan didiskusikan pada kunjungan Posyandu berikutnya.'
                        : 'Seluruh penanda perkembangan pada rentang usia ini tercatat sesuai (Ya). Lanjutkan stimulasi harian dan pemantauan rutin setiap bulan.';

              return {
                  tanggal: surveiTerbaru.tanggal,
                  kelompokLabel: surveiTerbaru.kelompokLabel,
                  halaman: surveiTerbaru.halaman,
                  dibahas: surveiTerbaru.dibahas,
                  catatan: surveiTerbaru.catatan,
                  tindakLanjut: surveiTerbaru.tindakLanjut,
                  ringkasan: {
                      total: butir.length,
                      ya,
                      tidak,
                      belum,
                      arahan,
                  },
                  butir,
              };
          })()
        : null;

    return {
        anak: {
            namaDepan: anak.nama.trim().split(/\s+/)[0] ?? anak.nama,
            jk: anak.jk,
        },
        periodeId: isi.periodeId,
        kedaluwarsa: new Date(isi.kedaluwarsa * 1000).toISOString(),
        pengukuran: riwayat.map((p) => ({
            periodeId: p.periodeId,
            tanggalUkur: p.tanggalUkur,
            umurBulan: umurBulanPada(anak.tglLahir, p.tanggalUkur),
            bbKg: p.bbKg,
            tinggiCm: p.tinggiCm,
            lilaCm: p.lilaCm,
            likaCm: p.likaCm,
            statusKehadiran: p.statusKehadiran,
            penilaian: p.penilaian,
        })),
        edukasiKia: {
            umurLabel: umur?.label ?? null,
            kelompok: kelompok
                ? {
                      id: kelompok.id,
                      label: kelompok.label,
                      jenis: kelompok.jenis,
                      halaman: kelompok.halaman,
                      halamanPdf: kelompok.halamanPdf,
                      stimulasi: kelompok.stimulasi,
                  }
                : null,
            makan: kelompok && umur ? panduanMakanKia(umur.bulan) : null,
            layanan:
                'Datang setiap bulan ke Posyandu atau fasilitas kesehatan untuk memantau pertumbuhan dan perkembangan. Cocokkan jadwal imunisasi serta layanan lain pada Buku KIA bersama petugas.',
            bahaya: {
                halaman: umur && umur.hariTotal <= 28 ? '41' : '51, 74–77',
                pesan: 'Jika anak sesak napas, tampak biru, sangat lemah, atau tidak mau minum/menyusu, segera cari pertolongan tenaga kesehatan.',
            },
            sumber: SUMBER_KIA,
            diskusi,
        },
    };
}
