/**
 * Token tautan Lembar Hasil: murni, tanpa basis data. Yang diuji adalah
 * hal-hal yang berakibat keamanan — tanda tangan, kedaluwarsa, dan payload
 * yang diubah.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { bacaToken, buatToken, UMUR_LEMBAR_DETIK } from "../src/services/lembar-token.ts";

const RAHASIA = "r".repeat(40);
const SEKARANG = 1_800_000_000;
const isi = { anakId: 110, periodeId: "2026-09", kedaluwarsa: SEKARANG + UMUR_LEMBAR_DETIK };

describe("token lembar hasil", () => {
    test("token yang dibuat dapat dibaca kembali", () => {
        assert.deepEqual(bacaToken(buatToken(isi, RAHASIA), RAHASIA, SEKARANG), isi);
    });

    test("rahasia lain menolak token", () => {
        assert.equal(bacaToken(buatToken(isi, RAHASIA), "x".repeat(40), SEKARANG), null);
    });

    test("payload yang diubah menolak token", () => {
        const [, tanda] = buatToken(isi, RAHASIA).split(".");
        const badan = Buffer.from(JSON.stringify({ ...isi, anakId: 111 })).toString("base64url");

        assert.equal(bacaToken(`${badan}.${tanda}`, RAHASIA, SEKARANG), null);
    });

    test("token lewat masa berlaku dilaporkan kedaluwarsa, bukan tidak sah", () => {
        const token = buatToken(isi, RAHASIA);

        assert.equal(bacaToken(token, RAHASIA, isi.kedaluwarsa + 1), "kedaluwarsa");
        assert.deepEqual(bacaToken(token, RAHASIA, isi.kedaluwarsa), isi);
    });

    test("sampah, bentuk salah, dan periode tidak sah ditolak", () => {
        for (const sampah of ["", "abc", "a.b.c", ".", "..", "x".repeat(300)]) {
            assert.equal(bacaToken(sampah, RAHASIA, SEKARANG), null);
        }

        assert.equal(
            bacaToken(buatToken({ ...isi, periodeId: "bukan" }, RAHASIA), RAHASIA, SEKARANG),
            null,
        );
    });
});
