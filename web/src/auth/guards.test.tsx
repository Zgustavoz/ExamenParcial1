import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { Role, User } from '@/lib/api/types'
import { useAuthStore } from '@/stores/auth-store'

function userWith(...roles: Role[]): User {
  return {
    id: 'u1',
    username: 'x',
    email: 'x@demo.com',
    fullName: null,
    roles,
    companyId: 'c1',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('guardas de ruta', () => {
  afterEach(() => useAuthStore.getState().logout())

  it('sin sesión, cualquier ruta protegida lleva al login', () => {
    renderAt('/projects')
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it.each([
    ['SOFTWARE_ADMIN', '/', 'Empresas'],
    ['COMPANY_ADMIN', '/admin/companies', 'Usuarios de la empresa'],
    ['DESIGNER', '/company/users', 'Proyectos'],
    ['DEVELOPER', '/admin/companies', 'Proyectos'],
  ] as const)('%s que entra a %s termina en «%s»', (role, path, heading) => {
    useAuthStore.getState().login('t', userWith(role))
    renderAt(path)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('con sesión, el login redirige a la pantalla del rol', () => {
    useAuthStore.getState().login('t', userWith('COMPANY_ADMIN'))
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Usuarios de la empresa' })).toBeInTheDocument()
  })
})
