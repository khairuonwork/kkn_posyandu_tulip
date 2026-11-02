import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

export default function Bantuan({ children }: { children: ReactNode }) {
    return (
        <details className="bantuan-kader">
            <summary className="inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-card px-4 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2">
                <CircleHelp className="size-4" aria-hidden="true" />
                Bantuan
            </summary>
            <div className="mt-3">{children}</div>
        </details>
    );
}
