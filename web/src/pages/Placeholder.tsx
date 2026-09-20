import { Construction } from 'lucide-react'

/** Pantalla provisional de una ruta cuyo módulo todavía no se implementa. */
export function Placeholder({ title, cu }: { title: string; cu: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <Construction className="size-10 text-primary" aria-hidden />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Pendiente de implementar ({cu}).</p>
    </main>
  )
}
