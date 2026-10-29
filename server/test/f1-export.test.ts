import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { kategoriEkonomi, namaF1, rtF1 } from '../src/services/f1-sumber.ts';
import { susunF1 } from '../src/services/f1-service.ts';
import { workbookF1 } from '../src/services/f1-export.ts';

describe('layanan F1', () => {
    test('kategoriEkonomi memetakan desil dan G/NG dengan benar', () => {
        assert.equal(kategoriEkonomi(1, null), 'G');
        assert.equal(kategoriEkonomi(4, null), 'G');
        assert.equal(kategoriEkonomi(5, null), 'NG');
        assert.equal(kategoriEkonomi(10, null), 'NG');
        assert.equal(kategoriEkonomi(null, 'G'), 'G');
        assert.equal(kategoriEkonomi(null, 'NG'), 'NG');
        assert.equal(kategoriEkonomi(null, null), null);
    });

    test('namaF1 dan rtF1 menormalkan teks identitas', () => {
        assert.equal(namaF1('  Muhammad Ali-Akbar  '), 'MUHAMMADALIAKBAR');
        assert.equal(rtF1('01'), '1');
        assert.equal(rtF1('005'), '5');
    });

    test('susunF1 mengelompokkan data per posyandu dan anak', () => {
        const dasar = [
            {
                posyanduId: 1,
                posyandu: 'Tulip',
                rw: '018',
                kelurahan: 'Citeureup',
                tanggalKegiatan: '2026-09-17',
                tanggalUkur: '2026-09-17',
                anakId: 101,
                nama: 'Nayla',
                jk: 'P',
                rt: '01',
                tglLahir: '2024-03-10',
                bb: 10.5,
                ntobRaw: 'N',
                statusSasaran: 'hadir',
                diukur: true,
                gng: 'NG',
                desil: null,
                sumberEkonomi: null,
                periodeEkonomi: null,
                asi: null,
            },
        ];
        const hasil = {
            bulanan: [
                {
                    anakId: 101,
                    nt: 'N',
                    duaT: false,
                    penilaian: {
                        'PERMENKES-2-2020': {
                            BB_U: { kategori: 'Berat badan normal' },
                        },
                    },
                },
            ],
            riwayat2T: [],
        } as any;

        const res = susunF1('2026-09', dasar, hasil);
        assert.equal(res.periode, '2026-09');
        assert.equal(res.kelompok.length, 1);
        assert.equal(res.kelompok[0].anak.length, 1);
        const a = res.kelompok[0].anak[0];
        assert.equal(a.nama, 'Nayla');
        assert.equal(a.ntob, 'N');
        assert.equal(a.gng, 'NG');
        assert.equal(a.diukur, true);
        assert.equal(a.kategori, 'Berat badan normal');
    });

    test('workbookF1 menghasilkan workbook Excel dengan sheet F1 dan RAW DATA', async () => {
        const data = {
            periode: '2026-09',
            kelompok: [
                {
                    id: 1,
                    nama: 'Tulip',
                    rw: '018',
                    kelurahan: 'Citeureup',
                    tanggal: '2026-09-17',
                    anak: [
                        {
                            anakId: 1,
                            nama: 'Aisyah',
                            jk: 'P',
                            rt: '01',
                            umur: 18,
                            ntob: 'N',
                            gng: 'NG' as const,
                            desil: 6,
                            asi: null,
                            diukur: true,
                            duaT: false,
                            kategori: 'Berat badan normal',
                            bb: 9.8,
                            tanggal: '2026-09-17',
                            sumberEkonomi: null,
                            periodeEkonomi: null,
                            tidakHadir: false,
                        },
                    ],
                },
            ],
        };

        const wb = await workbookF1(data);
        assert.ok(wb.getWorksheet('F1_2026-09'));
        assert.ok(wb.getWorksheet('RAW DATA FOR F1_ALL'));
        assert.ok(wb.getWorksheet('RAW DATA F1 RT01'));

        const buf = await wb.xlsx.writeBuffer();
        assert.ok(buf.byteLength > 10000);
    });
});
