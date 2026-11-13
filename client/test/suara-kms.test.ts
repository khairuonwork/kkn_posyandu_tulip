import assert from 'node:assert/strict';
import { test } from 'node:test';
import { idSuara, pilihSuara, teksPanggilan } from '../src/lib/suara-kms.ts';

test('teks panggilan menyertakan nama jika tersedia', () => {
    assert.equal(teksPanggilan(12, 2, ' Bima Arya Pratama '), 'Nomor antrean dua belas, Bima Arya Pratama, silakan menuju Meja KMS dua.');
    assert.equal(teksPanggilan(1, 1, '  '), 'Nomor antrean satu, silakan menuju Meja KMS satu.');
    assert.equal(teksPanggilan(1, 1), 'Nomor antrean satu, silakan menuju Meja KMS satu.');
});

function suara(name: string, lang: string, localService: boolean): SpeechSynthesisVoice {
    return { name, lang, localService, voiceURI: name, default: false };
}

test('pilihan suara mengikuti bahasa, preferensi, dan ketersediaan', () => {
    const lokal = suara('Suara lokal', 'id-ID', true);
    const andika = suara('Microsoft Andika', 'id-ID', true);
    const daring = suara('Google Indonesia', 'id-ID', false);
    const asing = suara('English', 'en-US', true);
    const daftar = [asing, lokal, daring, andika];

    assert.equal(pilihSuara(daftar, null).pilihan, andika);
    assert.deepEqual(pilihSuara(daftar, null).tersedia, [lokal, daring, andika]);
    assert.equal(pilihSuara(daftar, idSuara(daring)).pilihan, daring);
    assert.equal(pilihSuara([lokal], idSuara(daring)).pilihan, lokal);
    assert.equal(pilihSuara([lokal], idSuara(daring)).tidakTersedia, true);
    assert.equal(pilihSuara([], idSuara(daring)).tidakTersedia, false);
    assert.equal(pilihSuara([daring], null).pilihan, undefined);
    assert.equal(pilihSuara([daring], idSuara(daring)).pilihan, daring);
});
