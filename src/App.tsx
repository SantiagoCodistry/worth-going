import { BrowserRouter, Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store.tsx'
import { Layout } from './components/Layout.tsx'
import { About } from './pages/About.tsx'
import { Account } from './pages/Account.tsx'
import { Privacy, Terms } from './pages/Legal.tsx'
import { EventPage } from './pages/EventPage.tsx'
import { Explore } from './pages/Explore.tsx'
import { Home } from './pages/Home.tsx'
import { Saved } from './pages/Saved.tsx'
import { SharedList } from './pages/SharedList.tsx'
import { PlacePage, Table } from './pages/Table.tsx'
import { You } from './pages/You.tsx'

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-[20px] font-medium">Page not found.</p>
      <Link to="/" className="btn btn-quiet mt-6">
        Go to the home page
      </Link>
    </div>
  )
}

// `VITE_ROUTER=memory` is for sandboxed previews that can't use URL paths.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter

export default function App() {
  return (
    <StoreProvider>
      <Router basename={import.meta.env.VITE_ROUTER === 'memory' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="e/:id" element={<EventPage />} />
            <Route path="table" element={<Table />} />
            <Route path="table/:id" element={<PlacePage />} />
            <Route path="saved" element={<Saved />} />
            <Route path="list" element={<SharedList />} />
            <Route path="about" element={<About />} />
            <Route path="you" element={<You />} />
            <Route path="account" element={<Account />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </StoreProvider>
  )
}
