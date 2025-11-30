import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Footer from './components/Footer';
import CategoryRouteWrapper from './components/CategoryRouteWrapper';

// Eager load critical pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

// Lazy load other pages
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'));
const MyAccountPage = lazy(() => import('./pages/MyAccountPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SetPseudoPage = lazy(() => import('./pages/SetPseudoPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const MentionsLegalesPage = lazy(() => import('./pages/MentionsLegalesPage'));
const CGUPage = lazy(() => import('./pages/CGUPage'));
const CollectionShowcasePage = lazy(() => import('./pages/CollectionShowcasePage'));
const SubmitEventPage = lazy(() => import('./pages/SubmitEventPage'));
const AddObjectPage = lazy(() => import('./pages/AddObjectPage'));
const MyCollectionPage = lazy(() => import('./pages/MyCollectionPage'));

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

        <main className="flex-grow">
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
            <Routes>
              {/* Critical routes (no lazy loading) */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Lazy loaded routes */}
              {/* Category Routes - Handled by Wrapper for SEO URLs and Dept Redirects */}
              <Route path="/:category" element={<CategoryRouteWrapper />} />
              <Route path="/:category/:param" element={<CategoryRouteWrapper />} />
              <Route path="/:category/:regionSlug/:departmentSlug" element={<CategoryRouteWrapper />} />
              <Route path="/:category/:regionSlug/:departmentSlug/:param" element={<CategoryRouteWrapper />} />

              <Route path="/event/:id" element={<EventDetailsPage />} />
              <Route path="/mon-compte" element={<MyAccountPage />} />
              <Route path="/ma-collection" element={<MyCollectionPage />} />
              <Route path="/admin/*" element={<AdminPage />} />
              <Route path="/set-pseudo" element={<SetPseudoPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
              <Route path="/cgu" element={<CGUPage />} />
              <Route path="/collection/:userPseudo" element={<CollectionShowcasePage />} />
              <Route path="/soumettre" element={<SubmitEventPage />} />
              <Route path="/ma-collection/ajouter" element={<AddObjectPage />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </Router>
  );
}
