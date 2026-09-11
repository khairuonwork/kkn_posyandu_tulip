import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { index as teams } from '@/routes/teams';
import type { NavItem } from '@/types';

// Bahasa Indonesia sepenuhnya, prinsip P5 pada 05-uiux-spec.md bagian 1.
// Ini satu-satunya tempat di seluruh antarmuka yang masih berbahasa Inggris.
const sidebarNavItems: NavItem[] = [
    { title: 'Profil', href: edit(), icon: null },
    { title: 'Keamanan', href: editSecurity(), icon: null },
    { title: 'Tim', href: teams(), icon: null },
    { title: 'Tampilan', href: editAppearance(), icon: null },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6 sm:px-7 sm:py-7">
            <Heading
                title="Pengaturan akun"
                description="Kelola profil, keamanan, dan tampilan akun Anda."
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        className="flex flex-col space-y-1 space-x-0"
                        aria-label="Pengaturan akun"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': isCurrentOrParentUrl(item.href),
                                })}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                {/* Isi berdiri di atas kartu putih. Tanpa ini formulirnya
                    melayang langsung di atas dasar abu, sama seperti halaman
                    auth sebelum dialihkan ke varian kartu. */}
                <div className="flex-1 md:max-w-2xl">
                    <section className="kartu max-w-xl space-y-12 p-5 sm:p-6">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
