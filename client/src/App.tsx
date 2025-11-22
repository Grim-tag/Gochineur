import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'

import MyAccountPage from './pages/MyAccountPage'
import SubmitEventPage from './pages/SubmitEventPage'
import LoginPage from './pages/LoginPage'
import SetPseudoPage from './pages/SetPseudoPage'
import AdminPage from './pages/AdminPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import EventDetailsPage from './pages/EventDetailsPage'
import CategoryRouteWrapper from './components/CategoryRouteWrapper'
import './index.css'
import Footer from './components/Footer'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vide-grenier/region/:regionSlug" element={<HomePage />} />

            {/* Routes hybrides : peuvent être une recherche (département/ville) ou un événement */}
            <Route path="/vide-grenier/:param" element={<CategoryRouteWrapper />} />
            <Route path="/brocantes/:departmentSlug/:citySlug" element={<HomePage />} />
            <Route path="/brocantes/:param" element={<CategoryRouteWrapper />} />

            {/* Route générique pour les autres types d'événements (ex: /puces-et-antiquites/slug-event) */}
            <Route path="/:category/:param" element={<CategoryRouteWrapper />} />

            <Route path="/event/:id" element={<EventDetailsPage />} />
            <Route path="/mon-compte" element={<MyAccountPage />} />
            <Route path="/ma-liste" element={<Navigate to="/mon-compte" replace />} />
            <Route path="/soumettre" element={<SubmitEventPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/set-pseudo" element={<SetPseudoPage />} />
            <Route path="/admin/dashboard" element={<AdminPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

