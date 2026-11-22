import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
    batalkanPercobaan,
    BEBAS_GAGAL,
    hapusJedaAkun,
    infoGagal,
    kosongkanBatas,
    MAKS_GAGAL_IP,
    mulaiPercobaan,
    percobaanBerhasil,
} from '../src/http/batas-masuk.ts';
import type { Izin, Tiket } from '../src/http/batas-masuk.ts';

const IP = '203.0.113.10';
const IP_LUAR = '198.51.100.7';
const USER = 'kader tulip';
const TABLET = 'tablet-kader-01';
const T0 = 1_800_000_000_000;
const DETIK = 1000;
const MENIT = 60 * DETIK;

afterEach(() => kosongkanBatas());

function boleh(izin: Izin): Tiket {
    assert.equal(izin.boleh, true, 'percobaan seharusnya diizinkan');

    return (izin as Extract<Izin, { boleh: true }>).tiket;
}

function ditahan(izin: Izin): Extract<Izin, { boleh: false }> {
    assert.equal(izin.boleh, false, 'percobaan seharusnya ditahan');

    return izin as Extract<Izin, { boleh: false }>;
}

/** `n` kali salah dari perangkat belum dikenal, berselang 1 ms. */
function salah(n: number, ip = IP, mulai = T0, user = USER): Tiket {
    let tiket: Tiket | undefined;

    for (let i = 0; i < n; i += 1) {
        tiket = boleh(mulaiPercobaan(user, ip, null, mulai + i));
    }

    assert.ok(tiket);

    return tiket;
}

/** Tablet petugas pernah berhasil masuk, jadi dikenal untuk akun ini. */
function kenalkanTablet(sekarang = T0): void {
    percobaanBerhasil(boleh(mulaiPercobaan(USER, IP, TABLET, sekarang)), TABLET, sekarang);
}

describe('pembatas percobaan masuk', () => {
    test('15 kali salah tanpa jeda; jeda pertama 30 detik', () => {
        assert.deepEqual(infoGagal(salah(12)), { sisaPercobaan: 3, tungguDetik: 0 });
        assert.deepEqual(infoGagal(salah(3, IP, T0 + 12)), { sisaPercobaan: 0, tungguDetik: 30 });
    });

    test('jeda naik menjadi 1, 2, 4, 8, lalu paling lama 15 menit', () => {
        salah(BEBAS_GAGAL);
        const jeda: number[] = [];

        // Tiap percobaan menunggu lebih lama dari jeda terpanjang.
        for (let i = 1; i <= 7; i += 1) {
            jeda.push(infoGagal(boleh(mulaiPercobaan(USER, IP, null, T0 + i * 20 * MENIT))).tungguDetik);
        }

        assert.deepEqual(jeda, [60, 120, 240, 480, 900, 900, 900]);
    });

    test('percobaan selama jeda ditolak tanpa memperpanjang jeda', () => {
        salah(BEBAS_GAGAL);
        const terakhir = T0 + BEBAS_GAGAL - 1;

        for (let d = 1; d < 30; d += 4) {
            assert.ok(ditahan(mulaiPercobaan(USER, IP, null, terakhir + d * DETIK)).tungguDetik > 0);
        }

        boleh(mulaiPercobaan(USER, IP, null, terakhir + 30 * DETIK));
    });

    test('memutar alamat IP dan ID perangkat tetap memakai hitungan akun yang sama', () => {
        for (let i = 0; i < BEBAS_GAGAL; i += 1) {
            boleh(mulaiPercobaan(USER, `198.51.100.${i}`, `putar-${i}-abcdef`, T0 + i));
        }

        ditahan(mulaiPercobaan(USER, '198.51.100.200', 'putar-baru-abcdef', T0 + 100));
    });

    test('percobaan serentak tidak lolos melebihi batas', () => {
        const hasil = Array.from({ length: 20 }, () => mulaiPercobaan(USER, IP, null, T0));

        assert.equal(hasil.filter((izin) => izin.boleh).length, BEBAS_GAGAL);
    });

    test('tablet petugas tetap bisa masuk saat akunnya ditebak dari luar', () => {
        kenalkanTablet();
        salah(BEBAS_GAGAL, IP_LUAR, T0 + 10);
        ditahan(mulaiPercobaan(USER, IP_LUAR, null, T0 + 100));

        const tiket = boleh(mulaiPercobaan(USER, IP, TABLET, T0 + 200));
        assert.equal(tiket.dikenal, true);
        percobaanBerhasil(tiket, TABLET, T0 + 300);

        // Masuknya petugas tidak membuka kembali tebakan penyerang.
        ditahan(mulaiPercobaan(USER, IP_LUAR, null, T0 + 400));
    });

    test('perangkat dikenal punya batas 15 kali sendiri', () => {
        kenalkanTablet();

        for (let i = 1; i <= BEBAS_GAGAL; i += 1) {
            boleh(mulaiPercobaan(USER, IP, TABLET, T0 + i));
        }

        ditahan(mulaiPercobaan(USER, IP, TABLET, T0 + 100));
    });

    test('satu IP yang menebak banyak akun ditahan, kecuali perangkat dikenal', () => {
        kenalkanTablet();

        for (let i = 0; i < MAKS_GAGAL_IP; i += 1) {
            boleh(mulaiPercobaan(`akun${i}`, IP, null, T0 + 1 + i));
        }

        assert.equal(ditahan(mulaiPercobaan('akun-baru', IP, null, T0 + 100)).jaringan, true);
        boleh(mulaiPercobaan(USER, IP, TABLET, T0 + 101));
    });

    test('galat server tidak dihitung sebagai salah', () => {
        for (let i = 0; i < BEBAS_GAGAL; i += 1) {
            batalkanPercobaan(boleh(mulaiPercobaan(USER, IP, null, T0 + i)));
        }

        assert.equal(boleh(mulaiPercobaan(USER, IP, null, T0 + 100)).gagal, 1);
    });

    test('salah yang berumur lebih dari 24 jam tidak dihitung lagi', () => {
        salah(BEBAS_GAGAL);

        assert.equal(boleh(mulaiPercobaan(USER, IP, null, T0 + 24 * 60 * MENIT + 100)).gagal, 1);
    });

    test('admin mengganti sandi: jeda akun dan jeda perangkatnya terhapus', () => {
        kenalkanTablet();
        salah(BEBAS_GAGAL, IP, T0 + 1);

        for (let i = 0; i < BEBAS_GAGAL; i += 1) {
            boleh(mulaiPercobaan(USER, IP, TABLET, T0 + 100 + i));
        }

        hapusJedaAkun(' Kader Tulip ');

        boleh(mulaiPercobaan(USER, IP_LUAR, null, T0 + 200));
        boleh(mulaiPercobaan(USER, IP, TABLET, T0 + 201));
    });
});
