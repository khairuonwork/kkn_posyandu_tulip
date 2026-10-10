/**
 * Kotak pilihan dengan panah yang sama dengan pilihan RT di bilah saringan
 * Data Balita. Panah bawaan peramban berbeda di tiap perangkat dan lebih kecil.
 */

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export default function Pilih({
    id,
    value,
    onChange,
    disabled = false,
    className = '',
    children,
}: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    /** Kelas tambahan untuk <select>, mis. `font-semibold`. */
    className?: string;
    children: ReactNode;
}) {
    return (
        <span className="relative block">
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={`isian w-full cursor-pointer appearance-none pr-11 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            >
                {children}
            </select>
            <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2.5}
                aria-hidden="true"
            />
        </span>
    );
}
