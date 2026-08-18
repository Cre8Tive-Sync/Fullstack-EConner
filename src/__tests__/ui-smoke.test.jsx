import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LocationProvider } from '../hooks/useUserLocation'
import { PlacesProvider } from '../hooks/usePlaces'
import HomePage from '../pages/HomePage'
import PlacesPage from '../pages/PlacesPage'
import MapPage from '../pages/MapPage'
import PlaceDetailPage from '../pages/PlaceDetailPage'
import MediaViewer from '../components/ui/MediaViewer'
import { POIS } from '../components/ar/data/pois'

let container
let root

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}

  // jsdom performs no layout, so give the map a viewport to project into.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 390 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 700 })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
})

async function render(ui, path = '/') {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <LocationProvider>
          <PlacesProvider>{ui}</PlacesProvider>
        </LocationProvider>
      </MemoryRouter>
    )
  })

  return container
}

describe('generic UI', () => {
  it('renders the home screen with categories and destinations', async () => {
    const el = await render(<HomePage />)

    expect(el.textContent).toContain('Discover Conner')
    expect(el.textContent).toContain('Tourist Spots')
    expect(el.querySelectorAll('.cat-tile').length).toBeGreaterThan(4)
    expect(el.querySelectorAll('.rail-card').length).toBeGreaterThan(0)
    expect(el.querySelector('.nav')).toBeTruthy()
  })

  it('lists and filters places from the URL', async () => {
    const el = await render(<PlacesPage />, '/places?category=farms')

    const cards = el.querySelectorAll('.place-card')
    expect(cards.length).toBeGreaterThan(0)
    expect(el.textContent).toContain('Farms')
  })

  it('renders map tiles and a marker per destination', async () => {
    const el = await render(<MapPage />, '/map')

    expect(el.querySelector('.map')).toBeTruthy()
    expect(el.querySelectorAll('.map__tile').length).toBeGreaterThan(0)
    expect(el.querySelectorAll('.map__marker').length).toBeGreaterThan(0)
    expect(el.querySelector('.map__attrib')).toBeTruthy()

    // Every destination should sit inside the framed viewport
    for (const marker of el.querySelectorAll('.map__marker')) {
      const left = Number.parseFloat(marker.style.left)
      const top = Number.parseFloat(marker.style.top)
      expect(left).toBeGreaterThan(-80)
      expect(left).toBeLessThan(470)
      expect(top).toBeGreaterThan(-80)
      expect(top).toBeLessThan(780)
    }
  })

  it('renders a place detail page for a real slug', async () => {
    const place = POIS.find((poi) => poi.images?.length > 0)

    const el = await render(
      <Routes>
        <Route path="/place/:slug" element={<PlaceDetailPage />} />
      </Routes>,
      `/place/${place.slug}`
    )

    expect(el.textContent).toContain(place.name)
    expect(el.querySelector('.detail__hero img')).toBeTruthy()
    expect(el.querySelectorAll('.gallery__cell').length).toBeGreaterThan(0)
  })

  it('shows images full size in the media viewer', async () => {
    const items = [
      { type: 'image', src: '/img/a.jpg' },
      { type: 'image', src: '/img/b.jpg' },
      { type: 'video', src: '/video.mp4', kind: 'file', poster: '/img/a.jpg' },
    ]

    const el = await render(<MediaViewer items={items} title="Test place" onClose={() => {}} />)

    expect(el.querySelector('.viewer__media').getAttribute('src')).toBe('/img/a.jpg')
    expect(el.textContent).toContain('1 / 3')
    expect(el.querySelectorAll('.viewer__thumb').length).toBe(3)

    await act(async () => {
      el.querySelector('.viewer__arrow--next').click()
    })

    expect(el.querySelector('.viewer__media').getAttribute('src')).toBe('/img/b.jpg')
  })
})
