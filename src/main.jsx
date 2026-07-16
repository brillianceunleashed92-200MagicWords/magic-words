import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import ErrorBoundary from './components/ErrorBoundary'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/fredoka-one'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/900.css'
import '@fontsource/baloo-2/600.css'
import '@fontsource/baloo-2/700.css'
import '@fontsource/baloo-2/800.css'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import './index.css'

// Route-level code-splitting (Phase 2 carry-over punch list item): each
// of these three trees is large and mutually exclusive per page load — a
// landing-page visitor was previously downloading the entire authenticated
// Candy Galaxy app AND the unlinked pre-redesign legacy tree in the same
// bundle. Lazy-loading means each route only pays for what it renders.
const Landing = lazy(() => import('./pages/landing/Landing.jsx'))
const CandyGalaxyShell = lazy(() => import('./CandyGalaxyShell.jsx'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const TermsOfService = lazy(() => import('./pages/TermsOfService.jsx'))
const UpdatePassword = lazy(() => import('./pages/UpdatePassword.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
// MEMORY_MASTER_R1 Phase 4 -- env-gated dev route, default OFF (see the
// component's own VITE_MEMORY_MASTER_ENABLED check). No home tile, no nav
// entry, no link from anywhere else -- reachable by direct URL only. A
// sibling of /app, not nested inside it, same reasoning as /update-password
// above: it must render standalone, not through CandyGalaxyShell's
// AuthGuard/bottom-nav.
const MemoryMasterDevRoute = lazy(() => import('./screens/memorymaster/MemoryMasterDevRoute.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* FIX_NO_BLANK_SCREENS_R1 — a single boundary around the whole
            router so every route (lazy public pages and the authed /app/*
            shell alike) shows the friendly recovery UI instead of a blank
            page on an uncaught render error. ErrorBoundary itself is
            untouched — mount only. */}
        <ErrorBoundary screen="root">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              {/* feat/auth-r1 Phase 3 — the resetPasswordForEmail redirect
                  target. Deliberately a sibling of /app, never nested inside
                  it: CandyGalaxyShell's AuthGuard treats any session
                  (including the recovery session this route depends on) as
                  "signed in" and would otherwise route straight to Home. */}
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/memory-master-dev" element={<MemoryMasterDevRoute />} />
              <Route path="/app/*" element={<CandyGalaxyShell />} />
              {/* Prompt 10: the pre-Candy-Galaxy tree (App.jsx) is deleted —
                  any stale bookmark/deep-link to it redirects to the real app
                  instead of 404ing. */}
              <Route path="/app-legacy/*" element={<Navigate to="/app" replace />} />
              {/* FIX_NO_BLANK_SCREENS_R1 — catch-all: any other path (typo,
                  stale bookmark) gets a friendly not-found screen instead of
                  a blank page. Must stay last. */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
