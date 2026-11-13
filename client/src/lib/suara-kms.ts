const angka = [
    'nol',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
];

export function terbilang(n: number): string {
    if (n < 10) {
        return angka[n];
    }

    if (n === 10) {
        return 'sepuluh';
    }

    if (n === 11) {
        return 'sebelas';
    }

    if (n < 20) {
        return `${angka[n - 10]} belas`;
    }

    const bagian = [
        [1_000_000_000, 'miliar'],
        [1_000_000, 'juta'],
        [1000, 'ribu'],
        [100, 'ratus'],
        [10, 'puluh'],
    ] as const;

    for (const [nilai, satuan] of bagian) {
        if (n < nilai) {
            continue;
        }

        const depan = Math.floor(n / nilai);
        const awal =
            depan === 1 && (nilai === 100 || nilai === 1000)
                ? `se${satuan}`
                : `${terbilang(depan)} ${satuan}`;

        return n % nilai ? `${awal} ${terbilang(n % nilai)}` : awal;
    }

    return String(n);
}

export function bagianPanggilan(nomor: number, meja: number) {
    return [
        'nomor-antrean',
        ...terbilang(nomor).split(' '),
        'silakan-menuju-meja-kms',
        ...terbilang(meja).split(' '),
    ];
}

export function teksPanggilan(nomor: number, meja: number, nama?: string | null) {
    const namaBalita = nama?.trim();

    return `Nomor antrean ${terbilang(nomor)}, ${namaBalita ? `${namaBalita}, ` : ''}silakan menuju Meja KMS ${terbilang(meja)}.`;
}

export function suaraIndonesiaLokal(daftar: SpeechSynthesisVoice[]) {
    const indonesia = daftar.filter(
        (suara) => suara.localService && /^id(?:-|$)/i.test(suara.lang),
    );

    return (
        indonesia.find((suara) => /andika/i.test(suara.name)) ?? indonesia[0]
    );
}

export function suaraIndonesia(daftar: SpeechSynthesisVoice[]) {
    return daftar.filter((suara) => /^id(?:-|$)/i.test(suara.lang));
}

export function idSuara(suara: SpeechSynthesisVoice) {
    return JSON.stringify([suara.voiceURI, suara.lang, suara.name]);
}

export function pilihSuara(daftar: SpeechSynthesisVoice[], tersimpan: string | null) {
    const tersedia = suaraIndonesia(daftar);
    const pilihan = tersedia.find((suara) => idSuara(suara) === tersimpan);

    return {
        tersedia,
        pilihan: pilihan ?? suaraIndonesiaLokal(tersedia),
        tidakTersedia: tersimpan !== null && daftar.length > 0 && !pilihan,
    };
}
