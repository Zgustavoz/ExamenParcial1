import { Construction } from 'lucide-react'

/** Pantalla provisional de una ruta cuyo módulo todavía no se implementa. */
export function Placeholder({ title, cu }: { title: string; cu: string }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Construction className="size-8 text-primary" aria-hidden />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Pendiente de implementar ({cu}).</p>
    </section>
  )
}
