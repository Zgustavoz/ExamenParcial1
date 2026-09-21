import { expect, test, type Page } from '@playwright/test'

/** Comprobación visual del tema oscuro: colores reales tomados del navegador. */
const PASSWORD = process.env.E2E_PASSWORD ?? ''
test.skip(!PASSWORD, 'Defina E2E_PASSWORD')

/** Claridad aproximada (0 negro, 1 blanco). El navegador devuelve unas veces rgb() y otras oklch(). */
const claridad = (color: string) => {
  const n = (color.match(/[\d.]+/g) ?? []).map(Number)
  if (color.startsWith('oklch')) return n[0]
  return (0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2]) / 255
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Empresa').fill('demo')
  await page.getByLabel('Usuario').fill('designer')
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Proyectos' })).toBeVisible()
}

test('el tema es oscuro y la navegación sigue funcionando', async ({ page }) => {
  await page.goto('/login')
  const fondoLogin = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const textoLogin = await page.evaluate(() => getComputedStyle(document.body).color)
  console.log('LOGIN fondo:', fondoLogin, '| texto:', textoLogin)
  expect(claridad(fondoLogin)).toBeLessThan(0.25)
  expect(claridad(textoLogin)).toBeGreaterThan(0.7)

  await login(page)

  const fondoApp = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  console.log('APP fondo:', fondoApp)
  expect(claridad(fondoApp)).toBeLessThan(0.25)

  // La barra lateral sustituye a la cabecera: la navegación sigue ahí, con los mismos destinos.
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav).toBeVisible()
  const enlaces = await nav.getByRole('link').allInnerTexts()
  console.log('NAV:', enlaces.join(' | '))

  await nav.getByRole('link', { name: 'Tareas' }).click()
  await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible()
  await nav.getByRole('link', { name: 'Notificaciones' }).click()
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()

  await page.screenshot({ path: 'test-results/tema-oscuro.png', fullPage: true })
})
