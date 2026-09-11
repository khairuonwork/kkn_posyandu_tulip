/**
 * Masuk — Fortify.
 *
 * Tampilan mengikuti Prototipe v2 lewat primitifnya: Input, Label, dan Button
 * di components/ui/** sudah berskala 52 px, radius 14 px, teks 18 px. Yang
 * diperbaiki di sini hanya yang tidak ikut token: bahasanya, dan dua pesan
 * yang dulu memakai warna Tailwind mentah alih-alih nada keparahan bagian 2.3.
 *
 * Layar Masuk yang dirancang penuh ada di demo/Login.tsx (bagian 6.1); ia
 * memilih peran, yang di sini datang dari basis data. Karena itu kedua berkas
 * berbagi bahasa dan bentuk, bukan tata letaknya.
 */

import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TeamInvitationAlert from '@/components/team-invitation-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { TeamInvitationContext } from '@/types';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    teamInvitation?: TeamInvitationContext | null;
};

export default function Login({
    status,
    canResetPassword,
    teamInvitation,
}: Props) {
    return (
        <>
            <Head title="Masuk" />

            {teamInvitation && (
                /* Bahasanya masih Inggris: `action` bertipe literal dan
                   dipakai bersama halaman Daftar. Alur undangan tim sendiri
                   di luar produk ini — hanya ada satu Posyandu (ADR-0004). */
                <TeamInvitationAlert
                    invitation={teamInvitation}
                    action="Log in"
                />
            )}

            <PasskeyVerify />

            {/* Kabar hasil tindakan sebelumnya — mis. tautan atur ulang sudah
                dikirim. Dulu ia dirender di kaki halaman, di bawah tautan
                Daftar: jawaban atas sesuatu yang baru saja dilakukan pengguna,
                dicetak di tempat terakhir yang ia lihat. */}
            {status && (
                <div
                    role="status"
                    className="mb-6 rounded-lg border border-tone-green bg-tone-green-bg px-4 py-3 text-sm font-semibold text-tone-green"
                >
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="nama@posyandutulip.id"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1.5">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Kata sandi</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Lupa kata sandi?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-foreground"
                                >
                                    Ingat saya di perangkat ini
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Masuk
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Belum punya akun?{' '}
                            <TextLink
                                href={register({
                                    query: {
                                        invitation: teamInvitation?.code,
                                    },
                                })}
                                data-test="register-link"
                                tabIndex={5}
                            >
                                Daftar
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Masuk',
    description: 'Masukkan email dan kata sandi Anda.',
};
