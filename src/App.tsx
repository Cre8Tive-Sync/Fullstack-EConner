import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ARScene from './components/ar/ARScene'
import DownloadPage from './pages/DownloadPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ARScene />} />
        <Route path="/downloads" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  )
}
