import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import Halaman from '@/components/halaman';
import { data, sasaranDemo } from '@/data/contoh/store';

export type SesiDemo = {
    periode: string;
    sasaran: ReturnType<typeof sasaranDemo>['items'];
    pengukuran: Record<number, { bb: number; tinggi: number }>;
};

export default function PelatihanDemo({ sesi, onSesi }: { sesi: SesiDemo | null; onSesi: (sesi: SesiDemo | null) => void }) {
    const [periode, setPeriode] = useState(data.periode.at(-1)?.id ?? '');
    const [anakId, setAnakId] = useState('');
    const [bb, setBb] = useState('');
    const [tinggi, setTinggi] = useState('');
    const [pesan, setPesan] = useState('');
    const mulai = () => {
        const sasaran = sasaranDemo(periode).items.map((item) => ({ ...item, status: 'menunggu' as const, catatan: null }));
        onSesi({ periode, sasaran, pengukuran: {} });
        setAnakId(String(sasaran[0]?.anakId ?? ''));
        setPesan('Salinan sasaran dibuat. Hasil ukur latihan masih kosong.');
    };
    return <Halaman ikon={FlaskConical} judul="Sesi Pelatihan" subjudul="Simulasi mandiri menggunakan salinan data contoh.">
        <section className="kartu mx-auto w-full max-w-4xl space-y-5 p-5 sm:p-7">
            <p role="status">Data latihan hanya tersedia pada halaman ini selama sesi browser dan tidak mengubah data contoh atau server.</p>
            {sesi === null ? <>
                <label className="block font-bold" htmlFor="periode-latihan">Salin sasaran dari periode</label>
                <select id="periode-latihan" value={periode} onChange={(e) => setPeriode(e.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-background px-3">
                    {data.periode.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <button type="button" className="tombol-utama" onClick={mulai}>Mulai sesi pelatihan</button>
            </> : <>
                <h2 className="text-xl font-extrabold">Sesi latihan {sesi.periode}</h2>
                <p>{sesi.sasaran.length} sasaran disalin · {Object.keys(sesi.pengukuran).length} hasil ukur latihan</p>
                <form className="grid gap-3" onSubmit={(e) => {
                    e.preventDefault();
                    const berat = Number(bb); const panjang = Number(tinggi);
                    if (!anakId || !Number.isFinite(berat) || !Number.isFinite(panjang) || berat <= 0 || panjang <= 0) { setPesan('Pilih balita dan isi berat serta tinggi yang lebih dari nol.'); return; }
                    onSesi({ ...sesi, pengukuran: { ...sesi.pengukuran, [Number(anakId)]: { bb: berat, tinggi: panjang } } });
                    setPesan('Hasil ukur latihan disimpan sementara.'); setBb(''); setTinggi('');
                }}>
                    <label htmlFor="anak-latihan">Balita latihan</label>
                    <select id="anak-latihan" value={anakId} onChange={(e) => setAnakId(e.target.value)} className="min-h-12 rounded-lg border border-border bg-background px-3">{sesi.sasaran.map((anak) => <option key={anak.anakId} value={anak.anakId}>{anak.nama} · RT {anak.rt ?? '—'}</option>)}</select>
                    <label htmlFor="bb-latihan">Berat badan (kg)</label><input id="bb-latihan" type="number" step="0.1" min="0.1" value={bb} onChange={(e) => setBb(e.target.value)} className="min-h-12 rounded-lg border border-border px-3" required />
                    <label htmlFor="tinggi-latihan">Tinggi/panjang badan (cm)</label><input id="tinggi-latihan" type="number" step="0.1" min="0.1" value={tinggi} onChange={(e) => setTinggi(e.target.value)} className="min-h-12 rounded-lg border border-border px-3" required />
                    <button type="submit" className="tombol-utama">Simpan hasil latihan</button>
                </form>
                <ul className="space-y-2">{sesi.sasaran.filter((a) => sesi.pengukuran[a.anakId]).map((a) => <li key={a.anakId}>{a.nama}: {sesi.pengukuran[a.anakId].bb} kg · {sesi.pengukuran[a.anakId].tinggi} cm</li>)}</ul>
                <button type="button" className="tombol-kedua" onClick={() => { onSesi(null); setPesan('Sesi dan hasil latihan dihapus.'); }}>Akhiri sesi latihan</button>
            </>}
            {pesan && <p role="status">{pesan}</p>}
        </section>
    </Halaman>;
}
