import assert from 'node:assert/strict';
import { test } from 'node:test';

import { periksaSandi } from '../src/auth/sandi-umum.ts';

const UMUM =
    'Kata sandi ini terlalu umum sehingga mudah ditebak orang lain. Coba gabungan dua atau tiga kata yang mudah diingat.';
const MEMUAT_NAMA = 'Kata sandi tidak boleh memuat nama pengguna atau nama pemilik akun.';

test('frasa sandi yang mudah diingat diterima, termasuk spasinya', () => {
    assert.equal(periksaSandi('kopi manis pagi'), null);
    assert.equal(periksaSandi('Sepeda Biru Ke Pasar'), null);
});

test('kurang dari 8 karakter ditolak', () => {
    assert.equal(periksaSandi('pendek'), 'Kata sandi minimal 8 karakter.');
});

test('sandi umum ditolak tanpa memandang huruf besar dan spasi', () => {
    for (const sandi of ['password1', 'PASSWORD1', '12345678', 'pass word1', 'qwertyuiop']) {
        assert.equal(periksaSandi(sandi), UMUM, sandi);
    }
});

test('kata lokal yang hanya ditambah angka atau simbol ditolak', () => {
    for (const sandi of ['Posyandu2026!', 'sayang123', '2026kader', 'bismillah1', 'tulip#2026']) {
        assert.equal(periksaSandi(sandi), UMUM, sandi);
    }
});

test('sandi dengan kurang dari empat karakter berbeda ditolak', () => {
    for (const sandi of ['aaaa1111', 'abababab']) {
        assert.equal(periksaSandi(sandi), UMUM, sandi);
    }
});

test('sandi yang memuat nama pengguna atau nama pemilik akun ditolak', () => {
    assert.equal(periksaSandi('kader03 kopi', { username: 'kader03' }), MEMUAT_NAMA);
    assert.equal(periksaSandi('aminah1990!', { nama: 'Siti Aminah' }), MEMUAT_NAMA);
    assert.equal(periksaSandi('bidanku manis', { username: 'a.bidan' }), MEMUAT_NAMA);
});

test('bagian nama yang pendek tidak memicu penolakan', () => {
    assert.equal(periksaSandi('maniskopi pagi', { username: 'ani', nama: 'Sri Ani' }), null);
});
