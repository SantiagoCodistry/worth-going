import { useEffect } from 'react'
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PrefsProvider } from './lib/prefs.tsx'
import { Week } from './pages/Week.tsx'
import { Archive } from './pages/Archive.tsx'
import { Shortlist } from './pages/Shortlist.tsx'
import { SpotifyReturn } from './pages/SpotifyReturn.tsx'
import { Privacy, Terms } from './pages/Legal.tsx'

// `VITE_ROUTER=memory` is for sandboxed previews that can't use URL paths.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <PrefsProvider>
      <Router basename={import.meta.env.VITE_ROUTER === 'memory' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <ScrollTop />
        <Routes>
          <Route index element={<Week />} />
          <Route path="edition/:date" element={<Week />} />
          <Route path="editions" element={<Archive />} />
          <Route path="shortlist" element={<Shortlist />} />
          <Route path="spotify" element={<SpotifyReturn />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </PrefsProvider>
  )
}
