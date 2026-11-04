import { useEffect, useState } from 'react';

export function useKehadiran<T>(nilai: T | null) {
    const [tampil, setTampil] = useState(nilai);

    useEffect(() => {
        if (nilai !== null) {
            // Retain the last mounted panel until its exit transition finishes.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTampil(nilai);

            return;
        }

        const waktu = window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 0
            : 180;
        const timer = window.setTimeout(() => setTampil(null), waktu);

        return () => window.clearTimeout(timer);
    }, [nilai]);

    return { tampil: nilai ?? tampil, menutup: nilai === null };
}
