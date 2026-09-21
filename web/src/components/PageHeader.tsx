import type { ReactNode } from 'react'

/** Encabezado común de las pantallas: título, una línea de contexto y las acciones principales. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-5">
      <div className="border-l-2 border-primary pl-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}
