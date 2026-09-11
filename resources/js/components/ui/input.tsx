import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Sama persis dengan kelas .isian di app.css: tinggi 52, garis 2px,
        // radius 14, latar --surface. Teks tidak mengecil di layar lebar -
        // bagian 2.4 menetapkan 16px sebagai batas terkecil, dan `md:text-sm`
        // bawaan shadcn justru menurunkannya di desktop.
        "border-border file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-13 w-full min-w-0 rounded-lg border-2 bg-surface px-3.5 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-9 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
