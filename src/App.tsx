import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LocationProvider } from './hooks/useUserLocation'
import { PlacesProvider } from './hooks/usePlaces'
import HomePage from './pages/HomePage'
import PlacesPage from './pages/PlacesPage'
import MapPage from './pages/MapPage'
import PlaceDetailPage from './pages/PlaceDetailPage'
import DownloadPage from './pages/DownloadPage'

// AR is a self-contained feature and drags in three.js / AR.js, so it is only
// downloaded when someone actually opens the AR route.
const ARPage = lazy(() => import('./pages/ARPage'))

function ARLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        background: '#06080b',
        color: 'rgba(255,255,255,0.6)',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.85rem',
      }}
    >
      <span className="spinner" />
      Loading AR…
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LocationProvider>
        <PlacesProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/places" element={<PlacesPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/place/:slug" element={<PlaceDetailPage />} />
            <Route
              path="/ar"
              element={
                <Suspense fallback={<ARLoading />}>
                  <ARPage />
                </Suspense>
              }
            />
            <Route path="/downloads" element={<DownloadPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PlacesProvider>
      </LocationProvider>
    </BrowserRouter>
  )
}
