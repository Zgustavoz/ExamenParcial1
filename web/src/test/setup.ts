import '@testing-library/jest-dom/vitest'

// jsdom no implementa estas API del navegador, de las que dependen los componentes de Radix (diálogos,
// checkbox, select…). Sin ellas el componente lanza al montarse, aunque en el navegador funcione.
class ResizeObserverStub implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
