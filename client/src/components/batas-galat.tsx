import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { gagal: boolean };

/** Menjaga kesalahan render React agar tidak berubah menjadi halaman kosong. */
export default class BatasGalat extends Component<Props, State> {
    state: State = { gagal: false };

    static getDerivedStateFromError(): State {
        return { gagal: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(
            'SIMPATIK gagal merender halaman.',
            error,
            info.componentStack,
        );
    }

    render() {
        if (!this.state.gagal) {
return this.props.children;
}

        return (
            <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
                <section
                    role="alert"
                    className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9"
                >
                    <h1 className="text-2xl font-extrabold">
                        Halaman belum dapat ditampilkan
                    </h1>
                    <p className="mt-3 text-base text-muted-foreground">
                        Terjadi kendala saat aplikasi menyiapkan halaman. Muat
                        ulang untuk mencoba lagi; bila masih terjadi, sampaikan
                        waktu kejadian kepada admin.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="tombol-utama mt-6"
                    >
                        Muat ulang halaman
                    </button>
                </section>
            </main>
        );
    }
}
