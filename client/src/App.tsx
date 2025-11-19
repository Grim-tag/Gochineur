import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MyListPage from './pages/MyListPage'
import SubmitEventPage from './pages/SubmitEventPage'
import LoginPage from './pages/LoginPage'
import SetPseudoPage from './pages/SetPseudoPage'
import AdminPage from './pages/AdminPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ma-liste" element={<MyListPage />} />
        <Route path="/soumettre" element={<SubmitEventPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/set-pseudo" element={<SetPseudoPage />} />
        <Route path="/admin/dashboard" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


