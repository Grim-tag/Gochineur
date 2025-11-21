import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MyListPage from './pages/MyListPage'
import MyAccountPage from './pages/MyAccountPage'
import SubmitEventPage from './pages/SubmitEventPage'
import LoginPage from './pages/LoginPage'
import SetPseudoPage from './pages/SetPseudoPage'
import AdminPage from './pages/AdminPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import './index.css'
import Footer from './components/Footer'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vide-grenier/:departmentCode" element={<HomePage />} />
            <Route path="/brocantes/:citySlug" element={<HomePage />} />
            <Route path="/mon-compte" element={<MyAccountPage />} />
            <Route path="/soumettre" element={<SubmitEventPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/set-pseudo" element={<SetPseudoPage />} />
            <Route path="/admin/dashboard" element={<AdminPage />} />
            <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

