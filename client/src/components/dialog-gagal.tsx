import { CircleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export default function DialogGagal({
    judul = 'Proses belum berhasil',
    pesan,
    onTutup,
    onCobaLagi,
    animasiPesan = false,
    animasiDialog = false,
}: {
    judul?: string;
    pesan: string;
    onTutup: () => void;
    onCobaLagi?: () => void;
    animasiPesan?: boolean;
    animasiDialog?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [menutup, setMenutup] = useState(false);
    const tutup = () => {
        if (!animasiDialog || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            onTutup();
        } else if (timer.current === null) {
            setMenutup(true);
            timer.current = setTimeout(onTutup, 210);
        }
    };
    const id = useId();
    useEffect(() => {
        const fokus = document.activeElement as HTMLElement | null;
        const dialog = ref.current;
        dialog?.showModal();

        return () => {
            if (timer.current !== null) {
clearTimeout(timer.current);
}

            dialog?.close();

            if (fokus?.isConnected) {
                fokus.focus();
            }
        };
    }, []);

    return (
        <dialog
            ref={ref}
            aria-labelledby={`${id}-judul`}
            aria-describedby={`${id}-pesan`}
            onCancel={(event) => {
                event.preventDefault();
                tutup();
            }}
            className={`m-auto max-h-[calc(100dvh-2rem)] w-[420px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/30 backdrop:backdrop-blur-xs ${animasiDialog ? (menutup ? 'detail-dialog-keluar' : 'detail-dialog-masuk') : ''}`}
        >
            <div
                className={`state-halaman ${animasiPesan ? 'pesan-masuk' : ''}`}
            >
                <CircleAlert
                    className="size-10 text-tone-red"
                    aria-hidden="true"
                />
                <h2 id={`${id}-judul`} className="text-lg font-bold">
                    {judul}
                </h2>
                <p
                    id={`${id}-pesan`}
                    className="max-w-md text-sm text-muted-foreground"
                >
                    {pesan}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        autoFocus
                        className="tombol-kedua"
                        onClick={tutup}
                    >
                        Tutup
                    </button>
                    {onCobaLagi && (
                        <button
                            type="button"
                            className="tombol-utama"
                            onClick={onCobaLagi}
                        >
                            Coba lagi
                        </button>
                    )}
                </div>
            </div>
        </dialog>
    );
}
