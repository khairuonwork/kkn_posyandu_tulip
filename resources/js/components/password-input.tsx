import { Eye, EyeOff } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function PasswordInput({
    className,
    ref,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & { ref?: Ref<HTMLInputElement> }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <Input
                type={showPassword ? 'text' : 'password'}
                className={cn('pr-13', className)}
                ref={ref}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                // Petak 52px, sama dengan tinggi kotaknya (Prototipe v2).
                className="absolute top-1/2 right-0 flex size-13 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                aria-label={
                    showPassword
                        ? 'Sembunyikan kata sandi'
                        : 'Tampilkan kata sandi'
                }
                tabIndex={-1}
            >
                {showPassword ? (
                    <EyeOff className="size-5" strokeWidth={2.5} />
                ) : (
                    <Eye className="size-5" strokeWidth={2.5} />
                )}
            </button>
        </div>
    );
}
