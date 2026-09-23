/**
 * Autentikasi dan otorisasi.
 *
 * Tidak satu pun pengujian di sini menyentuh basis data: hashing, token, dan
 * matriks izin semuanya murni. Itu disengaja — bagian inilah yang salahnya
 * berakibat pada keamanan, dan ia tidak boleh hanya teruji ketika Postgres
 * kebetulan menyala.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    hashKataSandi,
    perluHashUlang,
    verifikasiKataSandi,
} from '../src/auth/kata-sandi.ts';
import type { Aksi, Peran, PenggunaAktif } from '../src/auth/peran.ts';
import {
    boleh,
    bolehAksesRt,
    peranMinimum,
    rtYangBolehDilihat,
    SEMUA_AKSI,
    SEMUA_PERAN,
} from '../src/auth/peran.ts';
import {
    buatSesi,
    ringkasanCocok,
    ringkasanToken,
    sudahKedaluwarsa,
    UMUR_SESI_MS,
} from '../src/auth/sesi.ts';

describe('matriks izin', () => {
    /*
        Disalin dari docs/arsitektur.md bagian Otorisasi, sengaja ditulis ulang sebagai
        harapan dan bukan diimpor dari sumber yang sama dengan kodenya. Kalau
        tabel di `peran.ts` diubah tanpa sengaja, tabel ini yang menangkapnya;
        keduanya berasal dari dokumen, bukan satu dari yang lain.
    */
    const HARAPAN: Record<Aksi, Record<Peran, boolean>> = {
        'lihat-dashboard': { kader: true, bidan: true, admin: true },
        'lihat-anak': { kader: true, bidan: true, admin: true },
        'lihat-kms': { kader: true, bidan: true, admin: true },
        'lihat-rekap': { kader: true, bidan: true, admin: true },

        'ubah-anak': { kader: false, bidan: true, admin: true },
        'ubah-pengukuran': { kader: false, bidan: true, admin: true },
        'gabung-duplikat': { kader: false, bidan: true, admin: true },
        'selesaikan-konflik-impor': { kader: false, bidan: true, admin: true },
        'unduh-rekap': { kader: false, bidan: true, admin: true },

        'kelola-wilayah-rt': { kader: false, bidan: false, admin: true },
        'kelola-periode': { kader: false, bidan: false, admin: true },
        'hapus-data': { kader: false, bidan: false, admin: true },
        'kelola-akun': { kader: false, bidan: false, admin: true },
        'jalankan-impor': { kader: false, bidan: false, admin: true },
    };

    for (const aksi of SEMUA_AKSI) {
        for (const peran of SEMUA_PERAN) {
            const diharapkan = HARAPAN[aksi][peran];

            test(`${peran} ${diharapkan ? 'boleh' : 'ditolak'}: ${aksi}`, () => {
                assert.equal(boleh(peran, aksi), diharapkan);
            });
        }
    }

    test('tidak ada aksi yang lupa didaftarkan', () => {
        assert.equal(SEMUA_AKSI.length, Object.keys(HARAPAN).length);
        assert.equal(SEMUA_AKSI.length, 14);
    });

    test('peran yang lebih tinggi mewarisi seluruh hak di bawahnya', () => {
        // Invarian struktural: tidak boleh ada aksi yang boleh bagi peran
        // rendah tetapi ditolak bagi peran tinggi.
        for (const aksi of SEMUA_AKSI) {
            if (boleh('kader', aksi)) {
                assert.ok(boleh('bidan', aksi), `bidan kehilangan ${aksi}`);
            }

            if (boleh('bidan', aksi)) {
                assert.ok(boleh('admin', aksi), `admin kehilangan ${aksi}`);
            }
        }
    });

    test('peranMinimum sejalan dengan boleh()', () => {
        for (const aksi of SEMUA_AKSI) {
            assert.ok(boleh(peranMinimum(aksi), aksi));
        }
    });
});

describe('pembatasan RT', () => {
    const kader = (rt: string | null): PenggunaAktif => ({
        id: 7,
        peran: 'kader',
        rt,
        aktif: true,
    });

    test('kader terbatas pada RT binaannya', () => {
        assert.equal(rtYangBolehDilihat(kader('01')), '01');
        assert.ok(bolehAksesRt(kader('01'), '01'));
        assert.ok(!bolehAksesRt(kader('01'), '02'));
    });

    test('bidan dan admin melihat seluruh RW', () => {
        for (const peran of ['bidan', 'admin'] as const) {
            const p: PenggunaAktif = { id: 1, peran, rt: null, aktif: true };

            assert.equal(rtYangBolehDilihat(p), null);
            assert.ok(bolehAksesRt(p, '05'));
            assert.ok(bolehAksesRt(p, null));
        }
    });

    test('kader tanpa RT binaan ditolak, bukan diberi akses penuh', () => {
        // Kegagalan yang paling sunyi: menafsirkan rt kosong sebagai "semua RT".
        assert.throws(() => rtYangBolehDilihat(kader(null)), /tidak punya RT binaan/);
        assert.throws(() => rtYangBolehDilihat(kader('')), /tidak punya RT binaan/);
        assert.throws(() => bolehAksesRt(kader(null), '01'));
    });

    test('kader tidak boleh menyentuh baris yang RT-nya kosong', () => {
        assert.ok(!bolehAksesRt(kader('01'), null));
    });
});

