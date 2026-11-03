import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import type { StatusSasaran } from '@/lib/sasaran';
import { LABEL_STATUS } from './tipe';

export function DialogEditSasaran({
    editId,
    setEditId,
    editStatus,
    setEditStatus,
    editCatatan,
    setEditCatatan,
    simpanEdit,
    menyimpanEdit,
}: {
    editId: number | null;
    setEditId: (id: number | null) => void;
    editStatus: StatusSasaran;
    setEditStatus: (status: StatusSasaran) => void;
    editCatatan: string;
    setEditCatatan: (catatan: string) => void;
    simpanEdit: () => void | Promise<void>;
    menyimpanEdit: boolean;
}) {
    if (editId === null) {
        return null;
    }

    return (
        <div className="border-t border-border bg-surface-subtle/60 p-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Edit status sasaran</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Perubahan hanya berlaku untuk daftar periode ini, bukan
                        profil anak.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setEditId(null)}
                    className="tombol-kedua min-h-9 px-3"
                >
                    <X className="size-4" aria-hidden="true" /> Batal
                </button>
            </div>
            <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end">
                <label className="text-sm font-semibold">
                    Status
                    <select
                        value={editStatus}
                        onChange={(event) =>
                            setEditStatus(
                                event.target.value as StatusSasaran,
                            )
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-base"
                    >
                        {(Object.keys(LABEL_STATUS) as StatusSasaran[]).map(
                            (status) => (
                                <option key={status} value={status}>
                                    {LABEL_STATUS[status]}
                                </option>
                            ),
                        )}
                    </select>
                </label>
                <label className="text-sm font-semibold">
                    Catatan{' '}
                    <span className="font-normal text-muted-foreground">
                        (opsional)
                    </span>
                    <input
                        value={editCatatan}
                        maxLength={500}
                        onChange={(event) =>
                            setEditCatatan(event.target.value)
                        }
                        placeholder="Contoh: orang tua tidak hadir"
                        className="mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-base"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => void simpanEdit()}
                    disabled={menyimpanEdit}
                    className="tombol-utama"
                >
                    {menyimpanEdit ? (
                        <RefreshCw
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                    )}
                    Simpan
                </button>
            </div>
        </div>
    );
}
