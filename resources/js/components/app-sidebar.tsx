import { Link, usePage } from '@inertiajs/react';
import { Baby, Calendar, FileText, House, Settings } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

/**
 * Sidebar Portal.
 *
 * Daftar nav ini kembaran dari `NAV` di demo/DemoApp.tsx, dan sengaja hidup
 * dua tempat selama demo masih berjalan: vite.demo.config.ts hanya mengalihkan
 * `@/lib/nav`, bukan cangkangnya. Saat demo/ dibuang (bagian 10 langkah 8),
 * berkas inilah yang tersisa.
 *
 * Alamatnya masih teks biasa. Wayfinder baru menghasilkan `@/routes/*` setelah
 * `php artisan` bisa dijalankan dan ketujuh controller ada (bagian 10); sampai
 * itu, menuliskannya sebagai helper hanya menambah impor yang tidak terpecahkan.
 */
export function AppSidebar() {
    const page = usePage();
    const dashboardUrl = page.props.currentTeam
        ? dashboard(page.props.currentTeam.slug)
        : '/';

    const mainNavItems: NavItem[] = [
        { title: 'Beranda', href: dashboardUrl, icon: House },
        { title: 'Data Anak', href: '/balita', icon: Baby },
        { title: 'Laporan', href: '/laporan', icon: FileText },
        { title: 'Pengaturan', href: '/pengaturan', icon: Settings },
        { title: 'Periode', href: '/periode', icon: Calendar },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            {/* Tautan Repository dan Documentation milik starter kit
                dibuang - keduanya menunjuk ke github.com/laravel dan
                laravel.com, bukan ke produk ini. TeamSwitcher juga dibuang:
                hanya ada satu Posyandu (ADR-0004, dan 05-uiux-spec.md
                bagian 4.4). */}
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
