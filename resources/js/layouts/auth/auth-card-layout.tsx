import { Link, usePage } from '@inertiajs/react';
import { HeartPulse } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    const { name } = usePage().props;

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                {/* Tanda produk yang sama dengan layar Masuk yang dirancang di
                    bagian 6.1: HeartPulse hijau dan namanya ditulis lengkap.
                    Lambang Laravel dibuang - ia menamai kerangka, bukan produk,
                    dan ikon sendirian melanggar P1. */}
                <Link
                    href={home()}
                    className="flex items-center justify-center gap-3 self-center"
                >
                    <HeartPulse
                        className="size-7 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <span className="text-lg font-extrabold">{name}</span>
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl font-extrabold">
                                {title}
                            </CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
