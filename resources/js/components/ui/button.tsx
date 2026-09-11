import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Skala Prototipe v2: tinggi 52px, radius 14px (--radius-lg), teks 18px.
 *
 * Naik dari h-9/rounded-md/text-sm bawaan shadcn. Aman terhadap enam layar
 * Posyandu: satu-satunya primitif yang mereka impor adalah ui/table.
 *
 * ponytail: dua sumber untuk satu geometri tombol - kelas .tombol-utama dan
 * .tombol-kedua di app.css, dan varian di sini. Satukan saat halaman Posyandu
 * dipindah ke primitif ini, bukan sebelumnya.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-bold transition-[color,box-shadow,background-color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(15,110,68,0.18)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-border-strong bg-card font-semibold hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // 52px, target sentuh Portal (05-uiux-spec.md bagian 2.5).
        default: "min-h-13 px-4.5 py-2 has-[>svg]:px-4",
        // Disisakan untuk tempat sempit, mis. sub-nav Pengaturan.
        sm: "min-h-11 rounded-md px-3.5 text-sm has-[>svg]:px-3",
        lg: "min-h-14 px-7 text-lg has-[>svg]:px-5",
        icon: "size-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
