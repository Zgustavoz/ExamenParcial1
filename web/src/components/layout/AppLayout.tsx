import { Bell, Boxes, Building2, FolderKanban, ListChecks, LogOut, Users } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Role } from '@/lib/api/types'
import { disablePush, listenForeground, refreshPushToken } from '@/lib/push/push'
import { queryClient } from '@/lib/query-client'
import { cn } from '@/lib/utils'
import { useOfflineSync } from '@/lib/offline/use-offline-queue'
import { useAuthStore } from '@/stores/auth-store'

interface NavItem {
  to: string
  label: string
  icon: typeof Building2
  roles: readonly Role[]
}

/** Cada enlace se muestra solo a los roles que pueden usar esa pantalla (tabla de autorización por CU). */
const NAV: NavItem[] = [
  { to: '/admin/companies', label: 'Empresas', icon: Building2, roles: ['SOFTWARE_ADMIN'] },
  { to: '/company/users', label: 'Usuarios', icon: Users, roles: ['COMPANY_ADMIN'] },
  {
    to: '/projects',
    label: 'Proyectos',
    icon: FolderKanban,
    roles: ['COMPANY_ADMIN', 'DESIGNER', 'DEVELOPER'],
  },
  {
    to: '/tasks',
    label: 'Tareas',
    icon: ListChecks,
    roles: ['COMPANY_ADMIN', 'DESIGNER', 'DEVELOPER'],
  },
  {
    to: '/notifications',
    label: 'Notificaciones',
    icon: Bell,
    roles: ['SOFTWARE_ADMIN', 'COMPANY_ADMIN', 'DESIGNER', 'DEVELOPER'],
  },
]

const ROLE_LABEL: Record<Role, string> = {
  SOFTWARE_ADMIN: 'Administrador de la plataforma',
  COMPANY_ADMIN: 'Administrador de empresa',
  DESIGNER: 'Diseñador',
  DEVELOPER: 'Desarrollador',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

/** Marco común de las pantallas con sesión iniciada: cabecera, navegación por rol y menú de usuario. */
export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const userId = user?.id

  // Modo offline del Copilot: envía solas las instrucciones guardadas cuando vuelve la conexión.
  useOfflineSync()

  // Push web (CU-19): renueva el token si el usuario ya dio permiso y muestra los avisos que llegan con la
  // pestaña en primer plano. Sin configuración de Firebase no hace nada.
  useEffect(() => {
    if (!userId) return
    void refreshPushToken()
    let stop = () => {}
    let cancelled = false
    void listenForeground((notification) => {
      toast(notification.title, { description: notification.body })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe()
      else stop = unsubscribe
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [userId])

  if (!user) return null

  const items = NAV.filter((item) => user.roles.some((role) => item.roles.includes(role)))
  const displayName = user.fullName ?? user.username

  const signOut = () => {
    void disablePush() // que la cuenta anterior no siga recibiendo avisos en este navegador
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-background">
      {/*
        Una sola barra: columna fija a la izquierda en pantallas anchas y cinta horizontal en las
        estrechas. El menú de usuario se coloca solo (al final de la fila o abajo del todo), así que
        existe una única vez en la página.
      */}
      <aside
        className={cn(
          'flex items-center gap-2 border-b border-border/60 bg-sidebar px-3 py-2',
          'lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:w-60 lg:flex-col lg:items-stretch lg:gap-0',
          'lg:border-r lg:border-b-0 lg:p-0',
        )}
      >
        <div className="flex shrink-0 items-center gap-2.5 lg:px-5 lg:py-4">
          <span className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <Boxes className="size-5" aria-hidden />
          </span>
          <span className="hidden font-heading text-sm leading-tight font-semibold tracking-tight sm:block">
            Diagramas
            <span className="block text-[11px] font-normal tracking-widest text-muted-foreground uppercase">
              UML Studio
            </span>
          </span>
        </div>

        <nav
          aria-label="Principal"
          className="flex flex-1 gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-3"
        >
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2 text-sm',
                  'text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
                  isActive && 'bg-accent font-medium text-accent-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Marca de la sección activa: un filo, no un relleno. */}
                  <span
                    className={cn(
                      'absolute left-0 h-5 w-0.5 rounded-full bg-primary transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <Icon className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 lg:border-t lg:border-border/60 lg:p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2.5 px-2" aria-label="Menú de usuario">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-xs font-semibold text-primary">
                  {initials(displayName)}
                </span>
                <span className="hidden truncate text-sm sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block font-medium">{displayName}</span>
                <span className="block text-xs text-muted-foreground">{user.email}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {user.roles.map((role) => ROLE_LABEL[role]).join(' · ')}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut className="size-4" aria-hidden />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="px-5 py-8 lg:ml-60 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
