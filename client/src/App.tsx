import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

// Eager load critical pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

// Lazy load other pages
const VideGrenierPage = lazy(() => import('./pages/VideGrenierPage'));
const BrocantePage = lazy(() => import('./pages/BrocantePage'));
const TrocPage = lazy(() => import('./pages/TrocPage'));
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'));
const MyAccountPage = lazy(() => import('./pages/MyAccountPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SetPseudoPage = lazy(() => import('./pages/SetPseudoPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const MentionsLegalesPage = lazy(() => import('./pages/MentionsLegalesPage'));
const CGUPage = lazy(() => import('./pages/CGUPage'));
const CollectionShowcasePage = lazy(() => import('./pages/CollectionShowcasePage'));

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-text-primary flex flex-col">
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#f97316',
                secondary: '#fff',
              },
            },
          }}
        />

        <Navbar />

        <main className="flex-grow">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Critical routes (no lazy loading) */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Lazy loaded routes */}
              <Route path="/vide-grenier/*" element={<VideGrenierPage />} />
              <Route path="/brocante/*" element={<BrocantePage />} />
              <Route path="/troc/*" element={<TrocPage />} />
              <Route path="/event/:id" element={<EventDetailsPage />} />
              <Route path="/mon-compte" element={<MyAccountPage />} />
              <Route path="/admin/*" element={<AdminPage />} />
              <Route path="/set-pseudo" element={<SetPseudoPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
              <Route path="/cgu" element={<CGUPage />} />
              <Route path="/collection/:userId" element={<CollectionShowcasePage />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </Router>
  );
}
