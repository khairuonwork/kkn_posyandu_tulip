/** Transcribed from the supplied Buku KIA 2024; printed pages are not PDF indexes.
 * Questions are observations for a discussion, not a KPSP score or diagnosis.
 * Keep IDs stable; a content change requires a new version. */
export const SUMBER_KIA = {
    judul: 'Buku KIA 2024', versi: 'KIA-2024.1',
    url: 'https://kesprimkom.kemkes.go.id/assets/uploads/contents/others/Buku_KIA_2024.pdf',
};

export type PertanyaanKia = { id: string; teks: string; nomorSumber: number[] };
export type KelompokKia = {
    id: string; label: string; jenis: 'perkembangan' | 'perawatan';
    mulaiBulan: number; sebelumBulan: number; halaman: string; halamanPdf: number;
    pertanyaan: PertanyaanKia[]; stimulasi: string[]; catatanSumber?: string;
};
function butir(prefix: string, teks: string[], nomor?: number[][]): PertanyaanKia[] {
    return teks.map((t,i) => ({ id: `${prefix}-${String(nomor?.[i]?.[0] ?? i+1).padStart(2,'0')}`, teks: t,
        nomorSumber: nomor?.[i] ?? [i+1] }));
}

export const KELOMPOK_KIA: KelompokKia[] = [
    { id:'lahir-28h',label:'0–28 hari',jenis:'perawatan',mulaiBulan:0,sebelumBulan:1,halaman:'40–47',halamanPdf:22,
        catatanSumber:'Checklist diskusi perawatan diringkas dari bagian bayi baru lahir; bukan daftar penanda perkembangan atau hasil skrining medis.',
        pertanyaan:butir('lahir',[
            'Apakah bayi sudah mendapat pemeriksaan tenaga kesehatan sesuai jadwal usianya?',
            'Apakah keluarga memahami cara menjaga bayi tetap hangat serta merawat tali pusat tetap bersih dan kering?',
            'Apakah bayi tidur telentang pada alas rata tanpa benda yang menutupi kepala?',
            'Apakah keluarga mengenali tanda bahaya bayi baru lahir dan tahu tempat mencari pertolongan?',
        ],[[],[],[],[]]),
        stimulasi:['Dekap bayi dengan hangat, tatap wajahnya, dan ajak bicara saat menyusu.','Tanggapi kebutuhan bayi dengan penuh kasih sayang.','Cocokkan pemeriksaan dan layanan bayi baru lahir dengan catatan Buku KIA bersama tenaga kesehatan.'] },
    { id:'29h-3b',label:'29 hari–3 bulan',jenis:'perkembangan',mulaiBulan:0,sebelumBulan:3,halaman:'53',halamanPdf:28,
        pertanyaan:butir('29h3b',[
            'Bayi bisa mengangkat kepala mandiri hingga setinggi 45 derajat?',
            'Bayi bisa menggerakkan kepala dari kiri/kanan ke tengah?',
            'Bayi bisa melihat dan menatap wajah Anda?',
            'Bayi bisa mengoceh spontan atau bereaksi dengan mengoceh?',
            'Bayi suka tertawa keras?',
            'Bayi bereaksi terkejut terhadap suara keras?',
            'Bayi membalas tersenyum ketika diajak bicara/tersenyum?',
            'Bayi mengenal ibu dengan penglihatan, penciuman, pendengaran, dan kontak?',
        ]),stimulasi:['Peluk, tatap mata, tersenyum, dan ajak bayi bicara.','Tirukan ocehan dan mimik bayi; kenalkan suara atau nyanyian secara langsung.','Ajak bayi meraih dan memegang mainan serta berlatih mengangkat kepala dengan pendampingan.'] },
    { id:'3-6b',label:'3–6 bulan',jenis:'perkembangan',mulaiBulan:3,sebelumBulan:6,halaman:'55',halamanPdf:29,
        pertanyaan:butir('3b6b',[
            'Bayi bisa berbalik dari telungkup ke telentang?',
            'Bayi bisa mengangkat kepala secara mandiri hingga tegak 90 derajat?',
            'Bayi bisa mempertahankan posisi kepala tetap tegak dan stabil?',
            'Bayi bisa menggenggam mainan kecil atau mainan bertangkai?',
            'Bayi bisa meraih benda yang ada dalam jangkauannya?',
            'Bayi bisa mengamati tangannya sendiri?',
            'Bayi berusaha memperluas pandangan?',
            'Bayi mengarahkan matanya pada benda-benda kecil?',
            'Bayi mengeluarkan suara gembira bernada tinggi atau memekik?',
            'Bayi tersenyum ketika melihat mainan/gambar yang menarik saat bermain sendiri?',
        ]),stimulasi:['Ajak bayi bicara, mencari sumber suara, dan bermain cilukba.','Ajak bayi melihat wajah di cermin serta meraih benda atau mainan.','Dampingi bayi saat berlatih berguling dan duduk.'] },
    { id:'6-9b',label:'6–9 bulan',jenis:'perkembangan',mulaiBulan:6,sebelumBulan:9,halaman:'62',halamanPdf:33,
        catatanSumber:'Butir 10 dan 11 pada buku memuat pertanyaan yang sama; keduanya ditampilkan sebagai satu butir agar tidak dijawab dua kali.',
        pertanyaan:butir('6b9b',[
            'Bayi bisa duduk secara mandiri?',
            'Bayi belajar berdiri dan kedua kakinya menyangga sebagian berat badan?',
            'Bayi bisa merangkak meraih mainan atau mendekati seseorang?',
            'Bayi bisa memindahkan benda dari satu tangan ke tangan lainnya?',
            'Bayi bisa memungut dua benda dan kedua tangan memegang dua benda bersamaan?',
            'Bayi bisa memungut benda sebesar kacang dengan cara meraup?',
            'Bayi bersuara tanpa arti, seperti mamama, bababa, dadada, atau tatatata?',
            'Bayi mencari mainan/benda yang dijatuhkan?',
            'Bayi bermain tepuk tangan atau cilukba?',
            'Bayi bergembira dengan melempar benda?',
        ],[[1],[2],[3],[4],[5],[6],[7],[8],[9],[10,11]]),
        stimulasi:['Panggil namanya, kenalkan nama orang dan benda, serta bacakan cerita.','Bermain cilukba, tepuk tangan, dan mencari mainan yang disembunyikan.','Dampingi latihan duduk, merangkak, serta berdiri berpegangan.'] },
    { id:'9-12b',label:'9–12 bulan',jenis:'perkembangan',mulaiBulan:9,sebelumBulan:12,halaman:'63',halamanPdf:33,
        pertanyaan:butir('9b12b',[
            'Bayi bisa mengangkat badannya ke posisi berdiri?',
            'Bayi belajar berdiri selama 30 detik atau berpegangan di kursi?',
            'Bayi dapat berjalan dengan dituntun?',
            'Bayi mengulurkan lengan/badan untuk meraih mainan yang diinginkan?',
            'Bayi bisa menggenggam erat pensil?',
            'Bayi memasukkan benda ke mulut?',
            'Bayi mengulang menirukan bunyi yang didengar?',
            'Bayi menyebut dua sampai tiga suku kata yang sama tanpa arti?',
            'Bayi mengeksplorasi sekitar, ingin tahu, dan ingin menyentuh apa saja?',
            'Bayi bereaksi terhadap suara yang perlahan atau bisikan?',
            'Bayi senang diajak bermain cilukba?',
            'Bayi mengenal anggota keluarga dan takut pada orang yang belum dikenal?',
        ],[[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[13]]),
        stimulasi:['Bacakan cerita, sebutkan nama benda atau bagian tubuh, dan ajak bayi menunjuk.','Dampingi bermain balok, mencari mainan, dan mencoret kertas.','Dampingi saat bayi berdiri berpegangan atau belajar berjalan.'] },
    { id:'12-18b',label:'12–18 bulan',jenis:'perkembangan',mulaiBulan:12,sebelumBulan:18,halaman:'68',halamanPdf:36,
        pertanyaan:butir('12b18b',[
            'Anak bisa berdiri sendiri tanpa berpegangan?',
            'Anak bisa membungkuk memungut mainan kemudian berdiri kembali?',
            'Anak bisa berjalan mundur lima langkah?',
            'Anak bisa memanggil ayah dengan kata “papa” dan ibu dengan kata “mama”?',
            'Anak bisa menumpuk dua kubus?',
            'Anak bisa memasukkan kubus di kotak?',
            'Anak bisa menunjuk yang diinginkan tanpa menangis/merengek, mengeluarkan suara yang menyenangkan, atau menarik tangan ibu?',
            'Anak bisa memperlihatkan rasa cemburu/bersaing?',
        ]),stimulasi:['Bercerita tentang gambar, menyebut nama benda, dan menyanyi bersama.','Bermain balok atau puzzle serta belajar menggambar.','Dampingi bermain bola, berjalan, dan merapikan mainan.'] },
    { id:'18-24b',label:'18–24 bulan',jenis:'perkembangan',mulaiBulan:18,sebelumBulan:24,halaman:'69',halamanPdf:36,
        pertanyaan:butir('18b24b',[
            'Anak bisa berdiri sendiri tanpa berpegangan selama 30 detik?',
            'Anak bisa berjalan tanpa terhuyung-huyung?',
            'Anak bisa menumpuk empat buah kubus?',
            'Anak bisa memungut benda kecil dengan ibu jari dan jari telunjuk?',
            'Anak bisa menggelindingkan bola ke arah sasaran?',
            'Anak bisa menyebut tiga sampai enam kata yang mempunyai arti?',
            'Anak bisa membantu atau menirukan pekerjaan rumah tangga?',
            'Anak bisa memegang cangkir sendiri dan belajar makan-minum sendiri?',
        ]),stimulasi:['Ajak anak bicara, bertanya, bercerita, dan mengikuti perintah sederhana.','Latih merapikan mainan serta makan bersama menggunakan sendok.','Bermain balok, puzzle, menggambar, dan bola sambil didampingi.'] },
    { id:'2-3t',label:'2–3 tahun',jenis:'perkembangan',mulaiBulan:24,sebelumBulan:36,halaman:'79',halamanPdf:41,
        pertanyaan:butir('2t3t',[
            'Anak bisa jalan naik tangga sendiri?',
            'Anak bisa bermain dan menendang bola kecil?',
            'Anak bisa mencoret-coret pensil pada kertas?',
            'Anak bisa bicara dengan baik menggunakan dua kata?',
            'Anak bisa menunjuk satu atau lebih bagian tubuhnya ketika diminta?',
            'Anak bisa melihat gambar dan menyebut dengan benar nama dua benda atau lebih?',
            'Anak bisa membantu memungut mainannya sendiri atau membantu mengangkat piring jika diminta?',
            'Anak bisa makan nasi sendiri tanpa banyak tumpah?',
            'Anak bisa melepas pakaiannya sendiri?',
        ]),stimulasi:['Bacakan cerita, ajak tanya jawab, serta sebutkan nama dan kegunaan benda.','Ajak menyusun balok, memasang puzzle, menggambar, dan mengelompokkan benda.','Dampingi latihan cuci tangan, berpakaian, merapikan mainan, dan bermain bola.'] },
    { id:'3-4t',label:'3–4 tahun',jenis:'perkembangan',mulaiBulan:36,sebelumBulan:48,halaman:'81',halamanPdf:42,
        pertanyaan:butir('3t4t',[
            'Anak bisa berdiri dengan satu kaki selama dua detik?',
            'Anak bisa melompat dengan kedua kaki diangkat?',
            'Anak bisa mengayuh sepeda roda tiga?',
            'Anak bisa menggambar garis lurus?',
            'Anak bisa menumpuk delapan buah kubus?',
            'Anak bisa mengenal dua sampai empat warna?',
            'Anak bisa menyebut nama, umur, dan tempat?',
            'Anak bisa mengerti arti kata di atas, di bawah, dan di depan?',
            'Anak bisa mendengarkan cerita?',
            'Anak bisa mencuci dan mengeringkan tangan sendiri?',
            'Anak bermain bersama teman dan mengikuti aturan permainan?',
            'Anak bisa mengenakan sepatu sendiri?',
            'Anak bisa mengenakan celana panjang, kemeja, atau baju?',
        ]),stimulasi:['Bacakan cerita dan ajak anak menceritakan pengalamannya.','Bermain puzzle, menggambar, mencocokkan benda, dan menghitung.','Latih merawat diri, merapikan mainan, dan mengikuti aturan bermain dengan pendampingan.'] },
    { id:'4-5t',label:'4–5 tahun',jenis:'perkembangan',mulaiBulan:48,sebelumBulan:60,halaman:'82',halamanPdf:43,
        pertanyaan:butir('4t5t',[
            'Anak bisa berdiri dengan satu kaki selama enam detik?',
            'Anak bisa melompat-lompat dengan satu kaki?',
            'Anak bisa menari?',
            'Anak bisa menggambar tanda silang?',
            'Anak bisa menggambar lingkaran?',
            'Anak bisa menggambar orang dengan tiga bagian tubuh?',
            'Anak bisa mengancing baju atau pakaian boneka?',
            'Anak bisa menyebut nama lengkap tanpa dibantu?',
            'Anak senang menyebut kata-kata baru?',
            'Anak senang bertanya tentang sesuatu?',
            'Anak bisa menjawab pertanyaan dengan kata-kata yang benar?',
            'Anak bisa bicara dengan mudah dimengerti?',
            'Anak bisa membandingkan atau membedakan sesuatu dari ukuran dan bentuknya?',
            'Anak bisa menyebut angka dan menghitung jari?',
        ]),stimulasi:['Bermain peran dan ajak anak bercerita tentang pengalamannya.','Ajak menggambar orang, mengenal huruf, nama hari, dan angka berurutan.','Latih mengikuti aturan permainan, memakai pakaian, dan menyikat gigi dengan pendampingan.'] },
    { id:'5-6t',label:'5–6 tahun',jenis:'perkembangan',mulaiBulan:60,sebelumBulan:72,halaman:'83',halamanPdf:43,
        pertanyaan:butir('5t6t',[
            'Anak bisa berjalan lurus?',
            'Anak bisa berdiri dengan satu kaki selama sebelas detik?',
            'Anak bisa menggambar dengan enam bagian dan menggambar orang lengkap?',
            'Anak bisa menangkap bola kecil dengan kedua tangan?',
            'Anak bisa menggambar segi empat?',
            'Anak bisa mengerti arti lawan kata?',
            'Anak bisa mengerti pembicaraan yang menggunakan tujuh kata atau lebih?',
            'Anak bisa menjawab pertanyaan tentang bahan dan kegunaan suatu benda?',
            'Anak bisa mengenal angka dan menghitung angka lima sampai sepuluh?',
            'Anak bisa mengenal warna-warni?',
            'Anak bisa mengungkapkan simpati?',
            'Anak bisa mengikuti aturan permainan?',
            'Anak bisa berpakaian sendiri tanpa dibantu?',
        ]),stimulasi:['Bacakan buku, ajak tanya jawab, bercerita, serta mengenal nama dan fungsi benda.','Ajak menggambar, mewarnai, menulis nama, mengenal angka, huruf, hari, dan tanggal.','Dampingi permainan bola, puzzle, dan permainan peran yang melatih aturan serta urutan.'] },
];

export function panduanMakanKia(umurBulan: number) {
    if (umurBulan < 6) return { halaman:'38',halamanPdf:21,isi:[
        'Berikan ASI saja sampai usia 6 bulan; tambahan lain mengikuti anjuran tenaga kesehatan.',
        'Susui sesuai kebutuhan bayi. Bila ada kendala menyusui, temui tenaga kesehatan atau konselor menyusui.',
        'Pantau berat, panjang badan, dan perkembangan bayi setiap bulan.',
    ]};
    if (umurBulan < 9) return { halaman:'56–59',halamanPdf:30,isi:[
        'Mulai MPASI sejak usia 6 bulan sambil melanjutkan ASI. Berikan makanan lumat dan kental.',
        'Berikan 2–3 kali makan utama dan 1–2 kali selingan setiap hari sesuai panduan Buku KIA.',
        'Utamakan protein hewani, variasikan makanan, dan jaga kebersihan makanan serta peralatannya.',
    ]};
    if (umurBulan < 12) return { halaman:'58–59',halamanPdf:31,isi:[
        'Lanjutkan ASI dan berikan MPASI dengan tekstur dicincang; perhatikan respons anak saat makan.',
        'Berikan 3–4 kali makan utama dan 1–2 kali selingan setiap hari sesuai panduan Buku KIA.',
        'Variasikan makanan dengan protein hewani, makanan pokok, sayur, dan buah.',
    ]};
    if (umurBulan < 24) return { halaman:'58, 64–65',halamanPdf:34,isi:[
        'Berikan makanan keluarga yang bervariasi sesuai kemampuan makan anak dan lanjutkan ASI hingga 2 tahun atau lebih.',
        'Berikan 3–4 kali makan utama dan 1–2 kali selingan; sertakan sumber protein hewani.',
        'Ajak anak belajar makan sendiri; ciptakan suasana makan yang tenang tanpa menonton layar.',
    ]};
    return { halaman:'78',halamanPdf:41,isi:[
        'Biasakan makan utama 3 kali sehari bersama keluarga dengan makanan yang bervariasi.',
        'Lengkapi dengan protein hewani dan nabati, sayur, buah, serta air putih sesuai kebutuhan.',
        'Batasi selingan yang terlalu manis, asin, atau berlemak; biasakan aktivitas fisik dan cuci tangan.',
    ]};
}
