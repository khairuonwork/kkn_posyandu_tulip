import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dalamTransaksi } from '../src/db/transaksi.ts';
import { checkIn, daftar, konfirmasiKms, lepasKms, panggilKms, panggilKmsBerikutnya } from '../src/repositories/antrean-repository.ts';
import { daftarPanggilan, sesiKms, ubahPanggilan } from '../src/repositories/panggilan-kms-repository.ts';
import type { AksiPanggilan } from '../src/repositories/panggilan-kms-repository.ts';
import { simpanPengukuran } from '../src/services/anak-service.ts';
import { payloadUji, siapkanSinkronisasiDb } from './helpers/sinkronisasi-db.ts';

test('panggilan KMS melindungi peserta dan meja serentak, lalu selesai setelah tiba dan diukur', {
    skip: !process.env.TEST_DATABASE_URL,
}, async () => {
    const db = await siapkanSinkronisasiDb();
    try {
        const { pengguna, periodeId, anak } = db.grup[0];
        const posyanduId = pengguna.posyanduIds![0];
        const tanggal = '2026-10-10';
        const { rows: sasaran } = await db.pool.query(
            'SELECT id FROM sasaran WHERE periode_id=$1 ORDER BY anak_id LIMIT 2', [periodeId],
        );
        const akun = async (nama: string, meja: number | null, posyandu = posyanduId) => {
            const { rows } = await db.pool.query(
                "INSERT INTO pengguna(nama,username,kata_sandi_hash,peran) VALUES($1,$1,'hash-uji','kms') RETURNING id",
                [nama],
            );
            await db.pool.query(
                'INSERT INTO pengguna_posyandu(pengguna_id,posyandu_id,meja_kms) VALUES($1,$2,$3)',
                [rows[0].id, posyandu, meja],
            );
            return Number(rows[0].id);
        };
        const mejaSatu = await akun('kms-satu', 1);
        const mejaDua = await akun('kms-dua', 2);
        const mejaSama = await akun('kms-sama', 1);
        const tanpaMeja = await akun('kms-tanpa', null);
        const luar = await akun('kms-luar', 1, db.grup[1].pengguna.posyanduIds![0]);
        const tx = <T>(id: number, fn: Parameters<typeof dalamTransaksi<T>>[2]) =>
            dalamTransaksi(db.pool, { pengguna: id, sumber: 'uji' }, fn);
        const daftarPeserta = () => daftar(db.pool, pengguna, periodeId, tanggal);
        for (const target of sasaran) {
            assert.ok(await tx(pengguna.id, (klien) =>
                checkIn(klien, pengguna, periodeId, Number(target.id), tanggal, null)));
        }
        const [a, b] = await daftarPeserta();
        assert.equal(a.sudahDiukur, false);
        assert.equal((await sesiKms(db.pool, { ...pengguna, id: mejaSatu }, '2026-10'))?.mejaKms, 1);
        const aksi = (id: number, peserta: string, tindakan: AksiPanggilan) =>
            tx(id, (klien) => ubahPanggilan(klien, id, periodeId, tanggal, peserta, tindakan));
        assert.equal(await aksi(tanpaMeja, a.id, 'panggil'), 'tanpa-meja');
        assert.equal(await aksi(luar, a.id, 'panggil'), 'tanpa-meja');
        const serentak = await Promise.all([aksi(mejaSatu, a.id, 'panggil'), aksi(mejaDua, a.id, 'panggil')]);
        assert.deepEqual(serentak.toSorted(), ['bentrok', 'berhasil']);
        const pemenang = serentak[0] === 'berhasil' ? mejaSatu : mejaDua;
        assert.equal(await aksi(pemenang, a.id, 'kembalikan'), 'berhasil');
        assert.equal((await daftarPeserta())[0].urutan, a.urutan);

        assert.equal(await aksi(mejaSatu, a.id, 'panggil'), 'berhasil');
        assert.equal(await aksi(mejaSama, b.id, 'panggil'), 'bentrok');
        assert.equal(await aksi(mejaDua, b.id, 'panggil'), 'berhasil');
        assert.equal(await aksi(mejaSatu, a.id, 'ulang'), 'berhasil');
        const rekaman = await daftarPanggilan(db.pool, periodeId, tanggal, '0');
        assert.deepEqual(rekaman.slice(1).map(({ nomor, meja }) => [nomor, meja]), [[a.nomor, 1], [b.nomor, 2], [a.nomor, 1]]);
        assert.deepEqual(rekaman.slice(1).map(({ nama }) => nama), [a.nama, b.nama, a.nama]);
        assert.deepEqual(await daftarPanggilan(db.pool, periodeId, tanggal, null), rekaman.slice(-1));
        assert.deepEqual(await daftarPanggilan(db.pool, periodeId, tanggal, rekaman.at(-1)!.id), []);

        const petugas = { ...pengguna, id: mejaSatu, peran: 'kms' as const };
        const selesai = () => tx(mejaSatu, (klien) => konfirmasiKms(klien, petugas, a.id, true, 'Catatan uji'));
        assert.equal(await selesai(), null);
        assert.equal(await aksi(mejaSatu, a.id, 'tiba'), 'berhasil');
        assert.equal(await selesai(), null);
        await simpanPengukuran(db.pool, pengguna, payloadUji(anak[0]));
        const [diukur] = await daftarPeserta();
        assert.equal(diukur.nomor, a.nomor);
        assert.equal(diukur.mejaKms, 1);
        assert.equal(diukur.tibaKms, true);
        assert.equal(diukur.sudahDiukur, true);
        assert.equal((await selesai())?.status, 'done');
        assert.equal((await db.pool.query('SELECT catatan_kms FROM pengukuran WHERE anak_id=$1 AND periode_id=$2', [a.anakId, periodeId])).rows[0].catatan_kms, 'Catatan uji');
        assert.equal(await aksi(mejaDua, b.id, 'kembalikan'), 'berhasil');
        assert.equal(await aksi(mejaSama, b.id, 'panggil'), 'berhasil');
        const akunSama = { ...pengguna, id: mejaSama, peran: 'kms' as const };
        const akunDua = { ...pengguna, id: mejaDua, peran: 'kms' as const };
        assert.equal((await tx(mejaDua, klien => panggilKms(klien, akunDua, b.id))).status, 'milik-lain');
        assert.equal((await tx(mejaSama, klien => lepasKms(klien, akunSama, b.id))).status, 'ok');
        const sebelum = (await daftarPanggilan(db.pool, periodeId, tanggal, '0')).length;
        assert.equal((await tx(mejaSama, klien => panggilKmsBerikutnya(klien, akunSama, periodeId, tanggal))).status, 'ok');
        const setelah = await daftarPanggilan(db.pool, periodeId, tanggal, '0');
        assert.equal(setelah.length, sebelum + 1);
        assert.equal(setelah.at(-1)?.nomor, b.nomor);
        assert.equal(setelah.at(-1)?.meja, 1);
        assert.equal((await tx(mejaSama, klien => lepasKms(klien, akunSama, b.id))).status, 'ok');
        const balapan = await Promise.all([
            tx(mejaSama, klien => panggilKms(klien, akunSama, b.id)),
            aksi(mejaDua, b.id, 'panggil'),
        ]);
        assert.equal(Number(balapan[0].status === 'ok') + Number(balapan[1] === 'berhasil'), 1);
    } finally {
        await db.tutup();
    }
});
