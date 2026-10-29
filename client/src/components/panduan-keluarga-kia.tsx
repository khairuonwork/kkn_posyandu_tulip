import {
    Baby,
    BookOpen,
    CalendarDays,
    HeartHandshake,
    MessageCircle,
    ShieldCheck,
    Sprout,
    Utensils,
    TriangleAlert,
} from 'lucide-react';
import keluarga from '@/assets/edukasi-keluarga-kia-v1.png';
import type { EdukasiLembarKia } from '@/lib/lembar';
import { tanggalPanjang } from '@/lib/format';
import './panduan-keluarga-kia.css';

/** One source of parent guidance for the live result and printed handout. */
export default function PanduanKeluargaKia({
    nama,
    edukasi,
}: {
    nama: string;
    edukasi: EdukasiLembarKia;
}) {
    const { kelompok, makan, sumber, bahaya, layanan } = edukasi;
    if (!kelompok) return null;
    const bayi = ['lahir-28h', '29h-3b', '3-6b'].includes(kelompok.id);
    return (
        <section
            className="panduan-keluarga"
            aria-label={`Panduan keluarga untuk ${nama}`}
        >
            <header className="panduan-keluarga__hero">
                <div>
                    <h2>
                        Temani {nama}
                        <br />
                        tumbuh setiap hari
                    </h2>
                    <p>
                        Makan, bermain, dan perhatian keluarga membantu anak
                        tumbuh dan berkembang.
                    </p>
                    <p className="panduan-keluarga__usia">
                        <Baby size={18} aria-hidden="true" />
                        Panduan usia {kelompok.label}
                    </p>
                </div>
                <img
                    src={keluarga}
                    width="1536"
                    height="1024"
                    alt="Orang tua dan anak menikmati buku bersama."
                />
            </header>

            {makan && (
                <section className="panduan-keluarga__bab panduan-keluarga__makan">
                    <div className="panduan-keluarga__tanda" aria-hidden="true">
                        {bayi ? <HeartHandshake /> : <Utensils />}
                    </div>
                    <div className="panduan-keluarga__isi">
                        <h3>
                            {bayi
                                ? 'Menyusu dan dekat dengan keluarga'
                                : 'Makan sesuai usia, tumbuh bersama'}
                        </h3>
                        <p className="panduan-keluarga__rujukan">
                            Buku KIA 2024 · halaman {makan.halaman}
                        </p>
                        <ul>
                            {makan.isi.map((teks) => (
                                <li key={teks}>{teks}</li>
                            ))}
                        </ul>
                        <div className="panduan-keluarga__pengingat">
                            {bayi ? (
                                <>
                                    <HeartHandshake
                                        size={19}
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Ada kesulitan menyusui? Ceritakan kepada
                                        tenaga kesehatan.
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Utensils size={19} aria-hidden="true" />
                                    <span>
                                        Sesuaikan tekstur makanan dengan usia
                                        dan kemampuan makan anak.
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            )}

            <section className="panduan-keluarga__bab panduan-keluarga__main">
                <div className="panduan-keluarga__tanda" aria-hidden="true">
                    <Sprout />
                </div>
                <div className="panduan-keluarga__isi">
                    <h3>Belajar lewat kebersamaan</h3>
                    <p className="panduan-keluarga__rujukan">
                        Stimulasi usia {kelompok.label} · Buku KIA halaman{' '}
                        {kelompok.halaman}
                    </p>
                    <ul>
                        {kelompok.stimulasi.map((teks) => (
                            <li key={teks}>{teks}</li>
                        ))}
                    </ul>
                    <div className="panduan-keluarga__pengingat">
                        <MessageCircle size={19} aria-hidden="true" />
                        <span>
                            Ceritakan kemampuan baru dan hal yang belum bisa
                            dilakukan anak saat berdiskusi dengan kader.
                        </span>
                    </div>
                </div>
            </section>

            <section className="panduan-keluarga__kunjungan">
                <div className="panduan-keluarga__kalender">
                    <CalendarDays aria-hidden="true" />
                    <strong>
                        Setiap
                        <br />
                        bulan
                    </strong>
                </div>
                <div>
                    <h3>Datang kembali ke Posyandu</h3>
                    <p>{layanan}</p>
                    <div
                        className="panduan-keluarga__alur"
                        aria-label="Hal yang dibahas saat kunjungan"
                    >
                        <span>
                            <Sprout size={18} aria-hidden="true" />
                            Pertumbuhan
                        </span>
                        <span>
                            <MessageCircle size={18} aria-hidden="true" />
                            Perkembangan
                        </span>
                        <span>
                            <BookOpen size={18} aria-hidden="true" />
                            Layanan Buku KIA
                        </span>
                    </div>
                </div>
            </section>

            <aside className="panduan-keluarga__bahaya">
                <TriangleAlert aria-hidden="true" />
                <div>
                    <h3>Segera cari pertolongan bila ada tanda bahaya</h3>
                    <p>{bahaya.pesan}</p>
                    <p className="panduan-keluarga__rujukan">
                        Buku KIA halaman {bahaya.halaman}
                    </p>
                </div>
            </aside>
            <footer className="panduan-keluarga__sumber">
                <a
                    href={`${sumber.url}#page=${kelompok.halamanPdf}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    Baca panduan lengkap Buku KIA 2024
                </a>
                <p>
                    Panduan umum sesuai usia. Kebutuhan khusus dan hasil
                    pemeriksaan anak dibahas bersama tenaga kesehatan.
                </p>
            </footer>
        </section>
    );
}

export function DiskusiKiaCetak({ edukasi }: { edukasi: EdukasiLembarKia }) {
    const d = edukasi.diskusi;
    if (!d) return null;
    return (
        <div className="diskusi-kia-cetak">
            <div className="diskusi-kia-cetak__judul">
                <ShieldCheck aria-hidden="true" />
                <div>
                    <h2>Catatan diskusi bersama keluarga</h2>
                    <p>
                        {tanggalPanjang(d.tanggal)} · Usia {d.kelompokLabel} ·
                        Buku KIA halaman {d.halaman}
                    </p>
                </div>
            </div>
            <p className="diskusi-kia-cetak__status">
                {d.dibahas
                    ? 'Sudah dibahas bersama orang tua'
                    : 'Catatan pemantauan; diskusi belum ditandai selesai'}
            </p>
            <p>{d.ringkasan.arahan}</p>
            <p className="diskusi-kia-cetak__jumlah">
                {d.ringkasan.ya} Ya · {d.ringkasan.tidak} Tidak ·{' '}
                {d.ringkasan.belum} belum diamati
            </p>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Hal yang diamati</th>
                        <th scope="col">Jawaban</th>
                    </tr>
                </thead>
                <tbody>
                    {d.butir.map((b, i) => (
                        <tr key={b.id}>
                            <td>
                                {i + 1}. {b.teks}
                            </td>
                            <td>
                                <strong>
                                    {b.jawaban === 'ya'
                                        ? 'Ya'
                                        : b.jawaban === 'tidak'
                                          ? 'Tidak'
                                          : 'Belum diamati'}
                                </strong>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <section>
                <h3>Catatan pengamatan dan cerita orang tua</h3>
                <p>{d.catatan || 'Belum ada catatan tambahan.'}</p>
            </section>
            <section>
                <h3>Tindak lanjut yang disepakati</h3>
                <p>
                    {d.tindakLanjut || 'Belum ada tindak lanjut yang dicatat.'}
                </p>
            </section>
        </div>
    );
}
