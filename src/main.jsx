import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/app/*" element={<CandyGalaxyShell />} />
            {/* Prompt 10: the pre-Candy-Galaxy tree (App.jsx) is deleted —
                any stale bookmark/deep-link to it redirects to the real app
                instead of 404ing. */}
            <Route path="/app-legacy/*" element={<Navigate to="/app" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