describe('kata sandi', () => {
    test('hash yang benar dapat diverifikasi', async () => {
        const hash = await hashKataSandi('kader posyandu 2026');

        assert.ok(await verifikasiKataSandi('kader posyandu 2026', hash));
    });

    test('kata sandi salah ditolak', async () => {
        const hash = await hashKataSandi('kader posyandu 2026');

        assert.ok(!(await verifikasiKataSandi('kader posyandu 2025', hash)));
        assert.ok(!(await verifikasiKataSandi('', hash)));
    });

    test('dua hash dari kata sandi sama selalu berbeda', async () => {
        const a = await hashKataSandi('sama');
        const b = await hashKataSandi('sama');

        assert.notEqual(a, b, 'garam tidak acak');
        assert.ok(await verifikasiKataSandi('sama', a));
        assert.ok(await verifikasiKataSandi('sama', b));
    });

    test('parameter ikut tersimpan di dalam hash', async () => {
        const hash = await hashKataSandi('apa saja');
        const [skema, n, r, p] = hash.split('$');

        assert.equal(skema, 'scrypt');
        assert.equal(Number(n), 32768);
        assert.equal(Number(r), 8);
        assert.equal(Number(p), 1);
        assert.equal(hash.split('$').length, 6);
    });

    test('hash berparameter lama tetap dapat diverifikasi', async () => {
        // Dibuat dengan N jauh lebih kecil, seolah dari masa sebelum dinaikkan.
        const { scrypt } = await import('node:crypto');
        const garam = Buffer.from('garam-lama-16byt');
        const kunci = await new Promise<Buffer>((selesai, gagal) => {
            scrypt('lama', garam, 64, { N: 1024, r: 8, p: 1 }, (galat, hasil) => {
                if (galat !== null) {
                    gagal(galat);

                    return;
                }

                selesai(hasil);
            });
        });
        const lama = `scrypt$1024$8$1$${garam.toString('base64')}$${kunci.toString('base64')}`;

        assert.ok(await verifikasiKataSandi('lama', lama));
        assert.ok(perluHashUlang(lama), 'seharusnya ditandai untuk di-hash ulang');
    });

    test('hash parameter sekarang tidak perlu di-hash ulang', async () => {
        assert.ok(!perluHashUlang(await hashKataSandi('baru')));
    });

    test('hash rusak ditolak tanpa melempar', async () => {
        for (const rusak of [
            '',
            'bukan-hash',
            'scrypt$32768$8$1$hanya-lima$',
            'bcrypt$32768$8$1$Zm9v$YmFy',
            'scrypt$bukan-angka$8$1$Zm9v$YmFy',
            'scrypt$32768$8$1$$',
        ]) {
            assert.equal(
                await verifikasiKataSandi('apa saja', rusak),
                false,
                `gagal pada: ${rusak}`,
            );
        }
    });

    test('kata sandi dinormalkan sehingga bentuk Unicode berbeda tetap cocok', async () => {
        // "é" dapat ditulis satu titik kode atau dua; keduanya kata sandi yang
        // sama bagi orang yang mengetiknya.
        const hash = await hashKataSandi('café');

        assert.ok(await verifikasiKataSandi('café', hash));
    });
});

describe('sesi', () => {
    test('token acak dan tidak pernah sama', () => {
        const a = buatSesi();
        const b = buatSesi();

        assert.notEqual(a.token, b.token);
        assert.notEqual(a.ringkasan, b.ringkasan);
        // 32 bait base64url tanpa bantalan.
        assert.equal(a.token.length, 43);
    });

    test('yang disimpan bukan tokennya', () => {
        const sesi = buatSesi();

        assert.notEqual(sesi.ringkasan, sesi.token);
        assert.ok(!sesi.ringkasan.includes(sesi.token));
        assert.match(sesi.ringkasan, /^[0-9a-f]{64}$/);
        assert.equal(sesi.ringkasan, ringkasanToken(sesi.token));
    });

    test('kedaluwarsa 12 jam sejak dibuat', () => {
        const sekarang = new Date('2026-06-13T08:00:00.000Z');
        const sesi = buatSesi(sekarang);

        assert.equal(sesi.kedaluwarsa.getTime() - sekarang.getTime(), UMUR_SESI_MS);
        assert.equal(UMUR_SESI_MS, 12 * 60 * 60 * 1000);
    });

    test('kedaluwarsa dihitung terhadap waktu yang diberikan', () => {
        const sekarang = new Date('2026-06-13T08:00:00.000Z');
        const sesi = buatSesi(sekarang);

        assert.ok(!sudahKedaluwarsa(sesi.kedaluwarsa, sekarang));
        assert.ok(
            !sudahKedaluwarsa(sesi.kedaluwarsa, new Date(sekarang.getTime() + UMUR_SESI_MS - 1)),
        );
        // Tepat pada detik kedaluwarsa sudah dianggap mati, bukan masih hidup.
        assert.ok(sudahKedaluwarsa(sesi.kedaluwarsa, new Date(sekarang.getTime() + UMUR_SESI_MS)));
    });

    test('perbandingan ringkasan menolak yang tidak cocok dan yang cacat', () => {
        const sesi = buatSesi();

        assert.ok(ringkasanCocok(sesi.ringkasan, ringkasanToken(sesi.token)));
        assert.ok(!ringkasanCocok(sesi.ringkasan, buatSesi().ringkasan));
        assert.ok(!ringkasanCocok(sesi.ringkasan, ''));
        assert.ok(!ringkasanCocok('', ''));
        assert.ok(!ringkasanCocok(sesi.ringkasan, sesi.ringkasan.slice(0, 32)));
    });
});
