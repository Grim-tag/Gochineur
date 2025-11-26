import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'

import MyAccountPage from './pages/MyAccountPage'
import SubmitEventPage from './pages/SubmitEventPage'
import EditEventPage from './pages/EditEventPage'
import LoginPage from './pages/LoginPage'
import SetPseudoPage from './pages/SetPseudoPage'
import AdminPage from './pages/AdminPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import EventDetailsPage from './pages/EventDetailsPage'
import AddObjectPage from './pages/AddObjectPage'
import CSVImportPage from './pages/CSVImportPage'
import CollectionShowcasePage from './pages/CollectionShowcasePage'
import MentionsLegalesPage from './pages/MentionsLegalesPage'
import CGUPage from './pages/CGUPage'
import CategoryRouteWrapper from './components/CategoryRouteWrapper'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import Footer from './components/Footer'

import AnalyticsTracker from './components/AnalyticsTracker'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnalyticsTracker />
        <div className="flex flex-col min-h-screen">
          <div className="flex-grow">
            <Routes>
              {/* Homepage - all types, all locations */}
              <Route path="/" element={<HomePage />} />

              {/* Category root - all locations for this type */}
              <Route path="/vide-grenier" element={<HomePage />} />
              <Route path="/brocante" element={<HomePage />} />
              <Route path="/puces" element={<HomePage />} />
              <Route path="/bourse" element={<HomePage />} />
              <Route path="/vide-maison" element={<HomePage />} />
              <Route path="/troc" element={<HomePage />} />

              {/* Legacy department code redirect is now handled by CategoryRouteWrapper */}

              {/* Region level OR Event details: /{category}/{param} */}
              {/* We use CategoryRouteWrapper to distinguish between a region slug and an event slug */}
              <Route path="/:category/:param" element={<CategoryRouteWrapper />} />

              {/* Department level: /{category}/{region}/{department} */}
              <Route path="/:category/:regionSlug/:departmentSlug" element={<HomePage />} />

              {/* City level OR Event details: /{category}/{region}/{department}/{param} */}
              <Route path="/:category/:regionSlug/:departmentSlug/:param" element={<CategoryRouteWrapper />} />

              {/* Direct event access */}
              <Route path="/event/:id" element={<EventDetailsPage />} />

              {/* User routes */}
              <Route path="/mon-compte" element={<MyAccountPage />} />
              <Route path="/ma-collection/ajouter" element={<AddObjectPage />} />
              <Route path="/ma-collection/importer-csv" element={<CSVImportPage />} />
              <Route path="/collection/:userPseudo" element={<CollectionShowcasePage />} />
              <Route path="/ma-liste" element={<Navigate to="/mon-compte" replace />} />
              <Route path="/soumettre" element={<SubmitEventPage />} />
              <Route path="/edit-event/:id" element={<EditEventPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/set-pseudo" element={<SetPseudoPage />} />
              <Route path="/admin/dashboard" element={<AdminPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

              {/* Legal pages */}
              <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
              <Route path="/cgu" element={<CGUPage />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
