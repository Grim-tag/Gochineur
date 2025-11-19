import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { getCurrentUser, updateDisplayName } from '../services/api'

interface User {
  id: string
  email: string
  name: string
  displayName: string | null
  photo: string | null
}

export default function SetPseudoPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    getCurrentUser()
      .then(data => {
        console.log('👤 Données utilisateur reçues:', data)
        
        if (data.authenticated && data.user) {
          // Si l'utilisateur a déjà un pseudo, rediriger selon son rôle
          if (data.user.displayName) {
            const userRole = data.user.role || 'user'
            
            if (userRole === 'admin' || userRole === 'moderator') {
              // Les admins/moderators sont redirigés vers le dashboard admin
              console.log('✅ Utilisateur admin/moderator avec pseudo, redirection vers /admin/dashboard')
              navigate('/admin/dashboard')
              return
            } else {
              // Utilisateur normal avec pseudo : rediriger vers l'accueil
              console.log('✅ Utilisateur avec pseudo, redirection vers accueil')
              navigate('/')
              return
            }
          }
          
          // L'utilisateur n'a pas de pseudo, afficher le formulaire
          setUser(data.user)
          setDisplayName(data.user.name || '')
          setLoading(false)
        } else {
          // Non connecté, rediriger vers la connexion
          console.log('⚠️ Utilisateur non authentifié, redirection vers login')
          navigate('/login')
        }
      })
      .catch(err => {
        console.error('❌ Erreur lors de la vérification de l\'utilisateur:', err)
        setError('Erreur de connexion au serveur')
        setLoading(false)
      })
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!displayName.trim()) {
      setError('Veuillez saisir un pseudo')
      return
    }

    if (displayName.trim().length > 50) {
      setError('Le pseudo ne peut pas dépasser 50 caractères')
      return
    }

    setSaving(true)
    setError(null)

    try {
      console.log('💾 Sauvegarde du pseudo:', displayName.trim())
      
      const data = await updateDisplayName(displayName.trim())
      console.log('✅ Pseudo sauvegardé avec succès:', data.user)

      // Mettre à jour l'utilisateur local
      if (data.user) {
        setUser(data.user)
      }

      // Vérifier si on doit rediriger vers l'admin-client
      const urlParams = new URLSearchParams(window.location.search)
      const returnTo = urlParams.get('returnTo')
      
      // Redirection selon le rôle et l'origine
      const userRole = data.user?.role || 'user'
      console.log(`🔑 Rôle utilisateur: ${userRole}, returnTo: ${returnTo}`)
      
      // Si un returnTo est spécifié, rediriger vers cette page
      if (returnTo) {
        console.log(`✅ Redirection vers: ${returnTo}`)
        navigate(returnTo)
      } else if (userRole === 'admin' || userRole === 'moderator') {
        // Les admins/moderators sont redirigés vers le tableau de bord admin
        console.log('✅ Redirection admin/moderator vers /admin/dashboard')
        navigate('/admin/dashboard')
      } else {
        // Utilisateur normal : rediriger vers la page d'accueil
        console.log('✅ Redirection utilisateur standard vers accueil')
        navigate('/')
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de la sauvegarde du pseudo:', err)
      setError(err.message || 'Erreur lors de la sauvegarde du pseudo')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            🛍️ GoChineur
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Choisissez votre pseudo</h1>
          <p className="text-gray-600 mb-6">
            Pour finaliser votre inscription, choisissez un pseudo qui sera affiché avec vos événements.
          </p>

          {user.photo && (
            <div className="mb-6 flex justify-center">
              <img
                src={user.photo}
                alt={user.name}
                className="w-20 h-20 rounded-full"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pseudo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  setError(null)
                }}
                placeholder="Votre pseudo"
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                {displayName.length}/50 caractères
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  saving
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer mon Pseudo'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Connecté en tant que <strong>{user.email}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

