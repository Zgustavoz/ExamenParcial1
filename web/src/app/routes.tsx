import type { RouteObject } from 'react-router-dom'
import { HomeRedirect, RedirectIfAuthenticated, RequireAuth, RequireRole } from '@/auth/guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFound } from '@/pages/NotFound'
import { Placeholder } from '@/pages/Placeholder'

/**
 * Mapa de rutas (sección 6 y 11.1). Cada pantalla se carga de forma diferida; las que faltan por implementar
 * usan `Placeholder`. Los roles de cada ruta siguen la tabla de autorización por CU.
 */
export const routes: RouteObject[] = [
  {
    element: <RedirectIfAuthenticated />,
    children: [
      {
        path: '/login',
        lazy: async () => ({ Component: (await import('@/pages/auth/LoginPage')).default }),
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        element: <AppLayout />,
        children: [
          {
            element: <RequireRole roles={['SOFTWARE_ADMIN']} />,
            children: [
              {
                path: '/admin/companies',
                lazy: async () => ({ Component: (await import('@/pages/admin/CompaniesPage')).default }),
              },
            ],
          },
          {
            element: <RequireRole roles={['COMPANY_ADMIN']} />,
            children: [
              {
                path: '/company/users',
                lazy: async () => ({ Component: (await import('@/pages/company/UsersPage')).default }),
              },
            ],
          },
          {
            element: <RequireRole roles={['COMPANY_ADMIN', 'DESIGNER', 'DEVELOPER']} />,
            children: [
              {
                path: '/projects',
                lazy: async () => ({ Component: (await import('@/pages/projects/ProjectsPage')).default }),
              },
              {
                path: '/projects/:projectId',
                lazy: async () => ({ Component: (await import('@/pages/projects/ProjectDiagramsPage')).default }),
              },
              { path: '/diagrams/:diagramId', element: <Placeholder title="Editor de diagrama" cu="CU-07…10" /> },
              {
                path: '/diagrams/:diagramId/view',
                lazy: async () => ({ Component: (await import('@/pages/diagrams/DiagramViewerPage')).default }),
              },
            ],
          },
          {
            path: '/notifications',
            element: <Placeholder title="Notificaciones" cu="CU-19" />,
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
