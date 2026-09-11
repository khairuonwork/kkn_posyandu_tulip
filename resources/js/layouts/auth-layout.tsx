/**
 * Sejak dasar halaman menjadi #EDEFEA, varian `simple` membuat formulir masuk
 * berdiri langsung di atas abu tanpa kartu sama sekali. Varian `card` sudah ada
 * di repo dan tidak dipakai siapa pun - ia yang dipakai sekarang. `rounded-xl`
 * di dalamnya sudah bernilai 20px lewat --radius-xl.
 */
import AuthLayoutTemplate from '@/layouts/auth/auth-card-layout';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description}>
            {children}
        </AuthLayoutTemplate>
    );
}
